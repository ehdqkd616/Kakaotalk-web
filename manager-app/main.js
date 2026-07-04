'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAX_LOGS = 500;

let win = null;
const procs = { server: null, client: null };
const logBuf = [];

function log(source, type, text) {
  String(text).split('\n').forEach(line => {
    const msg = line.trimEnd();
    if (!msg) return;
    const entry = { t: new Date().toLocaleTimeString('ko-KR'), source, type, msg };
    logBuf.push(entry);
    if (logBuf.length > MAX_LOGS) logBuf.shift();
    if (win) win.webContents.send('log', entry);
  });
}

function sendStatus() {
  if (win) win.webContents.send('status', { server: !!procs.server, client: !!procs.client });
}

function start(name) {
  if (procs[name]) { log('sys', 'info', '[' + name + '] 이미 실행 중'); return; }
  log('sys', 'info', '[' + name + '] 시작 중...');

  const p = spawn('npm', ['run', 'dev'], {
    cwd: path.join(ROOT, name),
    shell: true,
    windowsHide: true,
  });
  procs[name] = p;

  p.stdout.on('data', d => log(name, 'out', d));
  p.stderr.on('data', d => log(name, 'err', d));
  p.on('close', code => {
    procs[name] = null;
    log('sys', 'info', '[' + name + '] 종료 (code: ' + code + ')');
    sendStatus();
  });
  sendStatus();
}

function stop(name) {
  const p = procs[name];
  if (!p) { log('sys', 'info', '[' + name + '] 실행 중 아님'); return; }
  log('sys', 'info', '[' + name + '] 중지 중...');
  if (process.platform === 'win32') {
    spawn('taskkill', ['/F', '/T', '/PID', String(p.pid)], { shell: true });
  } else {
    p.kill('SIGTERM');
  }
  procs[name] = null;
  sendStatus();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 750,
    minHeight: 500,
    title: 'KakaoTalk Web Manager',
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  win.webContents.on('did-finish-load', () => {
    logBuf.forEach(entry => win.webContents.send('log', entry));
    sendStatus();
  });

  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stop('server');
  stop('client');
  app.quit();
});

// IPC
ipcMain.on('start', (_, name) => {
  if (name === 'all') { start('server'); start('client'); }
  else start(name);
});

ipcMain.on('stop', (_, name) => {
  if (name === 'all') { stop('server'); stop('client'); }
  else stop(name);
});

ipcMain.on('open-url', (_, url) => shell.openExternal(url));
