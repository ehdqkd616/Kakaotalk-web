'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  start:     (name) => ipcRenderer.send('start', name),
  stop:      (name) => ipcRenderer.send('stop', name),
  openUrl:   (url)  => ipcRenderer.send('open-url', url),
  onLog:     (cb)   => ipcRenderer.on('log',    (_, e) => cb(e)),
  onStatus:  (cb)   => ipcRenderer.on('status', (_, s) => cb(s)),
});
