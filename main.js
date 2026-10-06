const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');

let server;

function startServer() {
  const expressApp = express();
  expressApp.use(express.static(path.join(__dirname, 'dist')));
  server = expressApp.listen(3000);
}

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

  win.loadURL('http://localhost:3000');
}

app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});
