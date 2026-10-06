const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 430,
    height: 932,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('app://./index.html');
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const filePath = request.url.slice('app://./'.length);
    const fullPath = path.join(__dirname, 'dist', filePath || 'index.html');
    return net.fetch(pathToFileURL(fullPath).toString());
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
