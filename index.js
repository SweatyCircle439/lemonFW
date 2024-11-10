const { app, BrowserWindow, WebContentsView, ipcMain } = require("electron");
const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs-extra");
const crypto = require("crypto");
/** @type {BrowserWindow} */
let win;
/** @type {String} */
let currenttab;

/** @type {Tab[]} */
let tabs = [];

/**
 * @param {string} uuid
 * @returns {Tab}
 */

const userAgentPlatform = () => {
    let platform = "X11; Linux x86_64"
    if (process.platform === "win32") {
        platform = "Window NT 10.0; Win64; x64"
    }
    if (process.platform === "darwin") {
        platform = "Macintosh; Intel Mac OS X 10_15_7"
    }
    return platform
}

/** Return the default navigator.userAgent. */
const defaultUseragent = () => {
    const [version] = process.versions.chrome.split(".")
    const sys = userAgentPlatform()
    return `Mozilla/5.0 (${sys}) AppleWebKit/537.36 (KHTML, like Gecko) `
        + `Chrome/${version}.0.0.0 Safari/537.36`
}

async function sendTabUpdate() {
    const result = [];
    try {
        for (const tab of tabs) {
            const tabSP = await tab.view.webContents.executeJavaScript('getTabElementProperties()');
            
            result.push({
                hidden: tab.reserved,
                id: tab.id,
                name: tab.title,
                innerHTML: tabSP.IHTML,
                icon: tab.favicon,
                style: {
                    background: tabSP.style.background,
                    clipPath: tabSP.style.clipPath,
                    hoverBackground: tabSP.style.hoverBackground,
                    hoverClipPath: tabSP.style.hoverClipPath
                },
                css: tabSP.css
            });
        }
    } catch (error) {
        console.error(error);
    }
    // @ts-ignore
    win.webContents.send("tabUpdate", result);
}

function findTab(uuid) {
    // @ts-ignore
    return tabs.find((tab) => tab.id === uuid);
}

ipcMain.handle("sendTabUpdate", sendTabUpdate);

class Tab {
    constructor(properties = {
        url: undefined
    }) {
        sendTabUpdate();
        this.reserved = false;
        this.view = new WebContentsView({
            webPreferences: {
                webviewTag: true,
                sandbox: false,
                contextIsolation: false,
                preload: path.join(__dirname, "webpreload.js"),
            },
        });
        this.view.webContents.setUserAgent(defaultUseragent());
        this.favicon = "";
        this.title = "";
        this.view.webContents.addListener("page-favicon-updated", (_, favicons) => {
            this.favicon = favicons[0];
            sendTabUpdate();
        });
        this.view.webContents.addListener("page-title-updated", (e, title) => {
            this.title = title;
            sendTabUpdate();
        });
        this.view.webContents.addListener("will-navigate", (e) => {
            win.webContents.send("redirect", e.url);
        });
    
        this.view.webContents.loadFile("browser/pages/newtab.html");
        this.setBounds();
        this.id = crypto.randomUUID();
        tabs.push(this);
        this.view.webContents.setWindowOpenHandler((e) => {
            openTab(createTab(e.url));
        });
        if (properties.url) {
            this.loadUrl(properties.url);
        }
    }

    setBounds() {
        this.view.setBounds({
            x: 0,
            y: 87,
            width: win.getBounds().width,
            height: win.getBounds().height - 87,
        });
    }

    async loadUrl(url) {
        if (url.startsWith("lmn://")) {
            const [_, page] = url.split("://");
            await this.view.webContents.loadFile(`browser/pages/${page}.html`);
        } else {
            await this.view.webContents.loadURL(url);
        }
    }

    reserve() {
        sendTabUpdate();
        this.reserved = true;
    }

    unreserve() {
        sendTabUpdate();
        this.reserved = false;
    }
}

let browsername = "lemon FW browser";

/**
 * @type {string[]}
 */
let tldlist = [];
fetch("https://data.iana.org/TLD/tlds-alpha-by-domain.txt")
    .then((res) => res.text())
    .then((text) => {tldlist.push(...text.split("\n"), "LOCAL");});

tldlist.shift();


ipcMain.handle("getBrowserName", async () => {
    return browsername;
});

ipcMain.handle("startFPhost", () => {
    require("./fp/fphost")(app.getPath("documents"));
});

ipcMain.handle("getTldList", () => {
    return tldlist;
});

ipcMain.handle("setBrowserStyleProperty", (_, property, value) => {
    win.webContents.send("setBrowserStyleProperty", property, value);
});

ipcMain.handle("log", (_, message) => {
    console.log(message);
});
function createTab(url) {
    for (const tab of tabs) {
        if (tab.reserved) {
            tab.loadUrl(url ? url : "lmn://newtab");
            tab.unreserve();
            return tab.id;
        }
    }
    const tab = new Tab({
        url: url
    });
    return tab.id;
}

ipcMain.handle("createTab", () => {
    return createTab();
});

ipcMain.handle("getCurrentTab", (_) => {
    return currenttab;
});
function openTab(tabid) {
    currenttab = tabid;
    const tab = findTab(tabid);
    if (tab) {
        win.contentView.addChildView(tab.view);
    }
}
ipcMain.handle("openTab", (_, tabid) => {
    openTab(tabid);
});

ipcMain.handle("closeTab", (_, tabid) => {
    findTab(tabid).loadUrl("data:text/html,");
    findTab(tabid).reserve();
    for (const tab of tabs) {
        if (!tab.reserved) {
            return openTab(tab.id);
        }
    }
});

ipcMain.handle("redirectTab", async (_, tabid, url) => {
    const tab = findTab(tabid);
    await tab.loadUrl(url);
    return;
});

ipcMain.handle("maximize", () => {
    win.maximize();
});

ipcMain.handle("unmaximize", () => {
    win.unmaximize();
});

ipcMain.handle("minimize", () => {
    win.minimize();
});

let explicitInternalDevTools = false;

ipcMain.handle("keydown", (_, key) => {
    if (key == "F8") {
        explicitInternalDevTools = true;
        win.webContents.openDevTools();
    }
});
async function open() {
    const createWindow = () => {
        win = new BrowserWindow({
            frame: false,
            width: 800,
            height: 600,
            webPreferences: {
                webviewTag: true,
                sandbox: false,
                contextIsolation: false,
                preload: path.join(__dirname, "preload.js"),
            },
        });

        win.webContents.once('did-finish-load', () => {
            win.webContents.send('register-shortcut');
        });

        win.webContents.on("devtools-opened", () => {
            if (explicitInternalDevTools) {
                explicitInternalDevTools = false;
            }else {
                win.webContents.closeDevTools();
                findTab(currenttab).view.webContents.openDevTools();
            }
        });

        win.loadFile("browser/index.html");
        win.setMenuBarVisibility(false);
        win.maximize();
        win.show();
        win.webContents.setUserAgent(defaultUseragent());
        win.on("resize", () => {
            for (const tab of tabs) {
                tab.setBounds();
            }
        });
        ipcMain.handle("update", require("./autoupdater")(win.webContents));
    };
    app.setName(browsername);
    app.whenReady().then(() => {
        createWindow();
        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
        globalShortcut.register('F8', () => {
            win.openDevTools();
        });
    });
    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            app.quit();
        }
    });
}

open();
