const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.join(__dirname, '..');
let mainWindow = null;
let tray = null;
const procs = { server: null, client: null };

// ── .env 파싱 ────────────────────────────────────────────────────────────────
function parseEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  const env = {};
  try {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return;
      const i = t.indexOf('=');
      if (i === -1) return;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    });
  } catch {}
  return env;
}

// ── 프로세스 관리 ─────────────────────────────────────────────────────────────
function killPort(port) {
  try {
    execSync(
      `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`,
      { stdio: 'ignore' }
    );
  } catch {}
}

function startProcess(type) {
  if (procs[type]) return;

  const port = type === 'server' ? 4000 : 3000;
  killPort(port);

  const cwd = path.join(ROOT_DIR, type === 'server' ? 'server' : 'client');
  const envVars = parseEnv();

  const proc = spawn('npm', ['run', 'dev'], {
    cwd,
    shell: true,
    env: { ...process.env, ...envVars }
  });

  procs[type] = proc;

  proc.stdout.on('data', d => sendLog(type, 'stdout', d.toString()));
  proc.stderr.on('data', d => sendLog(type, 'stderr', d.toString()));
  proc.on('exit', code => {
    sendLog(type, 'info', `프로세스 종료 (exit code: ${code ?? '?'})`);
    procs[type] = null;
    broadcastStatus();
    updateTray();
  });

  broadcastStatus();
  updateTray();
}

function stopProcess(type) {
  const proc = procs[type];
  if (!proc) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${proc.pid} /f /t`, { stdio: 'ignore' });
    } else {
      proc.kill('SIGTERM');
    }
  } catch {}
  procs[type] = null;
  broadcastStatus();
  updateTray();
}

function getStatus() {
  return { server: !!procs.server, client: !!procs.client };
}

function broadcastStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status', getStatus());
  }
}

function sendLog(source, type, message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log', {
      source, type, message,
      timestamp: new Date().toISOString()
    });
  }
}

// ── 시스템 트레이 ─────────────────────────────────────────────────────────────
function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: '관리자 열기',
      click: () => { mainWindow.show(); mainWindow.focus(); }
    },
    { type: 'separator' },
    {
      label: procs.server ? '■ 서버 중지' : '▶ 서버 시작',
      click: () => procs.server ? stopProcess('server') : startProcess('server')
    },
    {
      label: procs.client ? '■ 클라이언트 중지' : '▶ 클라이언트 시작',
      click: () => procs.client ? stopProcess('client') : startProcess('client')
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        stopProcess('server');
        stopProcess('client');
        app.exit(0);
      }
    }
  ]);
}

function updateTray() {
  if (tray) tray.setContextMenu(buildTrayMenu());
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico');
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // 아이콘 파일 없을 때 노란색 32×32 기본 아이콘
    const buf = Buffer.alloc(32 * 32 * 4);
    for (let i = 0; i < 32 * 32; i++) {
      buf[i * 4]     = 254; // R
      buf[i * 4 + 1] = 229; // G
      buf[i * 4 + 2] = 0;   // B
      buf[i * 4 + 3] = 255; // A
    }
    icon = nativeImage.createFromBuffer(buf, { width: 32, height: 32 });
  }

  tray = new Tray(icon);
  tray.setToolTip('KakaoTalk Web 관리자');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : (mainWindow.show(), mainWindow.focus());
  });
}

// ── 메인 윈도우 ───────────────────────────────────────────────────────────────
function createWindow() {
  const iconPath = path.join(__dirname, 'icon.ico');
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 720,
    minHeight: 520,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    title: 'KakaoTalk Web 관리자',
    backgroundColor: '#1a1a1a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', e => { e.preventDefault(); mainWindow.hide(); });
}

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.handle('start', (_, type) => startProcess(type));
ipcMain.handle('stop',  (_, type) => stopProcess(type));
ipcMain.handle('status', () => getStatus());
ipcMain.handle('open-url', (_, url) => shell.openExternal(url));

// ── 앱 시작 ───────────────────────────────────────────────────────────────────
app.setAppUserModelId('com.kakaotalk.web.admin');

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', e => e.preventDefault());
app.on('before-quit', () => {
  stopProcess('server');
  stopProcess('client');
});
