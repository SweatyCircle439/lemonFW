const { app, BrowserWindow, WebContentsView, ipcMain } = require("electron");
const path = require("path");
const fetch = require("node-fetch");
/** @type {BrowserWindow} */
let win;
/** @type {Number} */
let currenttab;

/** @type {WebContentsView[]} */
let tabs = [];

let browsername = "lemon FW browser";

let tldlist = [];
fetch("https://data.iana.org/TLD/tlds-alpha-by-domain.txt")
    .then((res) => res.text())
    .then((text) => tldlist.push(...text.split("\n")));

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

ipcMain.handle("setBrowserStyleProperty", (event, property, value) => {
    win.webContents.send("setBrowserStyleProperty", property, value);
});

ipcMain.handle("log", (event, message) => {
    console.log(message);
});

function setBounds(tab) {
    tab.setBounds({
        x: 0,
        y: 87,
        width: win.getBounds().width,
        height: win.getBounds().height - 87,
    });
}

ipcMain.handle("createTab", () => {
    let tab = new WebContentsView({
        webPreferences: {
            webviewTag: true,
            sandbox: false,
            contextIsolation: false,
            preload: path.join(__dirname, "webpreload.js"),
        },
    });
    tab.webContents.addListener("will-navigate", (e) => {
        win.webContents.send("redirect", e.url);
    });

    tab.webContents.loadFile("browser/pages/newtab.html");
    setBounds(tab);
    let tabid = tabs.length;
    tabs.push(tab);
    tab.webContents.setWindowOpenHandler((e) => {
        throw new Error(e.url);
    });
    return tabid;
});

ipcMain.handle("getCurrentTab", (event) => {
    return currenttab;
});

ipcMain.handle("openTab", (event, tabid) => {
    currenttab = tabid;
    win.contentView.addChildView(tabs[tabid]);
});

ipcMain.handle("closeTab", (event, tabid) => {
    if (currenttab == tabid) {
        ipcMain.emit("openTab", 0);
    }
    tabs[tabid].webContents.destroy();
    tabs.splice(tabid, 1);
});

ipcMain.handle("redirectTab", async (event, tabid, url) => {
    if (url.startsWith("lmn://")) {
        const [_, page] = url.split("://");
        await tabs[tabid].webContents.loadFile(`browser/pages/${page}.html`);
    } else {
        await tabs[tabid].webContents.loadURL(url);
    }
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

        win.loadFile("browser/index.html");
        win.setMenuBarVisibility(false);
        win.maximize();
        win.show();
        win.on("resize", (e) => {
            for (const tab of tabs) {
                setBounds(tab);
            }
        });
    };
    app.setName(browsername);
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
