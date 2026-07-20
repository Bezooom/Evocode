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
  const live = await healthCheck(port);
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
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const h = await healthCheck(port);
    if (h.ok) return { started: true, online: true, port, health: h.json };
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

  const deps = {
    ensureCore: () => ensureCore(log),
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

  // Extra status bar items = native toolbar feel
  const mkItem = (text, cmd, tip, prio) => {
    const it = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, prio);
    it.text = text;
    it.command = cmd;
    it.tooltip = tip;
    it.show();
    context.subscriptions.push(it);
    return it;
  };
  mkItem('$(organization) Агенты', 'evocode.shell.agentManager', 'Менеджер агентов', 990);
  mkItem('$(account) Профиль', 'evocode.shell.profile', 'Профиль', 980);
  mkItem('$(settings-gear) Настройки', 'evocode.shell.openIdeSettings', 'Параметры Эвокод', 970);
  mkItem('$(server-process) Модели', 'evocode.shell.openProduct', 'Local LLM', 960);

  // Status bar = product entry, not "extension"
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
  item.text = '$(rocket) Эвокод';
  item.tooltip = 'Настройки программы: модели, агент, Core';
  item.command = 'evocode.shell.openProduct';
  item.show();
  context.subscriptions.push(item);

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

function deactivate() {}

module.exports = { activate, deactivate };
