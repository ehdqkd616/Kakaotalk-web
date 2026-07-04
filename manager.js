'use strict';

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9000;
const ROOT = __dirname;
const MAX_LOGS = 500;

const procs = { server: null, client: null };
const sse = new Set();
const logs = [];

function log(source, type, text) {
  String(text).split('\n').forEach(line => {
    const msg = line.trimEnd();
    if (!msg) return;
    const entry = { t: new Date().toLocaleTimeString('ko-KR'), source, type, msg };
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();
    const data = 'data: ' + JSON.stringify(entry) + '\n\n';
    sse.forEach(r => r.write(data));
  });
}

const SVC = {
  server: path.join(ROOT, 'server'),
  client: path.join(ROOT, 'client'),
};

function start(name) {
  if (procs[name]) { log('sys', 'info', '[' + name + '] 이미 실행 중'); return; }
  log('sys', 'info', '[' + name + '] 시작 중...');
  const p = spawn('npm', ['run', 'dev'], {
    cwd: SVC[name],
    shell: true,
    windowsHide: true,
  });
  procs[name] = p;
  p.stdout.on('data', d => log(name, 'out', d));
  p.stderr.on('data', d => log(name, 'err', d));
  p.on('close', code => {
    procs[name] = null;
    log('sys', 'info', '[' + name + '] 종료 (code: ' + code + ')');
  });
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
}

const HTML = fs.readFileSync(path.join(ROOT, 'manager.html'));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const m = req.method;

  if (p === '/' && m === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(HTML);
  }

  if (p === '/logs' && m === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    logs.forEach(e => res.write('data: ' + JSON.stringify(e) + '\n\n'));
    sse.add(res);
    req.on('close', () => sse.delete(res));
    return;
  }

  if (p === '/status' && m === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ server: !!procs.server, client: !!procs.client }));
  }

  if (m === 'POST') {
    if      (p === '/start')         { start('server'); start('client'); }
    else if (p === '/stop')          { stop('server');  stop('client');  }
    else if (p === '/start/server')  start('server');
    else if (p === '/start/client')  start('client');
    else if (p === '/stop/server')   stop('server');
    else if (p === '/stop/client')   stop('client');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end('{"ok":true}');
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  const url = 'http://localhost:' + PORT;
  console.log('\n  KakaoTalk Web Manager → ' + url + '\n');
  const opener = process.platform === 'win32' ? 'start'
               : process.platform === 'darwin' ? 'open'
               : 'xdg-open';
  spawn(opener, [url], { shell: true });
});

function cleanup() {
  stop('server');
  stop('client');
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
