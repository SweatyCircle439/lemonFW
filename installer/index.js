process.on('uncaughtException', (error) => {
    console.error('An uncaught exception occurred:', error);
});
try {
    const { app, BrowserWindow, WebContentsView, ipcMain } = require("electron");
    const path = require("path");
    const fs = require("fs-extra");
    const JSZip = require("jszip");
    const { exec } = require("child_process");
    const remoteMain = require('@electron/remote/main');
    const extractPath = path.join(app.getPath("documents"), "lmninstaller");
    let isRunningFatalScripts = false;
    async function unzipAndRun(zipFilePath, packedExecutableName) {
    
        let result = null;
        try {
            await fs.ensureDir(extractPath);
    
            const data = await fs.readFile(path.join(__dirname, zipFilePath));
    
            const zip = await JSZip.loadAsync(data);
    
            for (const filename of Object.keys(zip.files)) {
                const fileData = await zip.files[filename].async("nodebuffer");
                await fs.writeFile(path.join(extractPath, filename), fileData);
            }
    
            const executablePath = path.join(extractPath, packedExecutableName);
    
            await new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (fs.existsSync(executablePath)) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });
    
            const manifest = JSON.parse(await fs.readFile(path.join(extractPath, ".lmn")));
    
            isRunningFatalScripts = true;
    
            const { spawn } = require('child_process');
            const installProcess = exec(`"${executablePath}" /S /D="${path.join(app.getPath("appData"), manifest.extract)}"`, {
                detached: true,
                stdio: 'ignore'
            });
    
            installProcess.on('error', (err) => {
                console.error('Error starting installation:', err);
            })
    
            installProcess.on("close", (code) => {
                fs.emptyDirSync(extractPath);
                fs.removeSync(extractPath);
                if (code === 0) {
                    for (const file of fs.readdirSync(path.join(app.getPath("appData"), manifest.extract))) {
                        console.log(file);
                        if (file.toLowerCase().startsWith("Uninstall".toLowerCase())) {
                            fs.moveSync(
                                path.join(app.getPath("appData"), manifest.extract, file),
                                path.join(app.getPath("appData"), manifest.extract, "uis.exe")
                            );
                            fs.copyFileSync(
                                path.join(__dirname, "uninstaller.exe"),
                                path.join(app.getPath("appData"), manifest.extract, file)
                            );
                        }
                    }
                    result = "install finished successfully";
                } else {
                    console.error(`Installation failed with code ${code}`);
                    result = `install failed with code ${code}`;
                }
    
                isRunningFatalScripts = false;
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
                }
            });
    
            win.loadFile("pages/index.html");
            win.setMenuBarVisibility(false);
            win.show();
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
    
} catch (error) {
    console.error(error);
}