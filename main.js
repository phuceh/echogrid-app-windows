const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const url = require('url');

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const filePath = request.url.slice('app://'.length);
    const fullPath = path.join(__dirname, 'dist', filePath || 'index.html');
    return net.fetch(url.pathToFileURL(fullPath).toString());
  });

  const win = new BrowserWindow({
    width: 430,
    height: 932,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('app://index.html');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
