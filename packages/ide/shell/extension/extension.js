/**
 * Эвокод Shell — product host:
 * единые настройки программы (модели+агент+core), без «ощущения расширения».
 */
const vscode = require('vscode');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execSync } = require('child_process');
const { ProductPanel, httpJson, corePort } = require('./product-panel');

const FIRST_RUN_KEY = 'evocode.shell.firstRunDone';
const AUTO_MODEL_KEY = 'evocode.shell.autoModelAttempted';

function cfg() {
  return vscode.workspace.getConfiguration('evocode.shell');
}

function resolveCoreRoot() {
  const fromSettings = cfg().get('coreRoot');
  if (fromSettings && fs.existsSync(path.join(fromSettings, 'dist', 'index.js'))) {
    return fromSettings;
  }
  if (process.env.EVOCODE_ROOT && fs.existsSync(path.join(process.env.EVOCODE_ROOT, 'dist', 'index.js'))) {
    return process.env.EVOCODE_ROOT;
  }
  const candidates = [
    path.resolve(__dirname, '../../../../core/'),
    path.resolve(__dirname, '../../../../../core/'),
    path.resolve(__dirname, '../../../../'),
    path.resolve(__dirname, '../../../../../'),
    '/home/bezoom/storage/Projects/Evocode',
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'dist', 'index.js'))) return c;
  }
  return null;
}

function healthCheck(port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(
      `http://127.0.0.1:${port}/health`,
      { timeout: timeoutMs },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ ok: res.statusCode === 200, json: JSON.parse(body) });
          } catch {
            resolve({ ok: res.statusCode === 200, json: null });
          }
        });
      },
    );
    req.on('error', () => resolve({ ok: false, json: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, json: null });
    });
  });
}

async function ensureCore(log) {
  const port = corePort(cfg());
  let live = await healthCheck(port, 1500);
  if (live.ok) {
    log?.(`Core online :${port}`);
    return { started: false, online: true, port, health: live.json };
  }
  const root = resolveCoreRoot();
  if (!root) {
    log?.('Core offline — EVOCODE_ROOT');
    vscode.window.showErrorMessage('Эвокод: Core offline. Запустите: PORT=8083 npm start');
    return { started: false, online: false, port, health: null };
  }
  // Port may be occupied by wedged Core — free it
  try {
    const { execSync } = require('child_process');
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 400));
  } catch {
    /* */
  }
  const entry = path.join(root, 'dist', 'index.js');
  log?.(`Запуск Core: ${entry}`);
  const coreLog = path.join(root, '.evocode', 'core-sidecar.log');
  fs.mkdirSync(path.dirname(coreLog), { recursive: true });
  let out = 'ignore';
  try {
    out = fs.openSync(coreLog, 'a');
  } catch {
    out = 'ignore';
  }
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    detached: true,
    stdio: out === 'ignore' ? 'ignore' : ['ignore', out, out],
    env: {
      ...process.env,
      PORT: String(port),
      EVOCODE_LLAMA_MODE: process.env.EVOCODE_LLAMA_MODE || 'attach',
    },
  });
  child.unref();
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 400));
    live = await healthCheck(port, 1200);
    if (live.ok) return { started: true, online: true, port, health: live.json };
  }
  return { started: true, online: false, port, health: null };
}

async function focusAgent() {
  const candidates = [
    'workbench.view.extension.evocode-agent-ActivityBar',
    'evocode-agent.SidebarProvider.focus',
    'workbench.action.focusSideBar',
  ];
  for (const cmd of candidates) {
    try {
      await vscode.commands.executeCommand(cmd);
      return cmd;
    } catch {
      /* */
    }
  }
  return null;
}

/** Close built-in Chat / secondary AI chrome if open */
async function dismissBuiltinChat(log) {
  const cmds = [
    'workbench.action.chat.close',
    'workbench.action.closeAuxiliaryBar',
    'workbench.action.closePanel',
  ];
  for (const c of cmds) {
    try {
      await vscode.commands.executeCommand(c);
    } catch {
      /* optional */
    }
  }
  log?.('builtin chat/aux bar dismissed');
}

function installDesktopEntry(log) {
  const root = resolveCoreRoot() || process.env.EVOCODE_ROOT;
  if (!root) throw new Error('EVOCODE_ROOT not found');
  const script = path.join(root, 'scripts', 'install-desktop.sh');
  if (!fs.existsSync(script)) throw new Error('scripts/install-desktop.sh missing');
  execSync(`bash "${script}"`, { stdio: 'inherit', env: { ...process.env, EVOCODE_ROOT: root } });
  log?.('desktop entry installed');
  return script;
}

async function startDefaultModel(log) {
  const port = corePort(cfg());
  const id = cfg().get('defaultModelProfile') || 'coder';
  try {
    const rt = await httpJson('GET', '/v1/runtime', null, port, 8000);
    if (rt.json?.localReady) {
      log?.('LLM already online');
      return { skipped: true, ok: true, message: 'Уже online' };
    }
  } catch (e) {
    log?.(`runtime: ${e.message}`);
  }
  const r = await httpJson('POST', '/v1/runtime/start', { profile: id }, port, 120000);
  return r.json || { message: 'no response' };
}

/** Лёгкая FIM/autocomplete (Neurocontrol ~2G) на :8082 */
async function startFimModel(log) {
  const port = corePort(cfg());
  const id = cfg().get('fimModelProfile') || 'fim-small';
  try {
    const rt = await httpJson('GET', '/v1/runtime', null, port, 8000);
    const fimProf = (rt.json?.profiles || []).find((p) => p.id === id || p.role === 'fim');
    if (fimProf?.online || rt.json?.fim?.ready) {
      log?.('FIM already online');
      return { skipped: true, ok: true, message: 'FIM уже online' };
    }
  } catch (e) {
    log?.(`fim runtime: ${e.message}`);
  }
  // Ensure Core has FIM routing enabled
  try {
    await httpJson('POST', '/v1/config', { fim: { enabled: true, profileId: id } }, port, 8000);
  } catch {
    /* */
  }
  const r = await httpJson('POST', '/v1/runtime/start', { profile: id }, port, 180000);
  log?.(`FIM start ${id}: ${r.json?.message || r.status}`);
  return r.json || { message: 'no response' };
}

class SettingsViewProvider {
  static viewType = 'evocode.shell.settingsView';
  constructor(context, getCfg, deps) {
    this.context = context;
    this.getCfg = getCfg;
    this.deps = deps;
  }

  resolveWebviewView(webviewView, context, token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };
    webviewView.webview.html = this.getHtml();
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'openSettings') {
        vscode.commands.executeCommand('evocode.shell.openProduct');
      } else if (msg.type === 'openChat') {
        vscode.commands.executeCommand('evocode.shell.focusAgent');
      } else if (msg.type === 'syncSkills') {
        const port = corePort(this.getCfg());
        vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Эвокод: Синхронизация навыков…' },
          async () => {
            try {
              const r = await httpJson('POST', '/v1/skills/sync', {}, port, 60000);
              const count = (r.json?.newSkills?.length || 0) + (r.json?.changedSkills?.length || 0);
              vscode.window.showInformationMessage(`Эвокод: Синхронизировано навыков: ${count}`);
              this.updateState();
            } catch (e) {
              vscode.window.showErrorMessage(`Ошибка синхронизации: ${e.message}`);
            }
          }
        );
      }
    });

    this.updateState();
    this._interval = setInterval(() => this.updateState(), 4000);
    webviewView.onDidDispose(() => {
      if (this._interval) clearInterval(this._interval);
    });
  }

  async updateState() {
    if (!this._view) return;
    try {
      const port = corePort(this.getCfg());
      let coreOnline = false;
      let activeModel = 'нет';
      try {
        const h = await healthCheck(port, 1500);
        coreOnline = h.ok;
        if (coreOnline) {
          const rt = await httpJson('GET', '/v1/runtime', null, port, 1500);
          if (rt.json && rt.json.activeChatProfile) {
            activeModel = rt.json.activeChatProfile;
          }
        }
      } catch {
        /* */
      }
      this._view.webview.postMessage({
        type: 'state',
        coreOnline,
        activeModel
      });
    } catch {
      /* */
    }
  }

  getHtml() {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body {
    padding: 14px;
    font-family: var(--vscode-font-family, system-ui, -apple-system, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background-color: var(--vscode-sideBar-background);
  }
  .section {
    margin-bottom: 24px;
  }
  h3 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    border-bottom: 1px solid var(--vscode-sideBar-border, rgba(255,255,255,0.08));
    padding-bottom: 6px;
  }
  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: 1px solid transparent;
    padding: 8px 12px;
    text-align: center;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 10px;
    font-weight: 500;
    font-size: 12px;
    transition: all 0.2s ease;
  }
  .btn:hover {
    background: var(--vscode-button-hoverBackground);
  }
  .btn:active {
    transform: scale(0.98);
  }
  .btn.ghost {
    background: transparent;
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-button-background);
  }
  .btn.ghost:hover {
    background: rgba(99, 102, 241, 0.1);
  }
  .status-card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-sideBar-border, rgba(255,255,255,0.08));
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
  }
  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
  }
  .status-row:last-child {
    margin-bottom: 0;
  }
  .status-val {
    font-weight: 600;
  }
  .indicator {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    background-color: var(--vscode-testing-iconUnpublishedColor, #888);
  }
  .indicator.online {
    background-color: var(--vscode-testing-iconPassedColor, #2ecc71);
    box-shadow: 0 0 6px var(--vscode-testing-iconPassedColor, #2ecc71);
  }
  .indicator.offline {
    background-color: var(--vscode-testing-iconFailedColor, #e74c3c);
    box-shadow: 0 0 6px var(--vscode-testing-iconFailedColor, #e74c3c);
  }
</style>
</head>
<body>
  <div class="section">
    <h3>Быстрый доступ</h3>
    <button class="btn" id="openSettings">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9.1 1.7L9 2.5c-.2.1-.4.2-.6.3L7.7 2.3l-.7.7.5.7c-.1.2-.2.4-.3.6L6.5 7h-.8v1h.8l.1.6c.1.2.2.4.3.6l-.5.7.7.7.7-.5c.2.1.4.2.6.3l.1.8h1l.1-.8c.2-.1.4-.2.6-.3l.7.5.7-.7-.5-.7c.1-.2.2-.4.3-.6l.8-.1v-1h-.8l-.1-.6c-.1-.2-.2-.4-.3-.6l.5-.7-.7-.7-.7.5c-.2-.1-.4-.2-.6-.3l-.1-.8h-1zm.4 4.8c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5.7-1.5 1.5-1.5z"/></svg>
      Панель настроек
    </button>
    <button class="btn ghost" id="openChat">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 2H1.5C.7 2 0 2.7 0 3.5V11c0 .8.7 1.5 1.5 1.5H12l3.5 3V3.5c0-.8-.7-1.5-1.5-1.5z"/></svg>
      Чат ассистента
    </button>
  </div>
  
  <div class="section">
    <h3>Статус Эвокода</h3>
    <div class="status-card">
      <div class="status-row">
        <span>Ядро Core:</span>
        <span class="status-val" style="display: flex; align-items: center;">
          <span class="indicator" id="coreIndicator"></span>
          <span id="coreStatus">...</span>
        </span>
      </div>
      <div class="status-row">
        <span>Активная LLM:</span>
        <span class="status-val" id="activeModel" style="color: var(--vscode-textLink-foreground);">...</span>
      </div>
    </div>
    
    <button class="btn ghost" id="syncSkills">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.6 2.3c-1.2-1.2-2.9-2-4.6-2-3.3 0-6.1 2.3-6.8 5.4H3.8c.6-2.3 2.7-4 5.2-4 1.4 0 2.7.6 3.6 1.5L11 5h4.5V.5L13.6 2.3zm-11.2 11.4c1.2 1.2 2.9 2 4.6 2 3.3 0 6.1-2.3 6.8-5.4H12.2c-.6 2.3-2.7 4-5.2 4-1.4 0-2.7-.6-3.6-1.5L5 11H.5v4.5l1.9-1.8z"/></svg>
      Синхронизировать навыки
    </button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('openSettings').onclick = () => vscode.postMessage({ type: 'openSettings' });
    document.getElementById('openChat').onclick = () => vscode.postMessage({ type: 'openChat' });
    document.getElementById('syncSkills').onclick = () => vscode.postMessage({ type: 'syncSkills' });

    window.addEventListener('message', (e) => {
      const state = e.data;
      if (state.type === 'state') {
        const indicator = document.getElementById('coreIndicator');
        const status = document.getElementById('coreStatus');
        
        if (state.coreOnline) {
          indicator.className = 'indicator online';
          status.textContent = 'В сети';
          status.style.color = 'var(--vscode-testing-iconPassedColor, #2ecc71)';
        } else {
          indicator.className = 'indicator offline';
          status.textContent = 'Не в сети';
          status.style.color = 'var(--vscode-testing-iconFailedColor, #e74c3c)';
        }
        
        document.getElementById('activeModel').textContent = state.activeModel || 'локальная';
      }
    });
  </script>
</body>
</html>`;
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
  const channel = vscode.window.createOutputChannel('Эвокод');
  context.subscriptions.push(channel);
  const log = (msg) => {
    const line = `[evocode] ${msg}`;
    console.log(line);
    channel.appendLine(line);
  };
  log('activate product shell');

  // Инициализируем и очищаем директорию временных артефактов
  const artifactDir = path.join(os.homedir(), '.config', 'evocode', 'artifacts');
  try {
    if (fs.existsSync(artifactDir)) {
      const files = fs.readdirSync(artifactDir);
      for (const f of files) {
        try {
          fs.unlinkSync(path.join(artifactDir, f));
        } catch { /* ignore */ }
      }
    } else {
      fs.mkdirSync(artifactDir, { recursive: true });
    }
    log(`Инициализирована папка временных артефактов: ${artifactDir}`);
  } catch (err) {
    log(`Ошибка создания папки артефактов: ${err.message}`);
  }

  // Создаем FileSystemWatcher для авто-открытия новых файлов
  let isProcessingWatcher = false;
  try {
    const watcher = fs.watch(artifactDir, async (eventType, filename) => {
      if (eventType === 'rename' && filename && !isProcessingWatcher) {
        isProcessingWatcher = true;
        setTimeout(() => { isProcessingWatcher = false; }, 300); // Debounce
        
        const filePath = path.join(artifactDir, filename);
        if (fs.existsSync(filePath)) {
          log(`Обнаружен новый артефакт: ${filename}`);
          const uri = vscode.Uri.file(filePath);
          try {
            await vscode.commands.executeCommand('vscode.openWith', uri, 'evocode.htmlPreview', {
              viewColumn: vscode.ViewColumn.Beside,
              preserveFocus: true
            });
            log(`Артефакт ${filename} успешно открыт справа`);
          } catch (e) {
            log(`Ошибка авто-открытия артефакта ${filename}: ${e.message}`);
          }
        }
      }
    });
    context.subscriptions.push({ dispose: () => watcher.close() });
  } catch (err) {
    log(`Ошибка инициализации fs.watch: ${err.message}`);
  }

  const deps = {
    ensureCore: () => ensureCore(log),
    startDefaultModel: () => startDefaultModel(log),
    startFimModel: () => startFimModel(log),
    focusAgent,
    channel,
  };

  const openProduct = () => ProductPanel.open(context, cfg, deps);

  /** Единые настройки = product panel (модели + агент + программа) */
  async function openIdeSettings() {
    openProduct();
  }

  /** Proxy to agent features as native app commands (no Kilo chrome) */
  async function runAgentCmd(id, fallbackMsg) {
    try {
      await vscode.commands.executeCommand(id);
    } catch (e) {
      vscode.window.showWarningMessage(
        fallbackMsg || `Эвокод: команда недоступна (${id}). Агент установлен?`,
      );
      log(`cmd fail ${id}: ${e.message}`);
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('evocode.shell.openProduct', openProduct),
    vscode.commands.registerCommand('evocode.shell.models', openProduct),
    vscode.commands.registerCommand('evocode.shell.settings', openIdeSettings),
    vscode.commands.registerCommand('evocode.shell.openIdeSettings', openIdeSettings),
    vscode.commands.registerCommand('evocode.shell.focusAgent', async () => {
      const used = await focusAgent();
      if (!used) {
        vscode.window.showWarningMessage('Эвокод: чат агента не найден.');
        openProduct();
      }
    }),
    vscode.commands.registerCommand('evocode.shell.agentManager', () =>
      runAgentCmd('evocode-agent.new.agentManagerOpen', 'Менеджер агентов недоступен'),
    ),
    // Profile/settings of agent → single product settings UI (no Kilo settings webview)
    vscode.commands.registerCommand('evocode.shell.profile', () => {
      openProduct();
    }),
    // Never expose marketplace
    vscode.commands.registerCommand('evocode.shell.ensureCore', async () => {
      const r = await ensureCore(log);
      vscode.window.showInformationMessage(
        r.online ? `Core OK :${r.port}` : `Core offline :${r.port}`,
      );
    }),
    vscode.commands.registerCommand('evocode.shell.showStatus', async () => {
      openProduct();
    }),
    vscode.commands.registerCommand('evocode.shell.startDefaultModel', async () => {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Эвокод: запуск coder…' },
        async () => {
          await ensureCore(log);
          const r = await startDefaultModel(log);
          vscode.window.showInformationMessage(r.message || JSON.stringify(r));
        },
      );
    }),
    vscode.commands.registerCommand('evocode.shell.startFimModel', async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Эвокод: запуск FIM / autocomplete (лёгкая)…',
        },
        async () => {
          await ensureCore(log);
          const r = await startFimModel(log);
          vscode.window.showInformationMessage(
            `FIM: ${r.message || (r.ok !== false ? 'OK' : JSON.stringify(r))}`,
          );
        },
      );
    }),
    vscode.commands.registerCommand('evocode.shell.installDesktop', async () => {
      try {
        installDesktopEntry(log);
        vscode.window.showInformationMessage(
          'Эвокод: ярлык установлен. Ищите «Эвокод» (не VS Code).',
        );
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'evocode.shell.settingsView',
      new SettingsViewProvider(context, cfg, deps)
    ),
    HtmlPreviewEditorProvider.register(context)
  );

  // Status bar = product entry, not "extension"
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
  item.text = '$(rocket) Эвокод';
  item.tooltip = 'Панель управления Эвокод: модели, агент, Core, навыки';
  item.command = 'evocode.shell.openProduct';
  item.show();
  context.subscriptions.push(item);

  // Open Folder shortcut to address Issue #2
  const folderItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 990);
  const updateFolderItem = () => {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      const name = folders[0].name;
      folderItem.text = `$(folder-opened) ${name}`;
      folderItem.tooltip = `Рабочая папка: ${folders[0].uri.fsPath} (нажмите, чтобы сменить)`;
    } else {
      folderItem.text = '$(folder) Открыть папку';
      folderItem.tooltip = 'Открыть рабочую папку проекта';
    }
  };
  folderItem.command = 'workbench.action.files.openFolder';
  folderItem.show();
  context.subscriptions.push(folderItem);
  updateFolderItem();

  // Watch for workspace changes to update status bar
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => updateFolderItem())
  );

  const refreshStatus = async () => {
    try {
      const port = corePort(cfg());
      const h = await healthCheck(port);
      if (!h.ok) {
        item.text = '$(warning) Эвокод · Core';
        item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        return;
      }
      try {
        const rt = await httpJson('GET', '/v1/runtime', null, port, 4000);
        item.text = rt.json?.localReady
          ? `$(rocket) Эвокод · ${rt.json.activeChatProfile || 'local'}`
          : '$(circle-outline) Эвокод · нет LLM';
        item.backgroundColor = undefined;
      } catch {
        item.text = '$(rocket) Эвокод';
      }
    } catch {
      /* */
    }
  };
  refreshStatus();
  const t = setInterval(refreshStatus, 12000);
  context.subscriptions.push({ dispose: () => clearInterval(t) });

  // Boot sequence: Core → dismiss VS Code chat → product panel → optional model
  if (cfg().get('autoStartCore') !== false) {
    await ensureCore(log);
  }
  await dismissBuiltinChat(log);

  if (cfg().get('autoStartDefaultModel') !== false) {
    setTimeout(async () => {
      try {
        if (context.globalState.get(AUTO_MODEL_KEY) === 'running') return;
        await context.globalState.update(AUTO_MODEL_KEY, 'running');
        const r = await startDefaultModel(log);
        log(`auto model: ${r.message || JSON.stringify(r)}`);
        await context.globalState.update(AUTO_MODEL_KEY, undefined);
        refreshStatus();
      } catch (e) {
        log(`auto model: ${e.message}`);
        await context.globalState.update(AUTO_MODEL_KEY, undefined);
      }
    }, 2000);
  }

  // Dual-model: лёгкий FIM (Neurocontrol) после chat — не делит VRAM (CPU -ngl 0)
  if (cfg().get('autoStartFimModel') !== false) {
    setTimeout(async () => {
      try {
        const r = await startFimModel(log);
        log(`auto FIM: ${r.message || JSON.stringify(r)}`);
        refreshStatus();
      } catch (e) {
        log(`auto FIM: ${e.message}`);
      }
    }, 8000);
  }

  // Default: open Эвокод chat on startup
  if (cfg().get('autoFocusAgent') !== false) {
    const tryFocus = async (attempt) => {
      const used = await focusAgent();
      if (used) {
        log(`chat open: ${used}`);
        return;
      }
      if (attempt < 6) setTimeout(() => tryFocus(attempt + 1), 700 * attempt);
      else log('chat open failed — Ctrl+L');
    };
    setTimeout(() => tryFocus(1), 500);
  }

  // Optional models panel after chat
  if (cfg().get('openProductOnStartup') === true) {
    setTimeout(() => openProduct(), 2000);
  }

  const first = context.globalState.get(FIRST_RUN_KEY);
  if (!first && cfg().get('showWelcome') !== false) {
    const startWizard = await vscode.window.showInformationMessage(
      'Добро пожаловать в Эвокод! Хотите выполнить быструю настройку среды (модели, ярлыки, навыки)?',
      'Начать настройку',
      'Ярлык Ubuntu',
      'Пропустить'
    );

    if (startWizard === 'Ярлык Ubuntu') {
      try {
        installDesktopEntry(log);
        vscode.window.showInformationMessage('Ярлык «Эвокод» установлен');
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
      await context.globalState.update(FIRST_RUN_KEY, true);
    } else if (startWizard === 'Начать настройку') {
      // Step 1: Model
      const step1 = await vscode.window.showInformationMessage(
        'Шаг 1/2: Запустить локальную модель Coder (27B) по умолчанию?',
        'Запустить',
        'Пропустить'
      );
      if (step1 === 'Запустить') {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Эвокод: Запуск Coder (llama-server)…' },
          async () => {
            try {
              await ensureCore(log);
              const r = await startDefaultModel(log);
              vscode.window.showInformationMessage(`Модель: ${r.message || 'успешно запущена'}`);
            } catch (e) {
              vscode.window.showErrorMessage(`Ошибка запуска модели: ${e.message}`);
            }
          }
        );
      }

      // Step 2: Skill sync
      const step2 = await vscode.window.showInformationMessage(
        'Шаг 2/2: Синхронизировать библиотеки системных навыков Эвокод?',
        'Синхронизировать',
        'Пропустить'
      );
      if (step2 === 'Синхронизировать') {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Эвокод: Синхронизация навыков с Core…' },
          async () => {
            try {
              const port = corePort(cfg());
              const res = await httpJson('POST', '/v1/skills/sync', {}, port, 60000);
              const count = (res.json?.newSkills?.length || 0) + (res.json?.changedSkills?.length || 0);
              vscode.window.showInformationMessage(`Синхронизировано навыков: ${count}`);
            } catch (e) {
              vscode.window.showErrorMessage(`Ошибка синхронизации навыков: ${e.message}`);
            }
          }
        );
      }

      // Done
      await context.globalState.update(FIRST_RUN_KEY, true);
      const finished = await vscode.window.showInformationMessage(
        'Настройка Эвокод успешно завершена! Открыть панель управления?',
        'Открыть настройки',
        'Понятно'
      );
      if (finished === 'Открыть настройки') {
        openProduct();
      }
    } else if (startWizard === 'Пропустить') {
      await context.globalState.update(FIRST_RUN_KEY, true);
    }
  }
}

class HtmlPreviewEditorProvider {
  static register(context) {
    const provider = new HtmlPreviewEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      'evocode.htmlPreview',
      provider
    );
    return providerRegistration;
  }

  constructor(context) {
    this.context = context;
  }

  async resolveCustomTextEditor(document, webviewPanel, token) {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.dirname(document.uri.fsPath)),
        this.context.extensionUri
      ]
    };

    const updateWebview = () => {
      webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);
    };

    updateWebview();

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        updateWebview();
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  getHtmlForWebview(webview, document) {
    const fileUri = document.uri;
    const fileDir = vscode.Uri.file(path.dirname(fileUri.fsPath));
    const baseUri = webview.asWebviewUri(fileDir);
    const rawContent = document.getText();

    if (fileUri.fsPath.endsWith('.md')) {
      const escaped = rawContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      let html = escaped;
      html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
      html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      html = html.replace(/`(.*?)`/g, '<code>$1</code>');
      html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      html = html.replace(/\n/g, '<br>');

      return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <base href="${baseUri}/">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
      color: var(--vscode-editor-foreground, #333333);
      background-color: var(--vscode-editor-background, #ffffff);
    }
    h1, h2, h3, h4 {
      color: var(--vscode-editor-foreground, #111111);
      margin-top: 24px;
      margin-bottom: 12px;
      font-weight: 600;
    }
    h1 { font-size: 2.2em; border-bottom: 1px solid var(--vscode-panel-border, #eaecef); padding-bottom: 8px; }
    h2 { font-size: 1.6em; border-bottom: 1px solid var(--vscode-panel-border, #eaecef); padding-bottom: 6px; }
    h3 { font-size: 1.3em; }
    p { margin-bottom: 16px; }
    code {
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      background-color: var(--vscode-textBlockCodeBlock-background, rgba(27,31,35,0.05));
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 85%;
    }
    pre {
      padding: 16px;
      background-color: var(--vscode-textBlockCodeBlock-background, #f6f8fa);
      border-radius: 6px;
      overflow: auto;
      border: 1px solid var(--vscode-panel-border, #eaecef);
    }
    pre code {
      padding: 0;
      background-color: transparent;
      font-size: 100%;
    }
    a {
      color: var(--vscode-textLink-foreground, #0366d6);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
    } else {
      let html = rawContent;
      const baseTag = `<base href="${baseUri}/">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
      } else {
        html = baseTag + html;
      }
      return html;
    }
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
