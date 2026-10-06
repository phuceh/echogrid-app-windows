const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

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

  win.loadFile(path.join(__dirname, 'dist/index.html'));
}

app.whenReady().then(() => {
  protocol.interceptFileProtocol('file', (request, callback) => {
    let url = request.url.substr(7);
    url = decodeURIComponent(url);
    if (!fs.existsSync(url)) {
      const distPath = path.join(__dirname, 'dist', url.split('/dist/').pop() || '');
      callback({ path: distPath });
    } else {
      callback({ path: url });
    }
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
