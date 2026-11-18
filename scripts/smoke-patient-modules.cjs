/* Local-only CDP smoke tests: run with Node24 after a demo-mode web export.
 * node scripts/smoke-patient-modules.cjs [export-directory]
 * No packages, real patient information, external accounts or services are used.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
}).outputText, filename);
const { departments } = require('../src/data/departments.ts');

const workspace = path.resolve(__dirname, '..');
const exportRoot = path.resolve(workspace, process.argv[2] || 'dist');
const outputRoot = path.join(workspace, '.tmp/modules');
const runId = `${Date.now()}-${process.pid}`;
const downloads = path.join(outputRoot, 'downloads', runId);
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];
let client, browser, server, origin;
let checks = 0;
const ACCOUNT_A = { name: 'Người dùng thử A', phone: '0900000001', email: 'patient-a@demo.invalid' };
const ACCOUNT_B = { name: 'Người dùng thử B', phone: '0900000002', email: 'patient-b@demo.invalid' };
const password = 'Synthetic smoke phrase 42';
const pass = (message) => { checks += 1; process.stdout.write(`PASS ${message}\n`); };

async function until(action, description, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let cause;
  while (Date.now() < deadline) {
    try { const result = await action(); if (result) return result; } catch (error) { cause = error; }
    await pause(120);
  }
  throw new Error(`Timed out: ${description}${cause ? ` (${cause.message})` : ''}`);
}

class CDP {
  constructor(socket) {
    this.socket = socket; this.id = 0; this.pending = new Map(); this.events = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(String(data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id); clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result || {});
      } else {
        for (const listener of this.events.get(message.method) || []) listener(message.params);
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
        if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value || arg.description || '').join(' '));
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
      this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(fn, ...args) {
    const response = await this.send('Runtime.evaluate', { expression: `(${fn.toString()})(...${JSON.stringify(args)})`, returnByValue: true, awaitPromise: true, userGesture: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result?.value;
  }
  waitEvent(name, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const listeners = this.events.get(name) || new Set();
      this.events.set(name, listeners);
      const timer = setTimeout(() => { listeners.delete(listener); reject(new Error(`Missing browser event: ${name}`)); }, timeout);
      const listener = (data) => { clearTimeout(timer); listeners.delete(listener); resolve(data); };
      listeners.add(listener);
    });
  }
}

async function click(text, label = false) {
  return client.evaluate((wanted, byLabel) => {
    const selectors = byLabel ? '[aria-label]' : '[role="button"],button,a,[role="radio"]';
    const target = [...document.querySelectorAll(selectors)].find(element => {
      const rect = element.getBoundingClientRect();
      const value = byLabel ? element.getAttribute('aria-label') : element.innerText.trim();
      return rect.width > 0 && rect.height > 0 && (byLabel ? value === wanted : value.includes(wanted));
    });
    if (!target) throw new Error(`Control not found: ${wanted}`);
    target.scrollIntoView({ block: 'center', inline: 'center' }); target.click(); return true;
  }, text, label);
}

async function input(label, value) {
  return client.evaluate((wanted, text) => {
    const element = [...document.querySelectorAll('input,textarea')].find(node => node.getAttribute('aria-label') === wanted && node.getBoundingClientRect().width > 0);
    if (!element) throw new Error(`Input not found: ${wanted}`);
    element.scrollIntoView({ block: 'center' }); element.focus();
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, text);
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, label, value);
}
const waitText = (text) => until(() => client.evaluate(wanted => document.body.innerText.includes(wanted), text), `text: ${text}`);
async function navigate(route, text) { await client.send('Page.navigate', { url: `${origin}${route}` }); if (text) await waitText(text); }
async function saved(key) { return client.evaluate(wanted => { try { return JSON.parse(localStorage.getItem(wanted)); } catch { return null; } }, key); }
async function sessionId() { return (await saved('@an-tam/auth/session/v1'))?.accountId; }
async function scoped(kind, id) {
  return client.evaluate((type, accountId) => {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key.endsWith(`:${accountId}`)) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key));
        if (type === 'clinic' ? Array.isArray(value.appointments) : Array.isArray(value.certificates)) return value;
      } catch { /* Other browser storage is unrelated. */ }
    }
    return null;
  }, kind, id);
}

async function screenshot(name) {
  await client.evaluate(() => {
    document.activeElement?.blur();
    for (const element of document.querySelectorAll('*')) if (element.scrollHeight > element.clientHeight && ['auto', 'scroll'].includes(getComputedStyle(element).overflowY)) element.scrollTop = 0;
  });
  await pause(180);
  const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(outputRoot, name), Buffer.from(result.data, 'base64'));
}

async function layout(width, height, name) {
  await client.send('Emulation.setDeviceMetricsOverride', { width, height, mobile: true, deviceScaleFactor: 1 });
  await pause(180);
  const geometry = await client.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.equal(geometry.width, width);
  assert.ok(geometry.scrollWidth <= width + 1, `Horizontal overflow at ${width}: ${geometry.scrollWidth}`);
  await screenshot(name);
}

async function logout() {
  await navigate('/profile', 'Cá nhân');
  await click('Đăng xuất'); await waitText('Đăng xuất khỏi tài khoản?');
  await click('Xác nhận đăng xuất'); await waitText('Chào bạn trở lại');
  await until(async () => !await sessionId(), 'logged-out session removed');
}

async function login(identity, wrong = false) {
  await input('Số điện thoại hoặc email', identity);
  await input('Mật khẩu', wrong ? 'Incorrect synthetic phrase' : password);
  await click('Đăng nhập');
  if (wrong) await waitText('Số điện thoại, email hoặc mật khẩu chưa đúng.');
  else await waitText('Chăm sóc sức khỏe bắt đầu từ một lịch hẹn.');
}

async function register(person, testTerms = false) {
  await click('Đăng ký'); await waitText('Thông tin đăng nhập');
  await input('Họ và tên *', person.name); await input('Số điện thoại *', person.phone);
  await input('Email (không bắt buộc)', person.email); await input('Ngày sinh *', '2000-01-01');
  await input('Mật khẩu *', password); await input('Nhập lại mật khẩu *', password);
  if (testTerms) { await click('Tạo tài khoản'); await waitText('Vui lòng xác nhận điều kiện sử dụng bản demo'); }
  await click('Đồng ý sử dụng tài khoản demo với dữ liệu giả lập', true);
  await click('Tạo tài khoản'); await waitText('Chăm sóc sức khỏe bắt đầu từ một lịch hẹn.');
  const id = await until(sessionId, 'registration session');
  assert.ok(id.startsWith('acct-'));
  await until(() => scoped('clinic', id), 'new account data');
  assert.equal((await scoped('clinic', id)).appointments.length, 0);
  return id;
}

function fixturePdf() {
  const content = 'BT /F1 16 Tf 40 750 Td (TEST FIXTURE - NOT A MEDICAL CERTIFICATE) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let value = '%PDF-1.4\n% TEST ONLY: synthetic upload fixture, not an issued document.\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(value)); value += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const start = Buffer.byteLength(value);
  value += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(value, 'ascii');
}

async function launch() {
  fs.mkdirSync(downloads, { recursive: true });
  server = http.createServer((req, res) => {
    let pathname; try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
    let file = path.resolve(exportRoot, `.${pathname}`);
    if (file !== exportRoot && !file.startsWith(`${exportRoot}${path.sep}`)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { if (path.extname(file)) { res.writeHead(404).end(); return; } file = path.join(exportRoot, 'index.html'); }
    const mime = { '.html': 'text/html;charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const profile = path.join(outputRoot, `chrome-${runId}`); fs.mkdirSync(profile);
  browser = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const port = await until(() => { const file = path.join(profile, 'DevToolsActivePort'); return fs.existsSync(file) && Number(fs.readFileSync(file, 'utf8').split(/\r?\n/)[0]); }, 'Chrome endpoint', 20000);
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
  const socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  client = new CDP(socket);
  await client.send('Page.enable'); await client.send('Runtime.enable');
  await client.send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Ho_Chi_Minh' });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  await client.send('Page.setInterceptFileChooserDialog', { enabled: true });
  await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
}

async function main() {
  assert.ok(fs.existsSync(path.join(exportRoot, 'index.html')), 'Export demo web app first.');
  await launch();
  await navigate('/insurance', 'Chào bạn trở lại');
  await waitText('TÀI KHOẢN DEMO TRÊN THIẾT BỊ');
  assert.equal(await sessionId(), undefined);
  await layout(390, 844, 'login.png'); await layout(320, 740, 'login-320.png');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  pass('Unauthenticated direct route is guarded; local login fits390and320');
  const idA = await register(ACCOUNT_A, true);
  const privateAccounts = await saved('@an-tam/auth/accounts/v1');
  assert.equal(JSON.stringify(privateAccounts).includes(password), false);
  assert.ok(privateAccounts.accounts.every(item => /^[a-f0-9]{64}$/.test(item.passwordHashHex) && /^[a-f0-9]{32}$/.test(item.saltHex) && item.iterations === 100000 && !Object.hasOwn(item, 'password')));
  assert.equal((await scoped('clinic', idA)).notifications.length, 0);
  await layout(390, 844, 'home.png'); await layout(320, 740, 'home-320.png');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  pass('Registration requires consent, creates own identity and starts without demo appointments');

  await navigate('/departments', '22 khoa phù hợp');
  const labels = await client.evaluate(() => [...document.querySelectorAll('[aria-label^="Xem khoa "]')].map(element => element.getAttribute('aria-label')));
  assert.equal(labels.length, 22); assert.equal(departments.length, 22);
  await screenshot('departments.png');
  for (const department of departments) {
    await navigate(`/departments/${department.id}`, department.description);
    for (const service of department.services) await waitText(service);
  }
  pass('All22department details render their service descriptions');
  await navigate('/doctor/20', 'Tô Anh Khoa');
  assert.equal(await client.evaluate(() => document.body.innerText.includes('Đặt lịch tư vấn')), false);
  await navigate('/book/20?service=online', 'Mục đích khám sức khỏe');
  assert.equal(await client.evaluate(() => [...document.querySelectorAll('[role="radio"]')].some(element => element.innerText.includes('Tư vấn trực tuyến'))), false);
  pass('Health-check doctor20 has no online booking option, including direct online URL');

  await navigate('/insurance', 'Chưa lưu thẻ BHYT'); await click('Thêm thẻ BHYT');
  await input('Mã số BHYT *', '123'); await input('Nơi đăng ký khám ban đầu *', 'TEST CLINIC - SYNTHETIC DATA');
  await input('Có giá trị từ * (YYYY-MM-DD)', '2026-01-01'); await input('Có giá trị đến * (YYYY-MM-DD)', '2027-12-31');
  await click('Lưu thông tin BHYT'); await waitText('Nhập mã BHYT gồm 10 chữ số');
  await input('Mã số BHYT *', '0123456789'); await click('Lưu thông tin BHYT'); await waitText('Đã cập nhật thông tin BHYT.');
  const card = await until(async () => (await scoped('records', idA))?.insurance, 'insurance persisted');
  await client.send('Page.reload'); await waitText('0123456789');
  await layout(320, 740, 'insurance-320.png');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  pass('BHYT validates format, saves own card and survives reload');

  await navigate('/book/1', 'Chọn thời gian phù hợp với bạn');
  await client.evaluate(() => [...document.querySelectorAll('[role="radio"][aria-label]')].filter(element => !element.getAttribute('aria-label').startsWith('Khám lúc '))[2].click());
  await until(() => client.evaluate(() => Boolean(document.querySelector('[aria-label^="Khám lúc "]'))), 'booking slots');
  await client.evaluate(() => document.querySelector('[aria-label^="Khám lúc "]').click());
  await input('4. Lý do khám *', 'TEST ONLY - kiểm tra luồng BHYT và mức phí.');
  await waitText('250.000đ'); await click('Đính kèm thông tin BHYT với lịch khám', true); await waitText('Phí hiển thị chưa trừ BHYT');
  await waitText('250.000đ'); await click('Tiếp tục'); await waitText('Kiểm tra lịch hẹn'); await click('Gửi yêu cầu đặt lịch');
  await waitText('Đã gửi yêu cầu đặt lịch.');
  const appointment = await until(async () => (await scoped('clinic', idA))?.appointments[0], 'appointment snapshot persisted');
  assert.equal(appointment.insurance.number, card.number); assert.equal(appointment.insurance.verification, 'unverified'); assert.equal(appointment.fee, 250000);
  pass('Booking attaches unverified insurance snapshot without changing fee');

  await navigate('/health-certificates/new', 'Thêm giấy khám');
  await input('Tên giấy khám *', 'TEST ONLY - Synthetic uploaded record');
  await input('Cơ sở khám / cấp giấy *', 'TEST FIXTURE ORGANIZATION');
  await click('Lưu giấy khám'); await waitText('Vui lòng đính kèm bản chụp hoặc PDF');
  const fixture = path.join(outputRoot, 'TEST_NOT_A_CERTIFICATE.pdf'); const pdf = fixturePdf(); fs.writeFileSync(fixture, pdf);
  const chooser = client.waitEvent('Page.fileChooserOpened'); await click('Chọn PDF hoặc ảnh');
  const event = await chooser;
  if (event.backendNodeId) await client.send('DOM.setFileInputFiles', { files: [fixture], backendNodeId: event.backendNodeId });
  else {
    const document = await client.send('DOM.getDocument'); const node = await client.send('DOM.querySelector', { nodeId: document.root.nodeId, selector: 'input[type="file"]' });
    await client.send('DOM.setFileInputFiles', { files: [fixture], nodeId: node.nodeId });
  }
  await waitText('TEST_NOT_A_CERTIFICATE.pdf'); await click('Lưu giấy khám'); await waitText('Đã lưu giấy khám vào hồ sơ.');
  const certificate = await until(async () => (await scoped('records', idA))?.certificates[0], 'certificate persisted');
  assert.equal(certificate.status, 'unverified'); assert.ok(Buffer.from(certificate.attachment.dataBase64, 'base64').equals(pdf));
  await client.send('Page.reload'); await waitText('TEST ONLY - Synthetic uploaded record'); await waitText('Chưa xác thực');
  await screenshot('certificate.png'); await click('Tải tệp về');
  await until(() => fs.existsSync(path.join(downloads, 'TEST_NOT_A_CERTIFICATE.pdf')), 'PDF browser download');
  assert.ok(fs.readFileSync(path.join(downloads, 'TEST_NOT_A_CERTIFICATE.pdf')).equals(pdf));
  pass('Synthetic PDF chooser/upload/save/reload/detail/download preserves exact bytes');

  await logout(); await login(' PATIENT-A@DEMO.INVALID ', true); assert.equal(await sessionId(), undefined);
  await login(' PATIENT-A@DEMO.INVALID '); assert.equal(await sessionId(), idA); await logout();
  pass('Logout removes session; wrong password fails and normalized email login succeeds');
  const idB = await register(ACCOUNT_B); assert.notEqual(idA, idB);
  await navigate('/insurance', 'Chưa lưu thẻ BHYT'); await navigate('/health-certificates', 'Chưa có giấy khám sức khỏe');
  await navigate(`/health-certificates/${certificate.id}`, 'Không tìm thấy giấy khám');
  await navigate(`/appointment/${appointment.id}`, 'Không tìm thấy lịch hẹn');
  assert.equal((await scoped('clinic', idB)).appointments.length, 0);
  const recordsB = await until(() => scoped('records', idB), 'second account records');
  assert.equal(recordsB.insurance, null); assert.equal(recordsB.certificates.length, 0);
  pass('Second account cannot see first account appointments, BHYT or certificate detail');
  await logout(); await click('Tiếp tục trải nghiệm'); await waitText('Chăm sóc sức khỏe bắt đầu từ một lịch hẹn.');
  assert.equal(await sessionId(), 'demo');
  const demo = await until(() => scoped('clinic', 'demo'), 'demo state'); assert.ok(demo.appointments.some(item => item.id === 'demo-upcoming'));
  await navigate(`/health-certificates/${certificate.id}`, 'Không tìm thấy giấy khám');
  await logout(); await login('+84 900000001'); assert.equal(await sessionId(), idA);
  pass('Explicit demo remains isolated; original account restores with normalized phone login');

  await navigate(`/health-certificates/${certificate.id}`, 'TEST ONLY - Synthetic uploaded record');
  await click('Xóa giấy đã lưu'); await waitText('Xóa giấy khám khỏi hồ sơ?');
  assert.ok((await scoped('records', idA)).certificates.some(item => item.id === certificate.id));
  await click('Xác nhận xóa giấy'); await waitText('Chưa có giấy khám sức khỏe');
  assert.equal((await scoped('records', idA)).certificates.length, 0);
  await navigate('/insurance', '0123456789'); await click('Xóa thẻ đã lưu'); await waitText('Xóa thông tin BHYT đã lưu?');
  await click('Xác nhận xóa thẻ'); await waitText('Chưa lưu thẻ BHYT');
  const kept = (await scoped('clinic', idA)).appointments.find(item => item.id === appointment.id);
  assert.equal(kept.insurance.number, '0123456789'); assert.equal(kept.fee, 250000);
  pass('Delete confirmation preserves record until accepted; deleting card keeps historical booking snapshot');
  assert.deepEqual(errors, [], `Browser errors: ${errors.join('\n')}`);
  pass('No browser runtime or console errors during patient module flows');
  process.stdout.write(`\n${checks} patient module checks passed. Artifacts: ${outputRoot}\n`);
}

main().catch(async error => {
  process.stderr.write(`FAIL ${error.stack}\n`); if (errors.length) process.stderr.write(`Browser errors:\n${errors.join('\n')}\n`);
  if (client) {
    try { await screenshot('failure.png'); fs.writeFileSync(path.join(outputRoot, 'failure.txt'), await client.evaluate(() => `${location.pathname}\n${document.body.innerText}`)); } catch { /* Keep the original failure. */ }
  }
  process.exitCode = 1;
}).finally(async () => {
  if (client) { try { await client.send('Browser.close'); } catch { /* Already closed. */ } client.socket.close(); }
  if (browser && browser.exitCode === null) browser.kill();
  if (server) await new Promise(resolve => server.close(resolve));
});
