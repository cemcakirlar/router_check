const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pyServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "ZTE Router Dashboard",
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Launch the python server (as a child process)
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

  console.log(`📡 Starting Python backend: ${pyProcess} ${pyArgs.join(' ')}`);
  pyServer = spawn(pyProcess, pyArgs);

  pyServer.stdout.on('data', (data) => {
    console.log(`🐍 Python: ${data}`);
  });

  pyServer.stderr.on('data', (data) => {
    console.error(`🐍 Python Error: ${data}`);
  });

  // Poll the server until it starts before loading the dashboard
  const loadDashboard = () => {
    const http = require('http');
    const checkServer = () => {
      http.get('http://localhost:8080', (res) => {
        console.log("📡 Backend is ready, loading UI...");
        mainWindow.loadURL('http://localhost:8080');
      }).on('error', () => {
        console.log("⏳ Waiting for backend...");
        setTimeout(checkServer, 200);
      });
    };
    checkServer();
  };

  loadDashboard();

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (pyServer) pyServer.kill();
  });
}

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
