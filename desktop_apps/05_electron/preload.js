const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    restartServer: () => ipcRenderer.send('restart-server')
});
