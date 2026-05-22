const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const net = require('net');

let mainWindow;
let pyServer;
let isQuitting = false;

function checkAndResolvePortConflict() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log("⚠️ Port 8080 is occupied. Attempting conflict recovery...");
        if (process.platform === 'darwin') {
          exec('lsof -t -i tcp:8080', (lsofErr, stdout) => {
            if (lsofErr || !stdout) {
              console.log("⚠️ Port 8080 is occupied, but lsof returned no PIDs or failed.");
              resolve(false);
              return;
            }
            const pids = stdout.trim().split('\n').filter(Boolean);
            console.log(`🔍 Found PIDs using port 8080: ${pids}`);
            let killPromises = pids.map(pid => {
              return new Promise((r) => {
                console.log(`💀 Killing PID: ${pid}`);
                exec(`kill -9 ${pid}`, () => r());
              });
            });
            Promise.all(killPromises).then(() => {
              // Wait for OS to release socket
              setTimeout(() => {
                const recheckServer = net.createServer();
                recheckServer.once('error', (recheckErr) => {
                  if (recheckErr.code === 'EADDRINUSE') {
                    reject(new Error("Port 8080 is still occupied after kill attempt."));
                  } else {
                    resolve(true);
                  }
                });
                recheckServer.once('listening', () => {
                  recheckServer.close(() => resolve(true));
                });
                recheckServer.listen(8080, '0.0.0.0');
              }, 800);
            });
          });
        } else {
          resolve(false);
        }
      } else {
        reject(err);
      }
    });
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(8080, '0.0.0.0');
  });
}

function emitStatus(status, message, percentage) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('bootstrap-status', { status, message, percentage });
  }
  console.log(`📢 Bootstrap Status [${percentage}%]: ${message} (${status})`);
}

async function probeSidecar() {
  const http = require('http');
  for (let i = 0; i < 30; i++) {
    const connected = await new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:8080', (res) => {
        resolve(true);
      });
      req.on('error', () => {
        resolve(false);
      });
      req.setTimeout(200, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (connected) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function startSidecarInternal() {
  if (pyServer) {
    pyServer.kill();
    await new Promise((r) => setTimeout(r, 500));
  }

  const isDev = !app.isPackaged;
  let pyProcess;
  let pyArgs = [];

  if (isDev) {
    console.log("🚀 Running in Development mode");
    pyProcess = 'python3';
    pyArgs = [path.join(__dirname, 'server.py')];
  } else {
    console.log("🚀 Running in Production mode");
    // Path inside the bundled app resources
    pyProcess = path.join(process.resourcesPath, 'bin', 'server-macos');
    pyArgs = [process.resourcesPath];
  }

  console.log(`📡 Starting Python backend sidecar: ${pyProcess} ${pyArgs.join(' ')}`);
  pyServer = spawn(pyProcess, pyArgs);

  pyServer.stdout.on('data', (data) => {
    console.log(`🐍 Python: ${data.toString().trim()}`);
  });

  pyServer.stderr.on('data', (data) => {
    console.error(`🐍 Python Error: ${data.toString().trim()}`);
  });
}

async function bootstrapApp() {
  try {
    // 1. Conflict Check
    emitStatus("conflict_check", "Checking for port conflicts on port 8080...", 20);
    
    try {
      const killedAny = await checkAndResolvePortConflict();
      if (killedAny) {
        emitStatus("conflict_check", "Port conflict found and resolved.", 35);
      } else {
        emitStatus("conflict_check", "Port 8080 is clear.", 35);
      }
    } catch (e) {
      emitStatus("conflict_check", `Warning during conflict check: ${e.message}`, 35);
    }

    // 2. Spawning Sidecar
    emitStatus("spawning", "Spawning Python sidecar...", 50);
    await startSidecarInternal();

    // 3. Probing Sidecar
    emitStatus("probing", "Probing proxy server on port 8080...", 70);
    let success = await probeSidecar();

    if (!success) {
      // Attempt recovery
      emitStatus("recovery", "Sidecar unresponsive. Attempting recovery restart...", 80);
      if (pyServer) {
        pyServer.kill();
        await new Promise((r) => setTimeout(r, 500));
      }
      
      try {
        await checkAndResolvePortConflict();
      } catch (e) {}

      await startSidecarInternal();
      emitStatus("probing", "Probing sidecar again after restart...", 85);
      success = await probeSidecar();
    }

    if (success) {
      emitStatus("ready", "Proxy server is ready and responsive!", 100);
    } else {
      emitStatus("failed", "Proxy server failed to respond on port 8080.", 100);
    }
  } catch (err) {
    emitStatus("failed", `Bootstrap error: ${err.message}`, 100);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "ZTE Router Dashboard",
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const indexPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'index.html') 
    : path.join(__dirname, 'index.html');

  mainWindow.loadFile(indexPath);

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      isQuitting = true;
      
      // Notify UI that teardown has started
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cleanup-status', 'teardown_started');
      }
      
      // Run async teardown
      setTimeout(async () => {
        // Kill the sidecar process
        if (pyServer) {
          console.log("🧹 Terminating sidecar process during app exit...");
          pyServer.kill();
          await new Promise((r) => setTimeout(r, 800));
        }
        
        // Double-check conflict cleanup to be absolutely sure port is clean
        try {
          await checkAndResolvePortConflict();
        } catch (err) {}
        
        // Notify UI that teardown is complete
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('cleanup-status', 'teardown_complete');
        }
        
        setTimeout(() => {
          app.quit();
        }, 300);
      }, 600);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('bootstrap-app', () => {
  console.log("🚀 Bootstrap request received from UI via Electron IPC");
  bootstrapApp();
});

ipcMain.on('restart-server', () => {
  console.log("🔄 Restart request received from UI via Electron IPC");
  bootstrapApp();
});

ipcMain.on('stop-server', () => {
  if (pyServer) {
    pyServer.kill();
    pyServer = null;
    console.log("🛑 Python sidecar stopped via Electron IPC");
  } else {
    console.log("⚠️ Stop requested but no running sidecar found");
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (pyServer) pyServer.kill();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
