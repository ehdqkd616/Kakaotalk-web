const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  start:   type => ipcRenderer.invoke('start', type),
  stop:    type => ipcRenderer.invoke('stop', type),
  status:  ()   => ipcRenderer.invoke('status'),
  openUrl: url  => ipcRenderer.invoke('open-url', url),

  onLog:    cb => ipcRenderer.on('log',    (_, d) => cb(d)),
  onStatus: cb => ipcRenderer.on('status', (_, d) => cb(d))
});
