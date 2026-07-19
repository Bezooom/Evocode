/**
 * Единые настройки программы «Эвокод»:
 * Модели | Агент (все ключевые kilo-функции) | Программа
 */
const vscode = require('vscode');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

/** @type {{ key: string, label: string, type: 'boolean'|'string'|'enum', options?: string[], section: string, hint?: string }[]} */
const AGENT_SETTINGS = [
  { key: 'kilo-code.new.model.providerID', label: 'Провайдер по умолчанию', type: 'string', section: 'Модель' },
  { key: 'kilo-code.new.model.modelID', label: 'Модель по умолчанию', type: 'string', section: 'Модель' },
  { key: 'kilo-code.new.language', label: 'Язык UI агента', type: 'string', section: 'Модель', hint: 'Русский' },
  { key: 'kilo-code.new.autoApprove.enabled', label: 'Авто-одобрение действий', type: 'boolean', section: 'Безопасность' },
  { key: 'kilo-code.new.autocomplete.enableAutoTrigger', label: 'Автодополнение в редакторе', type: 'boolean', section: 'Автодополнение' },
  { key: 'kilo-code.new.autocomplete.enableChatAutocomplete', label: 'Автодополнение в чате', type: 'boolean', section: 'Автодополнение' },
  { key: 'kilo-code.new.autocomplete.enableSmartInlineTaskKeybinding', label: 'Умный inline task (горячая клавиша)', type: 'boolean', section: 'Автодополнение' },
  { key: 'kilo-code.new.autocomplete.provider', label: 'Провайдер autocomplete', type: 'string', section: 'Автодополнение', hint: 'пусто = Эвокод Core' },
  { key: 'kilo-code.new.autocomplete.model', label: 'Модель autocomplete', type: 'string', section: 'Автодополнение' },
  { key: 'kilo-code.new.browserAutomation.enabled', label: 'Автоматизация браузера (Playwright)', type: 'boolean', section: 'Инструменты' },
  { key: 'kilo-code.new.browserAutomation.headless', label: 'Браузер headless', type: 'boolean', section: 'Инструменты' },
  { key: 'kilo-code.new.browserAutomation.useSystemChrome', label: 'Системный Chrome', type: 'boolean', section: 'Инструменты' },
  { key: 'kilo-code.new.diff.renderMarkdown', label: 'Diff: рендер Markdown', type: 'boolean', section: 'Инструменты' },
];

function corePort(cfg) {
  return Number(cfg.get('corePort') || 8083);
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

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function kiloConfigPath() {
  return path.join(os.homedir(), '.config', 'kilo', 'kilo.json');
}

function readKiloConfig() {
  try {
    return JSON.parse(fs.readFileSync(kiloConfigPath(), 'utf8'));
  } catch {
    return {};
  }
}

function writeKiloConfig(patch) {
  const p = kiloConfigPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const cur = readKiloConfig();
  const next = { ...cur, ...patch };
  if (patch.provider) {
    next.provider = { ...(cur.provider || {}), ...patch.provider };
  }
  fs.writeFileSync(p, JSON.stringify(next, null, 2) + '\n');
  return next;
}

function readAgentSettings() {
  const conf = vscode.workspace.getConfiguration();
  const out = {};
  for (const s of AGENT_SETTINGS) {
    out[s.key] = conf.get(s.key);
  }
  return out;
}

function buildHtml(state) {
  const rt = state.runtime || {};
  const profiles = rt.profiles || [];
  const cards = profiles
    .map((p) => {
      const on = p.online ? 'on' : 'off';
      const ready =
        p.ready?.binary && p.ready?.model
          ? ''
          : !p.ready?.binary
            ? ' · нет бинарника'
            : ' · нет GGUF';
      return `<div class="card">
        <div class="head">
          <span class="dot ${on}"></span>
          <div>
            <div class="t">${esc(p.label || p.id)}</div>
            <div class="s">:${p.port} · ${esc(p.fork)}${ready}</div>
            <div class="s muted">${esc(p.description || p.modelName || '')}</div>
          </div>
        </div>
        <div class="acts">
          ${
            p.online
              ? `<button data-act="switch" data-id="${esc(p.id)}">Перезапуск</button>
                 <button class="ghost" data-act="stop" data-id="${esc(p.id)}">Стоп</button>`
              : `<button data-act="start" data-id="${esc(p.id)}">Запустить</button>`
          }
        </div>
      </div>`;
    })
    .join('');

  const forks = Object.entries(rt.forks || {})
    .map(([k, v]) => `<li><b>${esc(k)}</b> — ${esc(v)}</li>`)
    .join('');

  const agent = state.agent || {};
  const vals = state.agentSettings || {};
  const sections = {};
  for (const s of AGENT_SETTINGS) {
    (sections[s.section] ||= []).push(s);
  }
  let agentFields = '';
  for (const [sec, items] of Object.entries(sections)) {
    agentFields += `<h2>${esc(sec)}</h2>`;
    for (const s of items) {
      const v = vals[s.key];
      if (s.type === 'boolean') {
        agentFields += `<label class="check"><input type="checkbox" data-key="${esc(s.key)}" ${v ? 'checked' : ''}/> ${esc(s.label)}</label>`;
      } else {
        agentFields += `<label>${esc(s.label)}${s.hint ? ` <span class="hint-inline">(${esc(s.hint)})</span>` : ''}</label>
          <input data-key="${esc(s.key)}" value="${esc(v ?? '')}" />`;
      }
    }
  }

  const coreUrl = esc(agent.coreUrl || 'http://127.0.0.1:8083/v1');
  const model = esc(agent.model || 'evocode/evocode-auto');
  const privacy = esc(agent.privacyMode || 'auto');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<style>
  :root {
    color-scheme: dark;
    --bg: #0B0F14;
    --fg: #E6EDF3;
    --muted: #8B949E;
    --card: #121821;
    --border: #1E293B;
    --accent: #3B82F6;
    --ok: #22C55E;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font: 13px/1.45 system-ui, sans-serif;
    color: var(--fg); background: var(--bg);
  }
  .top {
    display: flex; border-bottom: 1px solid var(--border);
    background: #0B0F14; position: sticky; top: 0; z-index: 2;
  }
  .tab {
    flex: 1; padding: 12px 8px; cursor: pointer; border: 0;
    background: transparent; color: var(--muted); font-weight: 650;
  }
  .tab.active { color: var(--fg); border-bottom: 2px solid var(--accent); }
  .page { display: none; padding: 18px 20px 48px; max-width: 760px; margin: 0 auto; }
  .page.active { display: block; }
  h1 { font-size: 18px; margin: 0 0 6px; font-weight: 700; }
  h2 { font-size: 12px; margin: 18px 0 8px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .banner {
    padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border);
    background: var(--card); margin: 10px 0 14px; color: var(--muted);
  }
  .banner.ok { border-color: #16653488; color: var(--fg); }
  .banner.warn { border-color: #854d0e88; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  button {
    background: var(--accent); color: #fff; border: 0; border-radius: 8px;
    padding: 8px 12px; font-size: 12px; cursor: pointer; font-weight: 650;
  }
  button.ghost { background: transparent; border: 1px solid var(--border); color: var(--fg); }
  .card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 12px; margin-bottom: 10px;
  }
  .head { display: flex; gap: 10px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 5px; background: #334155; }
  .dot.on { background: var(--ok); box-shadow: 0 0 8px #22c55e88; }
  .t { font-weight: 700; }
  .s { color: var(--muted); font-size: 11.5px; margin-top: 2px; }
  .acts { display: flex; gap: 8px; margin-top: 10px; }
  .acts button { flex: 1; }
  label { display: block; font-size: 12px; color: var(--muted); margin: 10px 0 4px; }
  label.check { color: var(--fg); display: flex; align-items: center; gap: 8px; margin: 8px 0; }
  input[type="text"], input:not([type]), select {
    width: 100%; padding: 9px 10px; border-radius: 8px;
    border: 1px solid var(--border); background: #0B0F14; color: var(--fg);
  }
  input[type="checkbox"] { width: 16px; height: 16px; }
  ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 12px; }
  .hint { font-size: 12px; color: var(--muted); margin-top: 6px; }
  .hint-inline { color: var(--muted); font-weight: 400; }
  #log { margin-top: 12px; font-size: 11px; color: var(--muted); white-space: pre-wrap; }
</style>
</head>
<body>
  <div class="top">
    <button class="tab active" data-tab="models">Модели</button>
    <button class="tab" data-tab="agent">Агент</button>
    <button class="tab" data-tab="core">Программа</button>
  </div>

  <section class="page active" id="models">
    <h1>Настройки Эвокод</h1>
    <p class="hint"><b>Единый интерфейс</b> программы: модели, агент, Core. Ctrl+Shift+M · Ctrl+, · status bar.</p>
    <h2>Локальные модели</h2>
    <div class="banner ${rt.localReady ? 'ok' : 'warn'}">${esc(rt.message || '…')}</div>
    <div class="row">
      <button id="refresh">Обновить</button>
      <button class="ghost" id="startCoder">Запустить coder (ik)</button>
      <button class="ghost" id="stopAll">Остановить все</button>
    </div>
    <div id="list">${cards || '<div class="banner warn">Нет профилей — Core offline?</div>'}</div>
    <h2>Форки</h2>
    <ul>${forks || '<li>—</li>'}</ul>
  </section>

  <section class="page" id="agent">
    <h1>Агент</h1>
    <p class="hint">Все параметры агента здесь. Сохранение пишет в конфиг программы и settings.</p>

    <h2>Подключение к Core</h2>
    <label>URL Core (OpenAI-compatible)</label>
    <input id="coreUrl" value="${coreUrl}" />
    <label>Модель (provider/model)</label>
    <input id="model" value="${model}" />
    <label>Приватность (router Core)</label>
    <select id="privacy">
      <option value="auto" ${privacy === 'auto' ? 'selected' : ''}>auto — local first</option>
      <option value="always-local" ${privacy === 'always-local' ? 'selected' : ''}>always-local</option>
      <option value="always-cloud" ${privacy === 'always-cloud' ? 'selected' : ''}>always-cloud (+ DLP)</option>
    </select>

    ${agentFields}

    <div class="row" style="margin-top:16px">
      <button id="saveAgent">Сохранить всё</button>
      <button class="ghost" id="focusAgent">Открыть чат агента</button>
    </div>
  </section>

  <section class="page" id="core">
    <h1>Программа Эвокод</h1>
    <div class="banner ${state.coreOnline ? 'ok' : 'warn'}">
      Core :${esc(state.corePort)} — ${state.coreOnline ? 'online' : 'offline'}
      ${state.coreHealth ? ' · localReady=' + esc(String(state.coreHealth.localReady)) : ''}
    </div>
    <div class="row">
      <button id="ensureCore">Проверить / запустить Core</button>
      <button class="ghost" id="openOutput">Журнал</button>
      <button class="ghost" id="installDesktop">Ярлык Ubuntu</button>
    </div>
    <h2>Стек без Microsoft</h2>
    <ul>
      <li>Целевой shell: <b>VSCodium</b> (Open VSX, без telemetry MS)</li>
      <li>Сборка: <code>npm run ide:build-codium</code> (долго)</li>
      <li>Сейчас demo-launcher может использовать code — только для dev; продукт = codium/evocode</li>
    </ul>
    <h2>Слои</h2>
    <ul>
      <li><b>Модели</b> — local llama (ik / buun)</li>
      <li><b>Агент</b> — tools, MCP, autocomplete, browser…</li>
      <li><b>Core</b> — DLP, router, skills :8083</li>
    </ul>
  </section>
  <div id="log"></div>
<script>
  const vscode = acquireVsCodeApi();
  const log = (t) => { document.getElementById('log').textContent = t || ''; };
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    };
  });
  const post = (type, extra = {}) => vscode.postMessage({ type, ...extra });
  document.getElementById('refresh').onclick = () => post('refresh');
  document.getElementById('startCoder').onclick = () => { log('Запуск coder…'); post('start', { id: 'coder' }); };
  document.getElementById('stopAll').onclick = () => { log('Стоп…'); post('stopAll'); };
  document.getElementById('list')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    log(b.dataset.act + ' ' + b.dataset.id);
    post(b.dataset.act, { id: b.dataset.id });
  });
  document.getElementById('saveAgent').onclick = () => {
    const settings = {};
    document.querySelectorAll('[data-key]').forEach((el) => {
      if (el.type === 'checkbox') settings[el.dataset.key] = el.checked;
      else settings[el.dataset.key] = el.value;
    });
    post('saveAgent', {
      coreUrl: document.getElementById('coreUrl').value.trim(),
      model: document.getElementById('model').value.trim(),
      privacyMode: document.getElementById('privacy').value,
      settings,
    });
  };
  document.getElementById('focusAgent').onclick = () => post('focusAgent');
  document.getElementById('ensureCore').onclick = () => post('ensureCore');
  document.getElementById('openOutput').onclick = () => post('openOutput');
  document.getElementById('installDesktop').onclick = () => post('installDesktop');
  window.addEventListener('message', (e) => { if (e.data?.type === 'log') log(e.data.text); });
</script>
</body>
</html>`;
}

class ProductPanel {
  static current;
  constructor(context, getCfg, deps) {
    this.context = context;
    this.getCfg = getCfg;
    this.deps = deps;
    this.panel = undefined;
  }

  static open(context, getCfg, deps) {
    if (ProductPanel.current?.panel) {
      ProductPanel.current.panel.reveal(vscode.ViewColumn.One);
      ProductPanel.current.refresh();
      return ProductPanel.current;
    }
    const inst = new ProductPanel(context, getCfg, deps);
    ProductPanel.current = inst;
    inst.show();
    return inst;
  }

  show() {
    this.panel = vscode.window.createWebviewPanel(
      'evocode.product',
      'Эвокод — Настройки',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    this.panel.onDidDispose(() => {
      if (ProductPanel.current === this) ProductPanel.current = undefined;
      this.panel = undefined;
    });
    this.panel.webview.onDidReceiveMessage((m) => this.onMessage(m));
    this.refresh();
  }

  async gatherState() {
    const port = corePort(this.getCfg());
    let runtime = { localReady: false, message: 'Core offline', profiles: [], forks: {} };
    let coreOnline = false;
    let coreHealth = null;
    try {
      const h = await httpJson('GET', '/health', null, port, 3000);
      coreOnline = h.status === 200;
      coreHealth = h.json;
      const rt = await httpJson('GET', '/v1/runtime', null, port, 8000);
      if (rt.json) runtime = rt.json;
    } catch {
      /* */
    }
    const kilo = readKiloConfig();
    const baseURL =
      kilo?.provider?.evocode?.options?.baseURL ||
      process.env.EVOCODE_CORE_URL ||
      `http://127.0.0.1:${port}/v1`;
    const conf = vscode.workspace.getConfiguration();
    return {
      corePort: port,
      coreOnline,
      coreHealth,
      runtime,
      agent: {
        coreUrl: baseURL,
        model:
          kilo.model ||
          `${conf.get('kilo-code.new.model.providerID') || 'evocode'}/${conf.get('kilo-code.new.model.modelID') || 'evocode-auto'}`,
        privacyMode: process.env.EVOCODE_PRIVACY_MODE || 'auto',
      },
      agentSettings: readAgentSettings(),
    };
  }

  async refresh() {
    if (!this.panel) return;
    this.panel.webview.html = buildHtml(await this.gatherState());
  }

  async onMessage(msg) {
    const port = corePort(this.getCfg());
    const log = (text) => this.panel?.webview.postMessage({ type: 'log', text });
    try {
      if (msg.type === 'refresh') return void (await this.refresh());
      if (msg.type === 'stopAll') {
        const r = await httpJson('POST', '/v1/runtime/stop', { all: true }, port, 30000);
        log(r.json?.message || 'OK');
        return void (await this.refresh());
      }
      if (msg.type === 'start' || msg.type === 'switch') {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Эвокод: ${msg.type === 'start' ? 'запуск' : 'перезапуск'} «${msg.id}»…`,
          },
          async () => {
            const pathApi = msg.type === 'switch' ? '/v1/runtime/switch' : '/v1/runtime/start';
            const r = await httpJson(
              'POST',
              pathApi,
              { profile: msg.id, force: msg.type === 'switch' },
              port,
              120000,
            );
            const text = r.json?.message || r.json?.error?.message || JSON.stringify(r.json);
            vscode.window.showInformationMessage(`Эвокод: ${text}`);
            log(text);
            await this.refresh();
          },
        );
        return;
      }
      if (msg.type === 'stop') {
        const r = await httpJson('POST', '/v1/runtime/stop', { profile: msg.id }, port, 30000);
        log(r.json?.message || 'OK');
        return void (await this.refresh());
      }
      if (msg.type === 'saveAgent') {
        const coreUrl = msg.coreUrl || `http://127.0.0.1:${port}/v1`;
        const model = msg.model || 'evocode/evocode-auto';
        writeKiloConfig({
          model,
          enabled_providers: ['evocode'],
          disabled_providers: ['kilo'],
          provider: {
            evocode: {
              npm: '@ai-sdk/openai-compatible',
              name: 'Эвокод Core',
              options: { baseURL: coreUrl, apiKey: 'evocode-local' },
            },
          },
        });
        const conf = vscode.workspace.getConfiguration();
        const parts = String(model).split('/');
        const providerID = parts.length > 1 ? parts[0] : 'evocode';
        const modelID = parts.length > 1 ? parts.slice(1).join('/') : model;
        await conf.update('kilo-code.new.model.providerID', providerID, true);
        await conf.update('kilo-code.new.model.modelID', modelID, true);

        // all agent settings from form
        for (const [key, val] of Object.entries(msg.settings || {})) {
          try {
            await conf.update(key, val, true);
          } catch (e) {
            log(`warn ${key}: ${e.message}`);
          }
        }

        const root = process.env.EVOCODE_ROOT || path.resolve(__dirname, '../../../../');
        try {
          fs.mkdirSync(path.join(root, '.evocode'), { recursive: true });
          fs.writeFileSync(
            path.join(root, '.evocode', 'shell-prefs.json'),
            JSON.stringify(
              { privacyMode: msg.privacyMode || 'auto', coreUrl, model, settings: msg.settings },
              null,
              2,
            ) + '\n',
          );
        } catch {
          /* */
        }
        vscode.window.showInformationMessage('Эвокод: настройки агента сохранены в программу');
        log('Сохранено');
        return void (await this.refresh());
      }
      if (msg.type === 'focusAgent') return void (await this.deps.focusAgent());
      if (msg.type === 'ensureCore') {
        await this.deps.ensureCore();
        return void (await this.refresh());
      }
      if (msg.type === 'openOutput') return void this.deps.channel.show(true);
      if (msg.type === 'openIdeSettings') {
        await vscode.commands.executeCommand('evocode.shell.openIdeSettings');
        return;
      }
      if (msg.type === 'installDesktop') {
        await vscode.commands.executeCommand('evocode.shell.installDesktop');
      }
    } catch (e) {
      vscode.window.showErrorMessage(`Эвокод: ${e.message}`);
      log(String(e.message || e));
    }
  }
}

module.exports = { ProductPanel, httpJson, corePort, AGENT_SETTINGS };
