const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 430,
    height: 932,
    resizable: false,
    webPreferences: {
      nodeIntegration: false
    }
  });

  win.loadURL(`file://${path.join(__dirname, 'dist/index.html')}`);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
