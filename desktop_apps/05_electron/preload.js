const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    bootstrapApp: () => ipcRenderer.send('bootstrap-app'),

    onBootstrapStatus: (callback) => ipcRenderer.on('bootstrap-status', (event, value) => callback(value)),
    onCleanupStatus: (callback) => ipcRenderer.on('cleanup-status', (event, value) => callback(value))
});
