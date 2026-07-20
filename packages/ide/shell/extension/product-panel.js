/**
 * Единые настройки программы «Эвокод»:
 * Модели | Агент | MCP | Программа
 */
const vscode = require('vscode');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

/** Shared agent config paths (evocode.json, not stock kilo). */
let agentPaths = null;
for (const candidate of [
  path.join(__dirname, 'agent-config-paths.cjs'),
  process.env.EVOCODE_ROOT &&
    path.join(process.env.EVOCODE_ROOT, 'packages/agent-extension/lib/agent-config-paths.cjs'),
  path.join(__dirname, '../../../agent-extension/lib/agent-config-paths.cjs'),
  path.join(__dirname, '../../../../agent-extension/lib/agent-config-paths.cjs'),
].filter(Boolean)) {
  try {
    if (fs.existsSync(candidate)) {
      agentPaths = require(candidate);
      break;
    }
  } catch {
    /* */
  }
}

/** @type {{ key: string, label: string, type: 'boolean'|'string'|'enum', options?: string[], section: string, hint?: string }[]} */
const AGENT_SETTINGS = [
  { key: 'evocode-agent.new.model.providerID', label: 'Провайдер по умолчанию', type: 'string', section: 'Модель' },
  { key: 'evocode-agent.new.model.modelID', label: 'Модель по умолчанию', type: 'string', section: 'Модель' },
  { key: 'evocode-agent.new.language', label: 'Язык UI агента', type: 'string', section: 'Модель', hint: 'Русский' },
  { key: 'evocode-agent.new.autoApprove.enabled', label: 'Авто-одобрение действий', type: 'boolean', section: 'Безопасность' },
  { key: 'evocode-agent.new.sandbox.enabled', label: 'Изолированная песочница (bubblewrap)', type: 'boolean', section: 'Безопасность', hint: 'bwrap' },
  { key: 'evocode-agent.new.autocomplete.enableAutoTrigger', label: 'Автодополнение в редакторе', type: 'boolean', section: 'Автодополнение' },
  { key: 'evocode-agent.new.autocomplete.enableChatAutocomplete', label: 'Автодополнение в чате', type: 'boolean', section: 'Автодополнение' },
  { key: 'evocode-agent.new.autocomplete.enableSmartInlineTaskKeybinding', label: 'Умный inline task (горячая клавиша)', type: 'boolean', section: 'Автодополнение' },
  { key: 'evocode-agent.new.autocomplete.provider', label: 'Провайдер autocomplete', type: 'string', section: 'Автодополнение', hint: 'пусто = Эвокод Core' },
  { key: 'evocode-agent.new.autocomplete.model', label: 'Модель autocomplete', type: 'string', section: 'Автодополнение' },
  { key: 'evocode-agent.new.browserAutomation.enabled', label: 'Автоматизация браузера (Playwright)', type: 'boolean', section: 'Инструменты' },
  { key: 'evocode-agent.new.browserAutomation.headless', label: 'Браузер headless', type: 'boolean', section: 'Инструменты' },
  { key: 'evocode-agent.new.browserAutomation.useSystemChrome', label: 'Системный Chrome', type: 'boolean', section: 'Инструменты' },
  { key: 'evocode-agent.new.diff.renderMarkdown', label: 'Diff: рендер Markdown', type: 'boolean', section: 'Инструменты' },
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

/** Isolated Evocode agent config — never ~/.config/kilo (stock Kilo / VS Code). */
function agentConfigDisplayPath() {
  if (agentPaths) return agentPaths.canonicalAgentConfigPath();
  if (process.env.EVOCODE_CONFIG_DIR) {
    return path.join(process.env.EVOCODE_CONFIG_DIR, 'evocode.json');
  }
  if (process.env.KILO_CONFIG_DIR) {
    return path.join(process.env.KILO_CONFIG_DIR, 'evocode.json');
  }
  return path.join(os.homedir(), '.config', 'evocode', 'agent', 'evocode.json');
}

function readAgentConfigFile() {
  if (agentPaths) {
    agentPaths.migrateLegacyIsolatedConfig?.();
    return agentPaths.readAgentConfig();
  }
  try {
    return JSON.parse(fs.readFileSync(agentConfigDisplayPath(), 'utf8'));
  } catch {
    return {};
  }
}

function writeAgentConfigFile(patch) {
  if (agentPaths) {
    return agentPaths.patchAgentConfig(patch);
  }
  const p = agentConfigDisplayPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  let cur = {};
  try {
    cur = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    /* */
  }
  const next = { ...cur, ...patch };
  if (patch.provider) {
    next.provider = { ...(cur.provider || {}), ...patch.provider };
  }
  fs.writeFileSync(p, JSON.stringify(next, null, 2) + '\n');
  return next;
}

// Back-compat aliases used below
const readKiloConfig = readAgentConfigFile;
const writeKiloConfig = writeAgentConfigFile;

/**
 * Normalize MCP entry for display.
 * Kilo/OpenCode schema:
 *   local:  { type: "local", command: string[], environment?: Record<string,string> }
 *   remote: { type: "remote", url: string }
 * Legacy UI shape (pre-fix): { command: string, args: string[], env?: object }
 */
function formatMcpEntry(cfg) {
  if (!cfg || typeof cfg !== 'object') {
    return { kind: '?', detail: 'некорректная запись', extra: '' };
  }
  const isRemote = cfg.type === 'remote' || (cfg.url && !cfg.command);
  if (isRemote) {
    return { kind: 'remote', detail: String(cfg.url || ''), extra: '' };
  }
  let argv = [];
  if (Array.isArray(cfg.command)) {
    argv = cfg.command.map(String);
  } else if (cfg.command != null || Array.isArray(cfg.args)) {
    argv = [cfg.command, ...(cfg.args || [])].filter((x) => x != null && x !== '').map(String);
  }
  const env = cfg.environment || cfg.env;
  const envKeys = env && typeof env === 'object' ? Object.keys(env) : [];
  return {
    kind: cfg.type || 'local',
    detail: argv.length ? argv.join(' ') : '(нет команды)',
    extra: envKeys.length ? `env: ${envKeys.join(', ')}` : '',
  };
}

/** Build Kilo-compatible MCP server object from UI form payload. */
function buildMcpServerConfig(msg) {
  const type = msg.mcpType === 'remote' ? 'remote' : 'local';
  if (type === 'remote') {
    return { type: 'remote', url: String(msg.url || '').trim() };
  }
  const cmd = String(msg.command || '').trim();
  const args = Array.isArray(msg.args) ? msg.args.map(String) : [];
  const command = cmd ? [cmd, ...args] : args;
  const entry = { type: 'local', command };
  if (msg.env && typeof msg.env === 'object' && Object.keys(msg.env).length) {
    entry.environment = msg.env;
  }
  return entry;
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
  const skillsList = state.skills || [];
  const config = state.config || {};
  const cloud = config.inference?.cloud || {};
  const router = config.router || {};
  const hasFolder = state.hasFolder;
  const folderBanner = !hasFolder 
    ? `<div class="settings-group" style="border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.05); margin-top: 14px;">
        <h2 style="display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Рабочее пространство
        </h2>
        <p style="margin: 6px 0 12px; color: var(--muted); font-size: 13px; line-height: 1.45;">Папка проекта не открыта. Откройте рабочую папку, чтобы Эвокод мог сканировать файлы, индексировать кодовую базу и запускать локальные задачи.</p>
        <button id="openFolderBtn">Открыть папку проекта</button>
       </div>`
    : `<div class="settings-group" style="padding: 12px 18px; background: rgba(255,255,255,0.01); margin-top: 14px; display: flex; align-items: center; justify-content: space-between;">
        <span style="color: var(--muted); font-size:12px; display: inline-flex; align-items: center; gap: 6px;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Активный проект: <b style="color: var(--fg);">${esc(state.folderPath)}</b>
        </span>
        <button class="ghost" id="openFolderBtn" style="padding: 4px 10px; font-size: 11px;">Сменить папку</button>
       </div>`;
  const skillCards = skillsList.length > 0
    ? skillsList.map((s) => {
        const isUser = s.source === 'user';
        const sourceLabel = isUser ? 'Пользовательский' : 'Системный';
        const badgeClass = isUser ? 'badge-user' : 'badge-system';
        const triggers = (s.triggers || []).map(t => `<span class="pill">${esc(t)}</span>`).join(' ');
        
        return `<div class="card">
          <div class="head">
            <span class="dot ${isUser ? 'on' : 'system-dot'}"></span>
            <div style="flex: 1; min-width: 0;">
              <div class="t">
                ${esc(s.name)} 
                <span class="badge ${badgeClass}">${sourceLabel}</span>
              </div>
              <div class="s" style="margin-top: 6px; word-break: break-all;"><code>${esc(s.path)}</code></div>
              <div class="s muted" style="margin-top: 6px; font-style: italic;">${esc(s.description || 'Нет описания')}</div>
              <div class="pills-container" style="margin-top: 8px;">${triggers}</div>
            </div>
          </div>
          <div class="acts" style="margin-top: 12px;">
            <button class="ghost" data-act="openFile" data-path="${esc(s.path)}">Редактировать в IDE</button>
            ${isUser ? `<button class="ghost delete-btn" data-act="deleteSkill" data-name="${esc(s.name)}">Удалить</button>` : ''}
          </div>
        </div>`;
      }).join('')
    : `<div class="banner">Нет загруженных навыков.</div>`;
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

  const mcpEntries = Object.entries(state.mcpServers || {});
  const mcpRows = mcpEntries.length > 0
    ? mcpEntries.map(([id, cfg]) => {
        const meta = formatMcpEntry(cfg);
        return `<div class="card">
          <div class="head">
            <span class="dot on"></span>
            <div>
              <div class="t">${esc(id)} <span class="hint-inline">(${esc(meta.kind)})</span></div>
              <div class="s"><code>${esc(meta.detail)}</code></div>
              ${meta.extra ? `<div class="s muted">${esc(meta.extra)}</div>` : ''}
            </div>
          </div>
          <div class="acts">
            <button class="ghost" data-act="deleteMcp" data-id="${esc(id)}">Удалить</button>
          </div>
        </div>`;
      }).join('')
    : `<div class="banner">Нет MCP-серверов в <code>${esc(agentConfigDisplayPath())}</code> (изолированный конфиг Эвокод).</div>`;

  const agent = state.agent || {};
  const vals = state.agentSettings || {};
  const sections = {};
  for (const s of AGENT_SETTINGS) {
    (sections[s.section] ||= []).push(s);
  }
  let agentFields = '';
  for (const [sec, items] of Object.entries(sections)) {
    agentFields += `<div class="settings-group">
      <h2>${esc(sec)}</h2>`;
    for (const s of items) {
      const v = vals[s.key];
      if (s.type === 'boolean') {
        agentFields += `<div class="toggle-container">
          <span class="toggle-label">${esc(s.label)}</span>
          <label class="switch">
            <input type="checkbox" data-key="${esc(s.key)}" ${v ? 'checked' : ''}/>
            <span class="slider"></span>
          </label>
        </div>`;
      } else {
        agentFields += `<div class="input-container">
          <label>${esc(s.label)}${s.hint ? ` <span class="hint-inline">(${esc(s.hint)})</span>` : ''}</label>
          <input data-key="${esc(s.key)}" value="${esc(v ?? '')}" />
        </div>`;
      }
    }
    agentFields += `</div>`;
  }

  const coreUrl = esc(agent.coreUrl || 'http://127.0.0.1:8083/v1');
  const model = esc(agent.model || 'evocode/evocode-auto');
  const privacy = esc(agent.privacyMode || 'auto');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    color-scheme: dark;
    --bg: #060814;
    --fg: #F1F5F9;
    --muted: #94A3B8;
    --card: rgba(20, 26, 48, 0.45);
    --border: rgba(255, 255, 255, 0.08);
    --accent: #6366F1;
    --ok: #10B981;
    --warn: #F59E0B;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: 'Outfit', system-ui, -apple-system, sans-serif;
    font-size: 13px; line-height: 1.5;
    color: var(--fg); background: linear-gradient(135deg, #060814 0%, #0d122b 100%);
    background-attachment: fixed;
    letter-spacing: -0.015em;
  }
  .top {
    display: flex;
    background: rgba(13, 18, 38, 0.6) !important;
    backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    position: sticky; top: 10px; z-index: 10;
    margin: 16px 20px 0 20px;
    padding: 4px;
    gap: 4px;
  }
  .tab {
    flex: 1; padding: 10px 14px; cursor: pointer; border: 0;
    background: transparent; color: var(--muted); font-weight: 600;
    border-radius: 8px;
    font-family: inherit;
    transition: all 0.2s ease-in-out;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .tab-icon {
    flex-shrink: 0;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }
  .tab.active .tab-icon, .tab:hover .tab-icon {
    opacity: 1;
  }
  .tab.active {
    background: rgba(99, 102, 241, 0.15);
    color: #A5B4FC;
    box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.3);
  }
  .tab:hover:not(.active) {
    background: rgba(255, 255, 255, 0.04);
    color: var(--fg);
  }
  .page { display: none; padding: 24px 20px 48px; max-width: 760px; margin: 0 auto; }
  .page.active { display: block; }
  h1 {
    font-size: 22px; margin: 0 0 8px; font-weight: 800;
    background: linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  h2 { font-size: 11px; margin: 24px 0 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
  .banner {
    padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border);
    background: var(--card); margin: 12px 0 18px; color: var(--muted);
    backdrop-filter: blur(8px);
    transition: all 0.25s ease;
  }
  .banner.ok { border-color: rgba(16, 185, 129, 0.3); color: var(--fg); background: rgba(16, 185, 129, 0.05); }
  .banner.warn { border-color: rgba(245, 158, 11, 0.3); color: #FCD34D; background: rgba(245, 158, 11, 0.05); }
  .row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  button {
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    color: #fff; border: 0; border-radius: 8px;
    padding: 9px 15px; font-size: 12px; cursor: pointer; font-weight: 600;
    font-family: inherit;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
    transition: all 0.2s ease;
  }
  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
  }
  button.ghost {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border);
    color: var(--fg);
    box-shadow: none;
  }
  button.ghost:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: none;
  }
  .card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; padding: 16px; margin-bottom: 12px;
    backdrop-filter: blur(8px);
    transition: all 0.2s ease-in-out;
  }
  .card:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.06);
  }
  .head { display: flex; gap: 12px; align-items: center; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #334155; }
  .dot.on { background: var(--ok); box-shadow: 0 0 10px rgba(16, 185, 129, 0.6); }
  .t { font-weight: 700; font-size: 14px; }
  .s { color: var(--muted); font-size: 12px; margin-top: 3px; }
  .acts { display: flex; gap: 8px; margin-top: 14px; }
  .acts button { flex: 1; }
  label { display: block; font-size: 12px; color: var(--muted); margin: 12px 0 6px; font-weight: 500; }
  label.check { color: var(--fg); display: flex; align-items: center; gap: 10px; margin: 10px 0; cursor: pointer; }
  
  input[type="text"], input:not([type]), input[type="number"], select {
    width: 100%; padding: 10px 12px; border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05); background: rgba(13, 18, 38, 0.45); color: var(--fg);
    outline: none;
    font-family: inherit;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  input[type="text"]:focus, input:not([type]):focus, input[type="number"]:focus, select:focus {
    border-color: rgba(107, 92, 246, 0.6);
    box-shadow: 0 0 14px rgba(107, 92, 246, 0.18);
    background: rgba(13, 18, 38, 0.7);
  }
  input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
  ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 12px; }
  li { margin-bottom: 4px; }
  .hint { font-size: 12px; color: var(--muted); margin-top: 6px; line-height: 1.4; }
  .hint-inline { color: var(--muted); font-weight: 400; font-size: 11px; }
  .dot.system-dot { background: #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.6); }
  .badge {
    font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px; text-transform: uppercase;
  }
  .badge.badge-user { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
  .badge.badge-system { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
  .pill {
    display: inline-block; font-size: 10px; background: rgba(255, 255, 255, 0.05); color: var(--muted);
    padding: 2px 6px; border-radius: 4px; margin-right: 4px; margin-bottom: 4px; border: 1px solid var(--border);
  }
  .delete-btn {
    border-color: rgba(239, 68, 68, 0.3) !important;
  }
  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.1) !important;
    border-color: rgba(239, 68, 68, 0.6) !important;
    color: #f87171 !important;
  }

  /* Custom switches & layouts */
  .settings-group {
    background: rgba(20, 26, 48, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 20px;
    backdrop-filter: blur(12px);
  }
  .settings-group h2 {
    margin-top: 0;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 8px;
    color: #A5B4FC;
    font-size: 13px;
    letter-spacing: 0.03em;
  }
  .toggle-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 14px 0;
  }
  .toggle-label {
    font-size: 13px;
    color: var(--fg);
    font-weight: 500;
  }
  .switch {
    position: relative;
    display: inline-block;
    width: 38px;
    height: 20px;
  }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(255, 255, 255, 0.06);
    transition: .25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .slider:before {
    position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px;
    background-color: var(--muted);
    transition: .25s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 50%;
  }
  input:checked + .slider { background-color: var(--accent); border-color: rgba(107, 92, 246, 0.4); }
  input:checked + .slider:before {
    transform: translateX(18px);
    background-color: #fff;
  }
  .input-container {
    margin-bottom: 14px;
  }
  .input-container:last-child {
    margin-bottom: 0;
  }
  
  #log { margin-top: 14px; font-size: 11px; color: var(--muted); white-space: pre-wrap; font-family: monospace; }

  /* Search bar styles */
  .search-bar-container {
    margin: 16px 20px 0 20px;
    position: sticky;
    top: 68px;
    z-index: 9;
  }
  .search-bar-container input {
    width: 100%;
    padding: 12px 16px 12px 40px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(13, 18, 38, 0.6) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cpath d='M21 21l-4.35-4.35'%3E%3C/path%3E%3C/svg%3E") no-repeat 14px center;
    color: var(--fg);
    outline: none;
    font-family: inherit;
    font-size: 13px;
    backdrop-filter: blur(16px);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .search-bar-container input:focus {
    border-color: rgba(107, 92, 246, 0.6);
    box-shadow: 0 0 14px rgba(107, 92, 246, 0.18);
    background-color: rgba(13, 18, 38, 0.85);
  }
</style>
</head>
<body>
  <div class="top">
    <button class="tab active" data-tab="models">
      <svg class="tab-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
      Модели
    </button>
    <button class="tab" data-tab="agent">
      <svg class="tab-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <rect x="9" y="9" width="6" height="6"/>
        <path d="M9 1v2M15 1v2M9 21v2M15 21v2M20 9h3M20 15h3M1 9h2M1 15h2"/>
      </svg>
      Агент
    </button>
    <button class="tab" data-tab="cloud">
      <svg class="tab-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
      </svg>
      Облако / Роутер
    </button>
    <button class="tab" data-tab="skills">
      <svg class="tab-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
      Навыки
    </button>
    <button class="tab" data-tab="mcp">
      <svg class="tab-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
        <line x1="12" y1="2" x2="12" y2="12"/>
      </svg>
      MCP Серверы
    </button>
    <button class="tab" data-tab="core">
      <svg class="tab-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 17 10 11 4 5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
      Программа
    </button>
  </div>

  <div class="search-bar-container">
    <input type="text" id="settingsSearch" placeholder="Поиск настроек (навыки, ключи, модели, MCP)..." />
  </div>

  <section class="page active" id="models">
    <h1>Настройки Эвокод</h1>
    <p class="hint"><b>Единый интерфейс</b> программы: модели, агент, Core. Ctrl+Shift+M · Ctrl+, · status bar.</p>
    ${folderBanner}
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

    <div class="settings-group">
      <h2>Подключение к Core</h2>
      <div class="input-container">
        <label>URL Core (OpenAI-compatible)</label>
        <input id="coreUrl" value="${coreUrl}" />
      </div>
      <div class="input-container">
        <label>Модель (provider/model)</label>
        <input id="model" value="${model}" />
      </div>
      <div class="input-container">
        <label>Приватность (router Core)</label>
        <select id="privacy">
          <option value="auto" ${privacy === 'auto' ? 'selected' : ''}>auto — local first</option>
          <option value="always-local" ${privacy === 'always-local' ? 'selected' : ''}>always-local</option>
          <option value="always-cloud" ${privacy === 'always-cloud' ? 'selected' : ''}>always-cloud (+ DLP)</option>
        </select>
      </div>
    </div>

    ${agentFields}

    <div class="row" style="margin-top:16px">
      <button id="saveAgent">Сохранить всё</button>
      <button class="ghost" id="focusAgent">Открыть чат агента</button>
    </div>
  </section>

  <section class="page" id="cloud">
    <h1>Облачные модели и Роутер</h1>
    <p class="hint">Здесь настраивается подключение к внешним LLM для решения сложных задач, если локальная модель не справляется. Умный роутер автоматически переключает запросы на основе размера и сложности задачи.</p>

    <div class="settings-group">
      <h2>Настройки провайдера</h2>
      <div class="input-container">
        <label>Облачный провайдер</label>
        <select id="cloudProvider">
          <option value="openrouter" ${cloud.provider === 'openrouter' ? 'selected' : ''}>OpenRouter (Рекомендуется)</option>
          <option value="openai" ${cloud.provider === 'openai' ? 'selected' : ''}>OpenAI (ChatGPT)</option>
          <option value="anthropic" ${cloud.provider === 'anthropic' ? 'selected' : ''}>Anthropic (Claude)</option>
          <option value="gemini" ${cloud.provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
          <option value="openaicompatible" ${cloud.provider === 'openaicompatible' ? 'selected' : ''}>Custom OpenAI-Compatible</option>
        </select>
      </div>

      <div class="input-container">
        <label>API Ключ</label>
        <input id="cloudApiKey" type="text" placeholder="sk-..." value="${esc(cloud.apiKey)}" />
      </div>

      <div class="input-container">
        <label>Модель по умолчанию</label>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 8px;">
            <select id="cloudModelSelect" style="flex: 1;"></select>
            <button id="toggleCustomModelBtn" class="ghost" style="padding: 4px 8px; font-size: 11px; white-space: nowrap;">Ввести вручную</button>
          </div>
          <input id="cloudModelInput" placeholder="например, anthropic/claude-3-5-sonnet" style="display: none;" value="${esc(cloud.model)}" />
        </div>
      </div>
      
      <div style="margin-top: 10px; display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
        <button id="updateModelsBtn" class="ghost" style="padding: 6px 12px; font-size: 12px;">Обновить модели</button>
        <span id="updateModelsStatus" style="font-size: 11px; color: var(--vscode-descriptionForeground);"></span>
      </div>

      <div class="input-container">
        <label>Base URL API</label>
        <input id="cloudBaseUrl" placeholder="https://..." value="${esc(cloud.baseUrl)}" />
      </div>

      <div class="input-container">
        <label>HTTP Proxy (необязательно)</label>
        <input id="cloudProxyUrl" placeholder="например, http://127.0.0.1:7890" value="${esc(cloud.proxyUrl || '')}" />
      </div>
    </div>

    <div class="settings-group">
      <h2>Настройки умного роутера</h2>
      <div class="input-container">
        <label>Режим приватности роутера</label>
        <select id="routerPrivacyMode">
          <option value="auto" ${router.privacyMode === 'auto' ? 'selected' : ''}>auto — автовыбор на основе контекста</option>
          <option value="always-local" ${router.privacyMode === 'always-local' ? 'selected' : ''}>always-local — только локальные модели (строгая приватность)</option>
          <option value="always-cloud" ${router.privacyMode === 'always-cloud' ? 'selected' : ''}>always-cloud — всегда использовать внешнее облако</option>
        </select>
      </div>

      <div id="routerThresholds" style="${router.privacyMode === 'auto' ? '' : 'display:none'}">
        <div class="input-container">
          <label>Максимальный локальный контекст (в токенах)</label>
          <input id="routerLocalMaxTokens" type="number" value="${router.localMaxTokens ?? 400}" />
          <span class="hint-inline" style="margin-top:4px; display:block; margin-bottom:8px;">Задачи меньше этого размера всегда решаются локально.</span>
        </div>

        <div class="input-container">
          <label>Минимальный облачный контекст (в токенах)</label>
          <input id="routerCloudMinTokens" type="number" value="${router.cloudMinTokens ?? 3000}" />
          <span class="hint-inline" style="margin-top:4px; display:block; margin-bottom:8px;">Задачи больше этого размера при наличии сложности направляются в облако.</span>
        </div>
      </div>
    </div>

    <div class="row" style="margin-top:20px">
      <button id="saveCloudBtn">Сохранить настройки облака</button>
    </div>
  </section>

  <section class="page" id="skills">
    <h1>Навыки Эвокод</h1>
    <p class="hint">Навыки — это расширенные инструкции агента. Системные навыки (system) обновляются из репозитория, а пользовательские (user) позволяют добавлять свои инструкции или переопределять системные.</p>
    
    <div class="row">
      <button id="syncSkills">Синхронизировать сейчас</button>
    </div>

    <div id="skills-list" style="margin-top: 12px;">${skillCards}</div>

    <h2>Создать новый навык</h2>
    <div class="card" style="margin-top: 10px;">
      <label>Имя нового навыка (только латиница, цифры, дефисы)</label>
      <input id="newSkillName" placeholder="например, my-custom-skill" />
      <div class="row" style="margin-top: 14px;">
        <button id="createSkillBtn">Создать и редактировать</button>
      </div>
    </div>
  </section>

  <section class="page" id="mcp">
    <h1>MCP Серверы</h1>
    <p class="hint">Model Context Protocol — внешние tools агента. Конфиг: <code>${esc(agentConfigDisplayPath())}</code> → ключ <code>mcp</code> (local command[] / remote url). После изменений — перезагрузка окна агента.</p>
    <div id="mcp-list">${mcpRows}</div>

    <h2>Добавить MCP-сервер</h2>
    <div class="card" style="margin-top:10px">
      <div class="input-container">
        <label>Идентификатор (ID)</label>
        <input id="newMcpId" placeholder="например, filesystem" />
      </div>
      <div class="input-container">
        <label>Тип</label>
        <select id="newMcpType">
          <option value="local" selected>local — команда (stdio)</option>
          <option value="remote">remote — URL</option>
        </select>
      </div>
      <div id="mcpLocalFields">
        <div class="input-container">
          <label>Исполняемый файл / команда</label>
          <input id="newMcpCmd" placeholder="npx  или  /usr/bin/python3" />
        </div>
        <div class="input-container">
          <label>Аргументы (через запятую)</label>
          <input id="newMcpArgs" placeholder="-y, @modelcontextprotocol/server-filesystem, /home/user" />
        </div>
      </div>
      <div id="mcpRemoteFields" style="display:none">
        <div class="input-container">
          <label>URL</label>
          <input id="newMcpUrl" placeholder="https://…/mcp  или  http://127.0.0.1:8000/mcp" />
        </div>
      </div>
      <div class="row" style="margin-top:14px">
        <button id="addMcpBtn">Добавить сервер</button>
      </div>
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
      const searchInput = document.getElementById('settingsSearch');
      if (searchInput) {
        searchInput.value = '';
        const tabsContainer = document.querySelector('.top');
        tabsContainer.style.display = 'flex';
        document.querySelectorAll('.page').forEach(p => {
          p.style.display = '';
          p.querySelectorAll('.settings-group, .card, h2').forEach(g => {
            g.style.display = '';
          });
        });
      }
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
  
  const openFolderBtn = document.getElementById('openFolderBtn');
  if (openFolderBtn) {
    openFolderBtn.onclick = () => post('openFolder');
  }
  document.getElementById('list')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    log(b.dataset.act + ' ' + b.dataset.id);
    post(b.dataset.act, { id: b.dataset.id });
  });
  document.getElementById('mcp-list')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    log(b.dataset.act + ' ' + b.dataset.id);
    post(b.dataset.act, { id: b.dataset.id });
  });
  const mcpTypeEl = document.getElementById('newMcpType');
  const syncMcpType = () => {
    const remote = mcpTypeEl?.value === 'remote';
    document.getElementById('mcpLocalFields').style.display = remote ? 'none' : '';
    document.getElementById('mcpRemoteFields').style.display = remote ? '' : 'none';
  };
  mcpTypeEl?.addEventListener('change', syncMcpType);
  syncMcpType();
  document.getElementById('addMcpBtn').onclick = () => {
    const id = document.getElementById('newMcpId').value.trim();
    const mcpType = document.getElementById('newMcpType').value;
    if (!id) {
      log('Укажите ID сервера');
      return;
    }
    if (mcpType === 'remote') {
      const url = document.getElementById('newMcpUrl').value.trim();
      if (!url) {
        log('Укажите URL remote MCP');
        return;
      }
      post('addMcp', { id, mcpType: 'remote', url });
      return;
    }
    const command = document.getElementById('newMcpCmd').value.trim();
    const argsRaw = document.getElementById('newMcpArgs').value.trim();
    if (!command) {
      log('Укажите команду (executable)');
      return;
    }
    const args = argsRaw ? argsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
    post('addMcp', { id, mcpType: 'local', command, args });
  };
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

  // Навыки
  document.getElementById('syncSkills').onclick = () => { log('Синхронизация навыков…'); post('syncSkills'); };
  document.getElementById('createSkillBtn').onclick = () => {
    const name = document.getElementById('newSkillName').value.trim();
    if (!name) {
      log('Укажите имя навыка');
      return;
    }
    log('Создание навыка ' + name + '…');
    post('createSkill', { name });
  };
  document.getElementById('skills-list')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    if (b.dataset.act === 'openFile') {
      post('openFile', { path: b.dataset.path });
    } else if (b.dataset.act === 'deleteSkill') {
      post('deleteSkill', { name: b.dataset.name });
    }
  });

  // Облачные модели и Роутер
  const DEFAULT_MODELS = {
    openrouter: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-pro-1.5', 'meta-llama/llama-3-70b-instruct'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
    gemini: ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-exp'],
    openaicompatible: []
  };

  const providerEl = document.getElementById('cloudProvider');
  const baseUrlEl = document.getElementById('cloudBaseUrl');
  const cloudModelSelect = document.getElementById('cloudModelSelect');
  const cloudModelInput = document.getElementById('cloudModelInput');
  const toggleCustomModelBtn = document.getElementById('toggleCustomModelBtn');
  const updateModelsBtn = document.getElementById('updateModelsBtn');
  const updateModelsStatus = document.getElementById('updateModelsStatus');

  const urlTemplates = {
    openrouter: 'https://openrouter.ai/api/v1',
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/v1',
    openaicompatible: ''
  };

  let currentModel = `${esc(cloud.model)}`;
  let isCustomModel = true;

  function populateModels(modelsList) {
    cloudModelSelect.innerHTML = '';
    const uniqueModels = Array.from(new Set(modelsList));
    uniqueModels.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      cloudModelSelect.appendChild(opt);
    });

    const customOpt = document.createElement('option');
    customOpt.value = '__custom__';
    customOpt.textContent = 'Другая (ввести вручную)...';
    cloudModelSelect.appendChild(customOpt);

    if (uniqueModels.includes(currentModel)) {
      cloudModelSelect.value = currentModel;
      isCustomModel = false;
      cloudModelInput.style.display = 'none';
    } else {
      cloudModelSelect.value = '__custom__';
      isCustomModel = true;
      cloudModelInput.style.display = 'block';
    }
  }

  // Populate initially
  const defaultModels = DEFAULT_MODELS[providerEl.value] || [];
  if (currentModel && !defaultModels.includes(currentModel)) {
    populateModels([...defaultModels, currentModel]);
  } else {
    populateModels(defaultModels);
  }

  providerEl?.addEventListener('change', () => {
    const val = providerEl.value;
    if (urlTemplates[val] !== undefined) {
      if (urlTemplates[val]) baseUrlEl.value = urlTemplates[val];
    }
    const models = DEFAULT_MODELS[val] || [];
    if (models.length > 0) {
      currentModel = models[0];
      populateModels(models);
      cloudModelInput.value = currentModel;
    } else {
      currentModel = '';
      populateModels([]);
      cloudModelInput.value = '';
    }
  });

  cloudModelSelect?.addEventListener('change', () => {
    if (cloudModelSelect.value === '__custom__') {
      isCustomModel = true;
      cloudModelInput.style.display = 'block';
      cloudModelInput.focus();
    } else {
      isCustomModel = false;
      cloudModelInput.style.display = 'none';
      cloudModelInput.value = cloudModelSelect.value;
    }
  });

  toggleCustomModelBtn?.addEventListener('click', () => {
    if (cloudModelInput.style.display === 'none') {
      cloudModelInput.style.display = 'block';
      cloudModelSelect.value = '__custom__';
      isCustomModel = true;
      cloudModelInput.focus();
    } else {
      cloudModelInput.style.display = 'none';
      if (cloudModelSelect.value === '__custom__') {
        cloudModelSelect.value = cloudModelSelect.options[0]?.value || '';
      }
      isCustomModel = false;
      cloudModelInput.value = cloudModelSelect.value;
    }
  });

  updateModelsBtn?.addEventListener('click', () => {
    const provider = providerEl.value;
    const apiKey = document.getElementById('cloudApiKey').value.trim();
    const baseUrl = baseUrlEl.value.trim();
    const proxyUrl = document.getElementById('cloudProxyUrl').value.trim();

    if (!apiKey && provider !== 'openaicompatible') {
      updateModelsStatus.textContent = 'Ошибка: введите API ключ';
      updateModelsStatus.style.color = '#ff6b6b';
      return;
    }

    updateModelsStatus.textContent = 'Загрузка моделей...';
    updateModelsStatus.style.color = 'var(--vscode-descriptionForeground)';

    post('fetchModels', { provider, apiKey, baseUrl, proxyUrl });
  });

  const privacyEl = document.getElementById('routerPrivacyMode');
  const thresholdsEl = document.getElementById('routerThresholds');
  privacyEl?.addEventListener('change', () => {
    thresholdsEl.style.display = privacyEl.value === 'auto' ? '' : 'none';
  });

  document.getElementById('saveCloudBtn').onclick = () => {
    const activeModel = isCustomModel ? cloudModelInput.value.trim() : cloudModelSelect.value;
    post('saveCloud', {
      inference: {
        cloud: {
          provider: document.getElementById('cloudProvider').value,
          apiKey: document.getElementById('cloudApiKey').value.trim(),
          model: activeModel,
          baseUrl: document.getElementById('cloudBaseUrl').value.trim(),
          proxyUrl: document.getElementById('cloudProxyUrl').value.trim()
        }
      },
      router: {
        privacyMode: document.getElementById('routerPrivacyMode').value,
        localMaxTokens: Number(document.getElementById('routerLocalMaxTokens').value),
        cloudMinTokens: Number(document.getElementById('routerCloudMinTokens').value)
      }
    });
  };

  const searchInput = document.getElementById('settingsSearch');
  const tabsContainer = document.querySelector('.top');
  const pages = document.querySelectorAll('.page');

  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query === '') {
      tabsContainer.style.display = 'flex';
      pages.forEach(p => {
        p.classList.remove('active');
        p.style.display = '';
        p.querySelectorAll('.settings-group, .card, h2').forEach(g => {
          g.style.display = '';
        });
      });
      const lastActiveTab = document.querySelector('.tab.active');
      if (lastActiveTab) {
        document.getElementById(lastActiveTab.dataset.tab).classList.add('active');
      }
    } else {
      tabsContainer.style.display = 'none';
      pages.forEach(p => {
        p.style.display = 'block';
        p.classList.remove('active');

        let pageHasMatches = false;
        p.querySelectorAll('.settings-group, .card').forEach(g => {
          const text = g.textContent.toLowerCase();
          const matches = text.includes(query);
          g.style.display = matches ? '' : 'none';
          if (matches) pageHasMatches = true;
        });

        p.querySelectorAll('h2').forEach(h => {
          h.style.display = h.textContent.toLowerCase().includes(query) ? '' : 'none';
        });

        const pageTitle = p.querySelector('h1')?.textContent.toLowerCase() || '';
        const pageHint = p.querySelector('.hint')?.textContent.toLowerCase() || '';
        
        if (pageTitle.includes(query) || pageHint.includes(query)) {
          p.style.display = 'block';
          p.querySelectorAll('.settings-group, .card, h2').forEach(g => {
            g.style.display = '';
          });
        } else if (!pageHasMatches) {
          p.style.display = 'none';
        } else {
          p.style.display = 'block';
        }
      });
    }
  });

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg?.type === 'log') log(msg.text);
    if (msg?.type === 'modelsFetched') {
      if (msg.success && Array.isArray(msg.models)) {
        if (msg.models.length === 0) {
          updateModelsStatus.textContent = 'Провайдер не вернул модели';
          updateModelsStatus.style.color = '#ff9f43';
        } else {
          populateModels(msg.models);
          updateModelsStatus.textContent = `Успешно загружено моделей: ${msg.models.length}`;
          updateModelsStatus.style.color = '#2ecc71';
        }
      } else {
        updateModelsStatus.textContent = `Ошибка: ${msg.error || 'неизвестно'}`;
        updateModelsStatus.style.color = '#ff6b6b';
      }
    }
  });
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
    let skills = [];
    if (coreOnline) {
      try {
        const sk = await httpJson('GET', '/v1/skills', null, port, 5000);
        if (sk.json && sk.json.skills) {
          skills = sk.json.skills;
        }
      } catch {
        /* */
      }
    }
    let config = {
      inference: {
        cloud: {
          provider: 'openrouter',
          model: 'anthropic/claude-sonnet-4',
          apiKey: '',
          baseUrl: 'https://openrouter.ai/api/v1',
          proxyUrl: ''
        }
      },
      router: {
        privacyMode: 'auto',
        localMaxTokens: 400,
        cloudMinTokens: 3000
      }
    };
    if (coreOnline) {
      try {
        const cfgRes = await httpJson('GET', '/v1/config', null, port, 5000);
        if (cfgRes.json) {
          config = cfgRes.json;
        }
      } catch {
        /* */
      }
    }
    const kilo = readKiloConfig();
    const baseURL =
      kilo?.provider?.evocode?.options?.baseURL ||
      process.env.EVOCODE_CORE_URL ||
      `http://127.0.0.1:${port}/v1`;
    const conf = vscode.workspace.getConfiguration();
    const folders = vscode.workspace.workspaceFolders;
    return {
      corePort: port,
      coreOnline,
      coreHealth,
      runtime,
      skills,
      config,
      hasFolder: !!(folders && folders.length > 0),
      folderPath: folders && folders.length > 0 ? folders[0].uri.fsPath : '',
      agent: {
        coreUrl: baseURL,
        model:
          kilo.model ||
          `${conf.get('evocode-agent.new.model.providerID') || 'evocode'}/${conf.get('evocode-agent.new.model.modelID') || 'evocode-auto'}`,
        privacyMode: process.env.EVOCODE_PRIVACY_MODE || 'auto',
      },
      agentSettings: readAgentSettings(),
      mcpServers: kilo.mcp || {},
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
      if (msg.type === 'openFolder') {
        vscode.commands.executeCommand('workbench.action.files.openFolder');
        return;
      }
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
      if (msg.type === 'addMcp') {
        const id = String(msg.id || '').trim();
        if (!id) {
          log('ID сервера обязателен');
          return;
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
          log('ID: только латиница, цифры, . _ -');
          return;
        }
        const entry = buildMcpServerConfig(msg);
        if (entry.type === 'remote' && !entry.url) {
          log('URL remote MCP обязателен');
          return;
        }
        if (entry.type === 'local' && (!entry.command || !entry.command.length)) {
          log('Команда local MCP обязательна');
          return;
        }
        const kilo = readKiloConfig();
        if (!kilo.mcp || typeof kilo.mcp !== 'object') kilo.mcp = {};
        kilo.mcp[id] = entry;
        writeKiloConfig({ mcp: kilo.mcp });
        log(`Добавлен MCP (${entry.type}): ${id} — перезагрузите окно агента для применения`);
        return void (await this.refresh());
      }
      if (msg.type === 'deleteMcp') {
        const kilo = readKiloConfig();
        if (kilo.mcp && kilo.mcp[msg.id]) {
          delete kilo.mcp[msg.id];
          writeKiloConfig({ mcp: kilo.mcp });
          log(`Удалён MCP-сервер: ${msg.id} — перезагрузите окно агента для применения`);
        } else {
          log(`MCP «${msg.id}» не найден`);
        }
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
        await conf.update('evocode-agent.new.model.providerID', providerID, true);
        await conf.update('evocode-agent.new.model.modelID', modelID, true);

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
        return;
      }
      if (msg.type === 'saveCloud') {
        try {
          const r = await httpJson('POST', '/v1/config', msg, port, 10000);
          if (r.status === 200) {
            vscode.window.showInformationMessage('Эвокод: Настройки облачных моделей и роутера сохранены.');
            log('Настройки облака сохранены');
          } else {
            const err = r.json?.error?.message || 'ошибка сервера';
            vscode.window.showErrorMessage(`Не удалось сохранить настройки: ${err}`);
            log(`Ошибка: ${err}`);
          }
        } catch (e) {
          vscode.window.showErrorMessage(`Ошибка сохранения: ${e.message}`);
          log(`Ошибка: ${e.message}`);
        }
        await this.refresh();
        return;
      }
      if (msg.type === 'fetchModels') {
        try {
          const r = await httpJson('POST', '/v1/models/fetch', msg, port, 15000);
          if (r.status === 200 && Array.isArray(r.json?.models)) {
            this.panel.webview.postMessage({
              type: 'modelsFetched',
              success: true,
              models: r.json.models
            });
          } else {
            const err = r.json?.error?.message || 'ошибка сервера';
            this.panel.webview.postMessage({
              type: 'modelsFetched',
              success: false,
              error: err
            });
          }
        } catch (e) {
          this.panel.webview.postMessage({
            type: 'modelsFetched',
            success: false,
            error: e.message
          });
        }
        return;
      }
      if (msg.type === 'syncSkills') {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Эвокод: Синхронизация навыков…' },
          async () => {
            try {
              const r = await httpJson('POST', '/v1/skills/sync', {}, port, 60000);
              const count = (r.json?.newSkills?.length || 0) + (r.json?.changedSkills?.length || 0);
              vscode.window.showInformationMessage(`Эвокод: Синхронизировано навыков: ${count}`);
              log(`Синхронизация завершена. Ошибок: ${r.json?.errors?.length || 0}`);
            } catch (e) {
              vscode.window.showErrorMessage(`Ошибка синхронизации: ${e.message}`);
              log(`Ошибка: ${e.message}`);
            }
            await this.refresh();
          }
        );
        return;
      }
      if (msg.type === 'openFile') {
        const filePath = msg.path;
        if (fs.existsSync(filePath)) {
          vscode.workspace.openTextDocument(filePath).then(doc => {
            vscode.window.showTextDocument(doc);
          });
        } else {
          vscode.window.showErrorMessage(`Файл не найден: ${filePath}`);
        }
        return;
      }
      if (msg.type === 'createSkill') {
        const name = String(msg.name || '').trim();
        if (!name) return;
        try {
          const r = await httpJson('POST', '/v1/skills/user', { name }, port, 10000);
          if (r.status === 200 && r.json?.path) {
            vscode.window.showInformationMessage(`Эвокод: Навык «${name}» создан.`);
            log(`Создан навык ${name} по пути ${r.json.path}`);
            if (fs.existsSync(r.json.path)) {
              vscode.workspace.openTextDocument(r.json.path).then(doc => {
                vscode.window.showTextDocument(doc);
              });
            }
            await this.refresh();
          } else {
            const err = r.json?.error?.message || 'ошибка сервера';
            vscode.window.showErrorMessage(`Не удалось создать навык: ${err}`);
            log(`Ошибка: ${err}`);
          }
        } catch (e) {
          vscode.window.showErrorMessage(`Ошибка создания: ${e.message}`);
          log(`Ошибка: ${e.message}`);
        }
        return;
      }
      if (msg.type === 'deleteSkill') {
        const name = String(msg.name || '').trim();
        if (!name) return;
        const confirm = await vscode.window.showWarningMessage(
          `Вы действительно хотите удалить пользовательский навык «${name}»?`,
          'Да, удалить',
          'Отмена'
        );
        if (confirm === 'Да, удалить') {
          try {
            const r = await httpJson('DELETE', '/v1/skills/user', { name }, port, 5000);
            if (r.status === 200) {
              vscode.window.showInformationMessage(`Эвокод: Навык «${name}» удален.`);
              log(`Удален навык ${name}`);
            } else {
              const err = r.json?.error?.message || 'ошибка сервера';
              vscode.window.showErrorMessage(`Ошибка удаления: ${err}`);
              log(`Ошибка: ${err}`);
            }
          } catch (e) {
            vscode.window.showErrorMessage(`Ошибка: ${e.message}`);
            log(`Ошибка: ${e.message}`);
          }
          await this.refresh();
        }
        return;
      }
    } catch (e) {
      vscode.window.showErrorMessage(`Эвокод: ${e.message}`);
      log(String(e.message || e));
    }
  }
}

module.exports = { ProductPanel, httpJson, corePort, AGENT_SETTINGS };
