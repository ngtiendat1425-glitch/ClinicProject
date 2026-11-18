export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '') ?? '';
export const apiConfigured = API_BASE_URL.length > 0;
export const isServerMode = apiConfigured;
export const isDemoEnabled = !apiConfigured || process.env.EXPO_PUBLIC_ENABLE_DEMO === 'true';

export function validateApiBaseUrl(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return 'Địa chỉ máy chủ không được chứa thông tin đăng nhập, truy vấn hoặc dấu #.';
    const local = ['localhost', '127.0.0.1', '[::1]', '10.0.2.2', '10.0.3.2'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return 'Kết nối máy chủ cần sử dụng HTTPS. HTTP chỉ được dùng cho máy chủ phát triển cục bộ.';
    return null;
  } catch { return 'Địa chỉ máy chủ chưa hợp lệ. Vui lòng kiểm tra cấu hình kết nối.'; }
}

export const apiConfigurationError = validateApiBaseUrl(API_BASE_URL);

let accessToken: string | null = null;
const unauthorizedListeners = new Set<() => void>();

export function getAccessToken() { return accessToken; }
export function setAccessToken(token: string | null) { accessToken = token; }
export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => { unauthorizedListeners.delete(listener); };
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly requestId?: string) {
    super(requestId ? `${message} (Mã yêu cầu: ${requestId})` : message);
    this.name = 'ApiError';
  }
}

function expireSession(requestToken: string | null) {
  // An old request must not sign out an identity established while it was running.
  if (accessToken !== requestToken) return;
  accessToken = null;
  for (const listener of unauthorizedListeners) {
    try { listener(); } catch { /* Other subscribers must still receive expiration. */ }
  }
}

/** Used by authenticated binary downloads, with the token captured at request time. */
export function reportUnauthorized(requestToken: string | null) {
  if (requestToken) expireSession(requestToken);
}

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!apiConfigured) throw new ApiError('Chưa cấu hình kết nối máy chủ.', 0);
  if (apiConfigurationError) throw new ApiError(apiConfigurationError, 0);
  if (!path.startsWith('/') || path.startsWith('//')) throw new ApiError('Đường dẫn API không hợp lệ.', 0);
  const authenticated = options.auth !== false;
  const requestToken = authenticated ? accessToken : null;
  if (authenticated && !requestToken) throw new ApiError('Vui lòng đăng nhập để tiếp tục.', 401);
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (requestToken) headers.Authorization = `Bearer ${requestToken}`;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET', headers, signal: controller.signal, credentials: 'omit',
      cache: 'no-store', ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    if (!response.ok) {
      if (response.status === 401 && authenticated) expireSession(requestToken);
      let detail: unknown;
      try { detail = await response.json(); } catch { detail = null; }
      const problem = detail && typeof detail === 'object' ? detail as Record<string, unknown> : null;
      const message = typeof problem?.detail === 'string' && problem.detail.trim()
        ? problem.detail.slice(0, 600)
        : response.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : response.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.'
            : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
      const rawRequestId = response.headers.get('x-request-id') ?? problem?.requestId;
      const requestId = typeof rawRequestId === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(rawRequestId) ? rawRequestId : undefined;
      throw new ApiError(message, response.status, requestId);
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!text.trim()) return undefined as T;
    try { return JSON.parse(text) as T; }
    catch { throw new ApiError('Phản hồi máy chủ không hợp lệ. Vui lòng thử lại.', response.status); }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) throw new ApiError('Máy chủ phản hồi quá lâu. Vui lòng thử lại.', 0);
    if (options.signal?.aborted) {
      const cancelled = new ApiError('Yêu cầu đã được hủy.', 0);
      cancelled.name = 'AbortError';
      throw cancelled;
    }
    throw new ApiError('Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.', 0);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
