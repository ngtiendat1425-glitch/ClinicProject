/* Local browser smoke checks for an Expo web export. No browser dependencies required.
 * Usage: node scripts/smoke-web.cjs [export-directory]
 * CHROME_PATH overrides the Chrome executable; SMOKE_OUTPUT overrides .tmp/smoke.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const workspace = path.resolve(__dirname, '..');
const exportRoot = path.resolve(workspace, process.argv[2] || 'dist');
const outputRoot = path.resolve(workspace, process.env.SMOKE_OUTPUT || '.tmp/smoke');
const chromePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const passed = [];
const errors = [];
let browser;
let client;
let server;

function pass(description) {
  passed.push(description);
  process.stdout.write(`PASS ${description}\n`);
}

async function until(action, description, timeout = 12000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await action();
      if (result) return result;
    } catch (error) { lastError = error; }
    await pause(120);
  }
  throw new Error(`Timed out: ${description}${lastError ? ` (${lastError.message})` : ''}`);
}

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const request = this.pending.get(message.id);
        if (!request) return;
        this.pending.delete(message.id);
        clearTimeout(request.timer);
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result || {});
      } else if (message.method === 'Runtime.exceptionThrown') {
        const detail = message.params.exceptionDetails;
        errors.push(detail.exception?.description || detail.text);
      } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        errors.push(message.params.entry.text);
      } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        errors.push(message.params.args.map((arg) => arg.value || arg.description || '').join(' '));
      }
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    return new DevTools(socket);
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`DevTools timeout: ${method}`));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(fn, ...args) {
    const expression = `(${fn.toString()})(...${JSON.stringify(args)})`;
    const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result?.value;
  }
}

function startServer() {
  const mime = {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  };
  server = http.createServer((req, res) => {
    let requestPath;
    try { requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    let file = path.resolve(exportRoot, `.${requestPath}`);
    if (file !== exportRoot && !file.startsWith(`${exportRoot}${path.sep}`)) {
      res.writeHead(403).end(); return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      if (path.extname(file)) { res.writeHead(404).end(); return; }
      file = path.join(exportRoot, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

async function clickText(text, exact = true) {
  return client.evaluate((wanted, matchExactly) => {
    const candidates = [...document.querySelectorAll('[role="button"], button, a')];
    const target = candidates.find((element) => {
      const value = element.innerText.trim();
      const visible = element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0;
      return visible && (matchExactly ? value === wanted : value.includes(wanted));
    });
    if (!target) throw new Error(`Button not found: ${wanted}`);
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  }, text, exact);
}

async function clickLabel(label) {
  return client.evaluate((wanted) => {
    const target = [...document.querySelectorAll('[aria-label]')].find((element) => element.getAttribute('aria-label') === wanted && element.getBoundingClientRect().width > 0);
    if (!target) throw new Error(`Accessible element not found: ${wanted}`);
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  }, label);
}

async function input(label, value) {
  return client.evaluate((wanted, text) => {
    const element = [...document.querySelectorAll('input,textarea')].find((node) => node.getAttribute('aria-label') === wanted && node.getBoundingClientRect().width > 0);
    if (!element) throw new Error(`Input not found: ${wanted}`);
    element.scrollIntoView({ block: 'center' });
    element.focus();
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, label, value);
}

async function waitText(text) {
  return until(() => client.evaluate((wanted) => document.body.innerText.includes(wanted), text), `text: ${text}`);
}

async function screenshot(name) {
  await client.evaluate(() => {
    for (const element of document.querySelectorAll('*')) {
      if (element.scrollHeight > element.clientHeight && ['auto', 'scroll'].includes(getComputedStyle(element).overflowY)) element.scrollTop = 0;
    }
    document.activeElement?.blur();
  });
  await pause(200);
  const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(outputRoot, name), Buffer.from(result.data, 'base64'));
}

async function storedState() {
  return client.evaluate(() => {
    for (let index = 0; index < localStorage.length; index += 1) {
      try {
        const value = JSON.parse(localStorage.getItem(localStorage.key(index)));
        if (value?.version === 1 && Array.isArray(value.appointments) && value.patient) return value;
      } catch { /* Ignore unrelated browser storage. */ }
    }
    return null;
  });
}

async function checkMobileLayout(width, height, screenshotName) {
  await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
  await pause(250);
  const geometry = await client.evaluate(() => {
    const elements = [...document.querySelectorAll('*')];
    const tabs = ['Trang chủ', 'Bác sĩ', 'Lịch hẹn', 'Cá nhân'].map((label) => {
      const element = elements.find((node) => node.children.length === 0 && node.textContent.trim() === label && node.getBoundingClientRect().width > 0);
      if (!element) return { label, missing: true };
      const rect = element.getBoundingClientRect();
      return { label, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
    });
    const overflowingText = elements.filter((element) => {
      if (element.children.length || !element.textContent.trim()) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!rect.width || !rect.height || style.visibility === 'hidden' || /ionicons/i.test(style.fontFamily)) return false;
      if (rect.left >= -1 && rect.right <= innerWidth + 1) return false;
      // Horizontal specialty lists intentionally extend beyond their scroll viewport.
      for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor.scrollWidth > ancestor.clientWidth + 1 && ['auto', 'scroll'].includes(getComputedStyle(ancestor).overflowX)) return false;
      }
      return true;
    }).map((element) => {
      const rect = element.getBoundingClientRect();
      return { text: element.textContent.trim().slice(0, 120), left: rect.left, right: rect.right };
    });
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, tabs, overflowingText };
  });
  fs.writeFileSync(path.join(outputRoot, `layout-${width}.json`), JSON.stringify(geometry, null, 2));
  await screenshot(screenshotName);
  assert.equal(geometry.width, width);
  assert.ok(geometry.scrollWidth <= width + 1, `Horizontal document overflow: ${JSON.stringify(geometry)}`);
  assert.deepEqual(geometry.overflowingText, [], `Text outside horizontal viewport: ${JSON.stringify(geometry.overflowingText)}`);
  for (const tab of geometry.tabs) {
    assert.ok(!tab.missing && tab.top >= 0 && tab.bottom <= height && tab.left >= 0 && tab.right <= width,
      `Tab label outside viewport: ${JSON.stringify(tab)}`);
  }
  pass(`Home ${width}×${height}: no document/text horizontal overflow; all four tab labels inside viewport`);
}

async function main() {
  assert.ok(fs.existsSync(path.join(exportRoot, 'index.html')), 'Build web export first: npx expo export --platform web');
  assert.ok(fs.existsSync(chromePath), `Chrome executable missing: ${chromePath}`);
  fs.mkdirSync(outputRoot, { recursive: true });
  const profile = path.join(outputRoot, `chrome-${Date.now()}-${process.pid}`);
  fs.mkdirSync(profile);
  const appPort = await startServer();
  const origin = `http://127.0.0.1:${appPort}`;
  browser = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions',
    '--disable-component-update', '--disable-sync', '--mute-audio', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let spawnError;
  browser.once('error', (error) => { spawnError = error; });
  const devtoolsPort = await until(() => {
    if (spawnError) throw spawnError;
    const activePort = path.join(profile, 'DevToolsActivePort');
    return fs.existsSync(activePort) ? Number(fs.readFileSync(activePort, 'utf8').split(/\r?\n/)[0]) : false;
  }, 'Chrome debugging endpoint', 20000);
  const targets = await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`).then((response) => response.json());
  const target = targets.find((item) => item.type === 'page');
  assert.ok(target, 'Chrome page target');
  client = await DevTools.connect(target.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Log.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await client.send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Ho_Chi_Minh' });
  await client.send('Page.navigate', { url: origin });
  await waitText('Chào bạn trở lại');
  await clickText('Tiếp tục trải nghiệm', false);
  await waitText('Chăm sóc sức khỏe bắt đầu từ một lịch hẹn.');
  await until(storedState, 'demo state persisted');
  await checkMobileLayout(390, 844, 'home.png');
  await checkMobileLayout(320, 740, 'home-320.png');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

  await input('Tìm tên bác sĩ hoặc chuyên khoa', 'nguyen minh anh');
  await waitText('Kết quả tìm kiếm');
  await until(() => client.evaluate(() => [...document.querySelectorAll('[aria-label^="Xem hồ sơ "]')].filter((element) => element.getBoundingClientRect().width > 0).length === 1), 'accentless name search narrows to one doctor');
  await clickLabel('Xem hồ sơ Nguyễn Minh Anh');
  await waitText('Hồ sơ bác sĩ');
  await waitText('Chuyên môn & đào tạo');
  pass('Accentless name search finds one doctor and opens doctor profile');

  await clickText('Đặt lịch khám', false);
  await waitText('Chọn thời gian phù hợp với bạn');
  const selectedDay = await client.evaluate(() => {
    const days = [...document.querySelectorAll('[role="radio"][aria-label]')].filter((element) => !element.getAttribute('aria-label').startsWith('Khám lúc '));
    const day = days[2] || days[1] || days[0];
    if (!day) throw new Error('No booking dates available');
    day.click();
    return day.getAttribute('aria-label');
  });
  await until(() => client.evaluate(() => Boolean(document.querySelector('[aria-label^="Khám lúc "]'))), 'future booking slots');
  const selectedTime = await client.evaluate(() => {
    const slot = document.querySelector('[aria-label^="Khám lúc "]');
    slot.click();
    return slot.getAttribute('aria-label');
  });
  await clickText('Tiếp tục', false);
  await waitText('Vui lòng mô tả lý do khám ít nhất 5 ký tự.');
  pass('Booking requires a reason after choosing a future date and time');
  const reason = `Kiểm tra sức khỏe từ browser smoke test ${Date.now()}.`;
  await input('4. Lý do khám *', reason);
  await screenshot('booking.png');
  await clickText('Tiếp tục', false);
  await waitText('Kiểm tra lịch hẹn');
  await clickText('Gửi yêu cầu đặt lịch', false);
  await waitText('Đã gửi yêu cầu đặt lịch.');
  const booking = await until(async () => (await storedState())?.appointments.find((item) => item.reason === reason), 'new booking persisted');
  assert.equal(booking.status, 'pending');
  assert.equal(booking.doctorId, '1');
  assert.ok(booking.holdExpiresAt);
  await screenshot('detail.png');
  const detailUrl = await client.evaluate(() => location.href);
  await client.send('Page.reload');
  await waitText('Chi tiết lịch hẹn');
  await waitText(reason);
  assert.equal((await storedState()).appointments.filter((item) => item.reason === reason).length, 1);
  pass(`Booking persists exactly once and survives reload (${selectedDay}, ${selectedTime})`);

  await clickText('Hủy lịch hẹn');
  await waitText('Lý do hủy lịch hẹn');
  await clickText('Tiếp tục hủy');
  await waitText('Vui lòng nhập lý do hủy ít nhất 5 ký tự.');
  await input('Lý do *', 'Tôi cần đổi thời gian khám để phù hợp công việc.');
  await clickText('Tiếp tục hủy');
  await waitText('Xác nhận hủy lịch hẹn?');
  assert.equal((await storedState()).appointments.find((item) => item.id === booking.id).status, 'pending');
  await clickText('Xác nhận hủy lịch');
  await waitText('Đã hủy lịch hẹn và giải phóng khung giờ.');
  const cancelled = await until(async () => {
    const item = (await storedState())?.appointments.find((value) => value.id === booking.id);
    return item?.status === 'cancelled' ? item : null;
  }, 'cancellation saved');
  assert.ok(cancelled.cancelReason.length > 5);
  await client.send('Page.reload');
  await waitText(cancelled.cancelReason);
  pass('Cancellation requires a reason and confirmation, then persists after reload');

  await client.send('Page.navigate', { url: `${origin}/notifications` });
  await waitText('Thông báo');
  await waitText('Đọc tất cả');
  await clickText('Đọc tất cả', false);
  await until(async () => (await storedState())?.notifications.every((item) => item.read), 'all notifications marked read');
  pass('Read-all notification action updates persisted unread state');

  await client.send('Page.navigate', { url: `${origin}/history` });
  await waitText('Lịch sử khám');
  await waitText('1 buổi khám đã hoàn thành');
  await clickText('Xem kết quả và hướng dẫn', false);
  await waitText('Đây là kết quả minh họa');
  pass('Completed visit history opens the stored encounter result');

  await client.send('Page.navigate', { url: `${origin}/consultation/demo-online` });
  await waitText('Trước buổi tư vấn');
  await waitText('Video chưa được kết nối.');
  await client.evaluate(() => document.querySelector('[role="checkbox"]').click());
  await waitText('1/3 sẵn sàng');
  assert.equal(await client.evaluate(() => document.querySelectorAll('[role="checkbox"][aria-checked="true"]').length), 1);
  pass('Confirmed online consultation has working checklist and honest unavailable-video notice');

  await client.send('Page.navigate', { url: `${origin}/appointment/demo-online` });
  await waitText('Chi tiết lịch hẹn');
  await clickText('Hủy lịch hẹn');
  await input('Lý do *', 'Tôi cần sắp xếp lại buổi tư vấn trực tuyến.');
  await clickText('Tiếp tục hủy');
  await waitText('Xác nhận hủy lịch hẹn?');
  await clickText('Xác nhận hủy lịch');
  await until(async () => (await storedState())?.appointments.find((item) => item.id === 'demo-online')?.status === 'cancelled', 'online cancellation saved');
  await client.send('Page.navigate', { url: `${origin}/consultation/demo-online` });
  await waitText('Phiên tư vấn chưa khả dụng');
  for (const route of ['demo-upcoming', 'missing-appointment']) {
    await client.send('Page.navigate', { url: `${origin}/consultation/${route}` });
    await waitText('Không tìm thấy phiên tư vấn');
  }
  pass('Consultation rejects non-online, cancelled and unknown appointment routes');
  assert.deepEqual(errors, [], `Browser errors: ${errors.join('\n')}`);
  pass('No browser runtime or console errors during the smoke flow');
  process.stdout.write(`\n${passed.length} checks passed. Screenshots: ${outputRoot}\nLast booking detail: ${detailUrl}\n`);
}

main().catch(async (error) => {
  process.stderr.write(`FAIL ${error.stack}\n`);
  if (errors.length) process.stderr.write(`Browser errors:\n${errors.join('\n')}\n`);
  if (client) {
    try {
      await screenshot('failure.png');
      const diagnostics = await client.evaluate(() => ({
        url: location.href,
        text: document.body.innerText,
        checkboxes: [...document.querySelectorAll('[role="checkbox"]')].map((element) => ({
          text: element.innerText,
          checked: element.getAttribute('aria-checked'),
        })),
      }));
      fs.writeFileSync(path.join(outputRoot, 'failure.json'), JSON.stringify({ error: error.message, browserErrors: errors, ...diagnostics }, null, 2));
    } catch { /* Preserve the original failure if the page is already unavailable. */ }
  }
  process.exitCode = 1;
}).finally(async () => {
  if (client) {
    try { await client.send('Browser.close'); } catch { /* Browser may already be closed. */ }
    client.socket.close();
  }
  if (browser && browser.exitCode === null) browser.kill();
  if (server) await new Promise((resolve) => server.close(resolve));
});
