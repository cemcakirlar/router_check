const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    bootstrapApp: () => ipcRenderer.send('bootstrap-app'),
    restartServer: () => ipcRenderer.send('restart-server'),
    stopServer: () => ipcRenderer.send('stop-server'),
    onBootstrapStatus: (callback) => ipcRenderer.on('bootstrap-status', (event, value) => callback(value)),
    onCleanupStatus: (callback) => ipcRenderer.on('cleanup-status', (event, value) => callback(value))
});
