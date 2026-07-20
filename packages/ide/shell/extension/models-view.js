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
  const roleOrder = { chat: 0, fim: 1, embed: 2 };
  const sorted = [...profiles].sort(
    (a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) || String(a.id).localeCompare(b.id),
  );
  const rows = sorted
    .map((p) => {
      const online = p.online ? 'online' : 'offline';
      const ready =
        p.ready?.binary && p.ready?.model
          ? ''
          : !p.ready?.binary
            ? ' · нет бинарника'
            : ' · нет GGUF';
      const roleBadge =
        p.role === 'fim'
          ? '<span class="badge fim">FIM / autocomplete</span>'
          : p.role === 'embed'
            ? '<span class="badge emb">embed</span>'
            : '<span class="badge chat">chat</span>';
      return `<div class="card ${p.role === 'fim' ? 'card-fim' : ''}" data-id="${escapeHtml(p.id)}">
        <div class="row">
          <span class="dot ${online}"></span>
          <div class="meta">
            <div class="title">${escapeHtml(p.label || p.id)} ${roleBadge}</div>
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
    --bg: var(--vscode-sideBar-background, #060814);
    --fg: var(--vscode-foreground, #F1F5F9);
    --muted: var(--vscode-descriptionForeground, #94A3B8);
    --accent: #6366F1;
    --ok: #10B981;
    --bad: #475569;
    --card: rgba(20, 26, 48, 0.45);
    --border: rgba(255, 255, 255, 0.08);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 12px 14px 24px;
    font: 13px/1.5 var(--vscode-font-family, system-ui, -apple-system, sans-serif);
    color: var(--fg); background: var(--bg);
    letter-spacing: -0.01em;
  }
  h1 {
    font-size: 16px; margin: 0 0 10px; font-weight: 800;
    background: linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .banner {
    padding: 10px 12px; border-radius: 10px; margin-bottom: 12px;
    background: var(--card); border: 1px solid var(--border);
    color: var(--muted); font-size: 11.5px;
    backdrop-filter: blur(8px);
    transition: all 0.25s ease;
  }
  .banner.ok { border-color: rgba(16, 185, 129, 0.3); color: var(--fg); background: rgba(16, 185, 129, 0.05); }
  .toolbar { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
  button {
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    color: #fff; border: 0; border-radius: 8px;
    padding: 8px 12px; font-size: 11.5px; cursor: pointer; font-weight: 600;
    box-shadow: 0 4px 10px rgba(79, 70, 229, 0.15);
    transition: all 0.2s ease;
  }
  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(79, 70, 229, 0.25);
  }
  button.ghost {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border);
    color: var(--fg);
    box-shadow: none;
  }
  .card-fim { border-color: rgba(16, 185, 129, 0.35) !important; }
  .badge {
    font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 6px;
    margin-left: 6px; vertical-align: middle;
  }
  .badge.fim { background: rgba(16,185,129,0.15); color: #6ee7b7; }
  .badge.chat { background: rgba(99,102,241,0.15); color: #a5b4fc; }
  .badge.emb { background: rgba(251,191,36,0.12); color: #fbbf24; }
  button.ghost:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: none;
  }
  button:disabled { opacity: 0.5; cursor: wait; }
  .card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 12px; margin-bottom: 10px;
    backdrop-filter: blur(8px);
    transition: all 0.2s ease-in-out;
  }
  .card:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.06);
  }
  .row { display: flex; gap: 10px; align-items: flex-start; }
  .dot {
    width: 9px; height: 9px; border-radius: 50%; margin-top: 5px; flex: 0 0 auto;
    background: var(--bad);
  }
  .dot.online { background: var(--ok); box-shadow: 0 0 10px rgba(16, 185, 129, 0.6); }
  .title { font-weight: 700; font-size: 13px; }
  .sub { color: var(--muted); font-size: 11.5px; margin-top: 3px; }
  .dim { opacity: 0.85; }
  .actions { display: flex; gap: 6px; margin-top: 12px; }
  .actions button { flex: 1; }
  h2 { font-size: 11px; margin: 18px 0 8px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 11.5px; }
  li { margin-bottom: 4px; }
  .busy { opacity: 0.7; pointer-events: none; }
  #log { margin-top: 12px; font-size: 11px; color: var(--muted); white-space: pre-wrap; font-family: monospace; }
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
