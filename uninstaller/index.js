const { app, BrowserWindow, WebContentsView, ipcMain } = require("electron");
const path = require("path");
const { exec } = require("child_process");
async function unzipAndRun() {

    let result = null;
    try {
        let totalstdout = "";

        const executablePath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, "uis.exe");

        const installProcess = exec(`"${executablePath}" /S`, {detached: true});

        installProcess.stdout.on("data", (data) => {
            console.log(`stdout: ${data}`);
            totalstdout += data;
        });

        installProcess.stderr.on("data", (data) => {
            console.error(`stderr: ${data}`);
        });

        installProcess.on("close", (code) => {
            if (code === 0) {
                result = "successfully removed the lemon edition";
            }else {
                console.error(`Installation failed with code ${code}`);
                result = `install failed with code ${code}\ntotal stdout:${totalstdout}`;
            }
        });
    } catch (error) {
        console.error(`Installation failed with code ${error}`);
        result = `install failed with errror ${error}`;
    }

    return await new Promise((resolve) => {
        const interval = setInterval(() => {
            if (result !== null) {
                clearInterval(interval);
                resolve(result);
            }
        }, 100);
    });
}
/** @type {BrowserWindow} */
let win;

ipcMain.handle("minimize", () => {
    win.minimize();
});

ipcMain.handle("install", async(...params) => {
    params.shift();
    return await unzipAndRun(...params);
});

async function open() {
    const createWindow = () => {
        win = new BrowserWindow({
            frame: false,
            width: 800,
            height: 400,
            minHeight: 400,
            minWidth: 800,
            transparent: true,
            webPreferences: {
                webviewTag: true,
                sandbox: false,
                contextIsolation: false,
                preload: path.join(__dirname, "preload.js"),
            },
        });

        win.loadFile("pages/index.html");
        win.setMenuBarVisibility(false);
        win.show();
        win.on("resize", (e) => {
        });
    };
    app.setName("lemon uninstaller");
    app.whenReady().then(() => {
        createWindow();
        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });
    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            app.quit();
        }
    });
}

open();
