const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        fullscreen: true,
        title: 'Chibi GTA',
        icon: path.join(__dirname, 'src', 'icon.png'),
        backgroundColor: '#000000',
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: false,
        },
        autoHideMenuBar: true,
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
    mainWindow.setMenuBarVisibility(false);

    // F11 toggle fullscreen, ESC exit
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11') {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
    });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
