/**
 * Webview «Модели» — activity bar panel (RU).
 */
const vscode = require('vscode');
const http = require('http');

function corePort(cfg) {
  return cfg.get('corePort') || 8083;
}

function httpJson(method, urlPath, body, port, timeoutMs = 120000) {
  const payload = body != null ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null });
          } catch {
            resolve({ status: res.statusCode, json: null, raw: data });
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function html(status) {
  const profiles = status?.profiles || [];
  const rows = profiles
    .map((p) => {
      const online = p.online ? 'online' : 'offline';
      const ready =
        p.ready?.binary && p.ready?.model
          ? ''
          : !p.ready?.binary
            ? ' · нет бинарника'
            : ' · нет GGUF';
      return `<div class="card" data-id="${escapeHtml(p.id)}">
        <div class="row">
          <span class="dot ${online}"></span>
          <div class="meta">
            <div class="title">${escapeHtml(p.label || p.id)}</div>
            <div class="sub">:${p.port} · ${escapeHtml(p.fork)}${ready}</div>
            <div class="sub dim">${escapeHtml(p.description || p.modelName || '')}</div>
          </div>
        </div>
        <div class="actions">
          ${
            p.online
              ? `<button data-act="switch" data-id="${escapeHtml(p.id)}">Перезапуск</button>
                 <button class="ghost" data-act="stop" data-id="${escapeHtml(p.id)}">Стоп</button>`
              : `<button data-act="start" data-id="${escapeHtml(p.id)}">Запустить</button>`
          }
        </div>
      </div>`;
    })
    .join('');

  const forks = Object.entries(status?.forks || {})
    .map(([k, v]) => `<li><b>${escapeHtml(k)}</b> — ${escapeHtml(v)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  :root {
    color-scheme: dark;
    --bg: var(--vscode-sideBar-background, #0d1117);
    --fg: var(--vscode-foreground, #e6edf3);
    --muted: var(--vscode-descriptionForeground, #7d8590);
    --accent: #1A73E8;
    --ok: #3fb950;
    --bad: #7d8590;
    --card: #161b22;
    --border: #21262d;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 10px 12px 24px;
    font: 13px/1.45 var(--vscode-font-family, system-ui);
    color: var(--fg); background: var(--bg);
  }
  h1 { font-size: 14px; margin: 0 0 8px; font-weight: 600; }
  .banner {
    padding: 8px 10px; border-radius: 8px; margin-bottom: 10px;
    background: var(--card); border: 1px solid var(--border);
    color: var(--muted); font-size: 12px;
  }
  .banner.ok { border-color: #23863655; color: var(--fg); }
  .toolbar { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
  button {
    background: var(--accent); color: #fff; border: 0; border-radius: 6px;
    padding: 6px 10px; font-size: 12px; cursor: pointer;
  }
  button.ghost { background: transparent; border: 1px solid var(--border); color: var(--fg); }
  button:disabled { opacity: 0.5; cursor: wait; }
  .card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 10px; padding: 10px; margin-bottom: 8px;
  }
  .row { display: flex; gap: 8px; align-items: flex-start; }
  .dot {
    width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex: 0 0 auto;
    background: var(--bad);
  }
  .dot.online { background: var(--ok); box-shadow: 0 0 6px #3fb95088; }
  .title { font-weight: 600; font-size: 12.5px; }
  .sub { color: var(--muted); font-size: 11px; margin-top: 2px; }
  .dim { opacity: 0.85; }
  .actions { display: flex; gap: 6px; margin-top: 8px; }
  .actions button { flex: 1; }
  h2 { font-size: 12px; margin: 14px 0 6px; color: var(--muted); font-weight: 600; }
  ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 11px; }
  .busy { opacity: 0.7; pointer-events: none; }
  #log { margin-top: 10px; font-size: 11px; color: var(--muted); white-space: pre-wrap; }
</style>
</head>
<body>
  <h1>Модели Эвокод</h1>
  <div class="banner ${status?.localReady ? 'ok' : ''}" id="banner">
    ${escapeHtml(status?.message || 'Нет данных Core')}
  </div>
  <div class="toolbar">
    <button id="refresh">Обновить</button>
    <button class="ghost" id="stopAll">Стоп все</button>
    <button class="ghost" id="startCoder">coder (ik)</button>
  </div>
  <div id="list">${rows || '<div class="banner">Профили не загружены. Core :8083?</div>'}</div>
  <h2>Форки</h2>
  <ul>${forks || '<li>—</li>'}</ul>
  <div id="log"></div>
  <script>
    const vscode = acquireVsCodeApi();
    const log = (t) => { document.getElementById('log').textContent = t; };
    const busy = (on) => document.body.classList.toggle('busy', on);
    document.getElementById('refresh').onclick = () => vscode.postMessage({ type: 'refresh' });
    document.getElementById('stopAll').onclick = () => {
      busy(true); log('Остановка…'); vscode.postMessage({ type: 'stopAll' });
    };
    document.getElementById('startCoder').onclick = () => {
      busy(true); log('Запуск coder…'); vscode.postMessage({ type: 'start', id: 'coder' });
    };
    document.getElementById('list').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      busy(true);
      log(btn.dataset.act + ' ' + btn.dataset.id + '…');
      vscode.postMessage({ type: btn.dataset.act, id: btn.dataset.id });
    });
    window.addEventListener('message', (e) => {
      const m = e.data;
      if (m?.type === 'log') log(m.text || '');
      if (m?.type === 'busy') busy(!!m.on);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

class ModelsViewProvider {
  static viewType = 'evocode.modelsView';

  /**
   * @param {vscode.ExtensionContext} context
   * @param {() => import('vscode').WorkspaceConfiguration} getCfg
   */
  constructor(context, getCfg) {
    this.context = context;
    this.getCfg = getCfg;
    /** @type {vscode.WebviewView | undefined} */
    this.view = undefined;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.onDidReceiveMessage((msg) => this.onMessage(msg));
    this.refresh();
  }

  async fetchStatus() {
    const port = corePort(this.getCfg());
    try {
      const r = await httpJson('GET', '/v1/runtime', null, port, 8000);
      return r.json;
    } catch {
      return {
        localReady: false,
        message: `Core недоступен на :${port}. Запустите npm run evocode / npm start.`,
        profiles: [],
        forks: {},
      };
    }
  }

  async refresh() {
    if (!this.view) return;
    const status = await this.fetchStatus();
    this.view.webview.html = html(status);
    this.view.webview.postMessage({ type: 'busy', on: false });
  }

  postLog(text) {
    this.view?.webview.postMessage({ type: 'log', text });
    this.view?.webview.postMessage({ type: 'busy', on: false });
  }

  async onMessage(msg) {
    const port = corePort(this.getCfg());
    try {
      if (msg.type === 'refresh') {
        await this.refresh();
        return;
      }
      if (msg.type === 'stopAll') {
        const r = await httpJson('POST', '/v1/runtime/stop', { all: true }, port, 30000);
        this.postLog(r.json?.message || 'OK');
        await this.refresh();
        return;
      }
      if (msg.type === 'start' || msg.type === 'switch') {
        const path = msg.type === 'switch' ? '/v1/runtime/switch' : '/v1/runtime/start';
        const r = await httpJson(
          'POST',
          path,
          { profile: msg.id, force: msg.type === 'switch' },
          port,
          120000,
        );
        const text = r.json?.message || r.json?.error?.message || JSON.stringify(r.json);
        vscode.window.showInformationMessage(`Эвокод: ${text}`);
        this.postLog(text);
        await this.refresh();
        return;
      }
      if (msg.type === 'stop') {
        const r = await httpJson('POST', '/v1/runtime/stop', { profile: msg.id }, port, 30000);
        this.postLog(r.json?.message || 'OK');
        await this.refresh();
      }
    } catch (e) {
      vscode.window.showErrorMessage(`Эвокод: ${e.message}`);
      this.postLog(String(e.message || e));
    }
  }
}

module.exports = { ModelsViewProvider, httpJson, corePort };
