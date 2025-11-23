const { app, BrowserWindow, WebContentsView, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const JSZip = require("jszip");
const { exec } = require("child_process");
const remoteMain = require('@electron/remote/main');
const extractPath = path.join(app.getPath("temp"), "lmninstaller");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

let isRunningFatalScripts = false;
/** @type {BrowserWindow} */
let win;

ipcMain.handle("minimize", () => {
    win.minimize();
});

async function open() {
    const createWindow = () => {
        win = new BrowserWindow({
            frame: false,
            width: 800,
            height: 450,
            minHeight: 450,
            minWidth: 800,
            transparent: true,
            webPreferences: {
                webviewTag: true,
                sandbox: false,
                contextIsolation: false,
                preload: path.join(__dirname, "preload.js"),
            },
        });

        remoteMain.enable(win.webContents);

        win.on('close', (event) => {
            console.log(isRunningFatalScripts);
            if (isRunningFatalScripts) {
                event.preventDefault();
            }
        });
        app.on('before-quit', (event) => {
            console.log(isRunningFatalScripts);
            if (isRunningFatalScripts) {
                event.preventDefault();
            }else {
                fs.emptyDirSync(extractPath);
                fs.removeSync(extractPath);
            }
        });

        win.loadFile("pages/index.html");
        win.setMenuBarVisibility(false);
        win.show();
        async function unzipAndRun() {
        
            let result = null;
            function progresschangelistener(text) {
                win.webContents.executeJavaScript(`window.progresschangelistener("${text}")`)
            }
            try {
                progresschangelistener("reading files...");
                await fs.ensureDir(extractPath);
        
                const data = await fs.readFile(path.join(__dirname, "installer.zip"));
        
                const zip = await JSZip.loadAsync(data);
        
                progresschangelistener("extracting installer...");
                for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
                    const destPath = path.join(extractPath, relativePath);
                    
                    if (zipEntry.dir) {
                        fs.mkdirSync(destPath, { recursive: true });
                    } else {
                        fs.mkdirSync(path.dirname(destPath), { recursive: true });
                        const content = await zipEntry.async('nodebuffer');
                        fs.writeFileSync(destPath, content);
                    }
                }
        
                progresschangelistener("checking files...");
                const executablePath = path.join(extractPath, config.executablename);
        
                await new Promise((resolve) => {
                    const interval = setInterval(() => {
                        if (fs.existsSync(executablePath)) {
                            clearInterval(interval);
                            resolve();
                        }
                    }, 100);
                });
        
                isRunningFatalScripts = true;
                progresschangelistener("fns");
                const installProcess = exec(`"${executablePath}"`, {});
        
                installProcess.on('error', (err) => {
                    console.error('Error starting installation:', err);
                })
        
                installProcess.on("close", (code) => {
                    fs.emptyDirSync(extractPath);
                    fs.removeSync(extractPath);
        
                    isRunningFatalScripts = false;
                    app.quit();
                });
            } catch (error) {
                console.error(`Installation failed with error: ${error}`);
                result = `install failed with error ${error}`;
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
        
        unzipAndRun();
        win.on("resize", (e) => {
        });
    };
    app.setName("lemon installer");
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
