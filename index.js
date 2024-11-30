const { app, BrowserWindow, WebContentsView, ipcMain, screen } = require("electron");
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
    let platform = "X11; Linux x86_64";
    if (process.platform === "win32") {
        platform = "Window NT 10.0; Win64; x64";
    }
    if (process.platform === "darwin") {
        platform = "Macintosh; Intel Mac OS X 10_15_7";
    }
    return platform;
};

/** Return the default navigator.userAgent. */
const defaultUseragent = () => {
    const [version] = process.versions.chrome.split(".");
    const sys = userAgentPlatform();
    return (
        `Mozilla/5.0 (${sys}) AppleWebKit/537.36 (KHTML, like Gecko) ` +
        `Chrome/${version}.0.0.0 Safari/537.36`
    );
};

async function sendTabUpdate() {
    const result = [];
    try {
        for (const tab of tabs) {
            const tabSP = await tab.view.webContents.executeJavaScript(
                "getTabElementProperties()"
            );

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
                    hoverClipPath: tabSP.style.hoverClipPath,
                },
                css: tabSP.css,
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
    constructor(
        properties = {
            url: undefined,
        }
    ) {
        this.devtoolsWidth = 500;
        this.devtoolsOpen = false;
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
        this.view.webContents.addListener(
            "page-favicon-updated",
            (_, favicons) => {
                this.favicon = favicons[0];
                sendTabUpdate();
            }
        );
        this.view.webContents.addListener("page-title-updated", (e, title) => {
            this.title = title;
            sendTabUpdate();
        });
        this.view.webContents.addListener("will-navigate", (e) => {
            win.webContents.send("redirect", e.url);
        });

        this.view.webContents.loadFile("browser/pages/newtab.html");
        this.id = crypto.randomUUID();
        this.devtoolsview = new WebContentsView({
            webPreferences: {
                webviewTag: true,
                sandbox: false,
                contextIsolation: false,
                preload: path.join(__dirname, "devtoolspreload.js"),
            },
        });
        this.debugger = this.view.webContents.debugger;
        this.debugger.attach("1.3");
        this.debugger.sendCommand("DOM.enable");
        this.setBounds();
        this.devtoolsview.webContents.loadFile(
            path.join(__dirname, "devtools", "index.html")
        );
        this.devtoolsview.webContents.addListener("did-finish-load", () => {
            this.devtoolsview.webContents.send("setTabID", this.id);
        });
        tabs.push(this);
        this.view.webContents.setWindowOpenHandler((e) => {
            openTab(createTab(e.url));
        });
        this.devtoolsview.webContents.setWindowOpenHandler((e) => {
            openTab(createTab(e.url));
        });
        if (properties.url) {
            this.loadUrl(properties.url);
        }
    }

    openDevTools() {
        this.devtoolsOpen = true;
        this.setBounds();
        this.devtoolsview.webContents.openDevTools();
    }

    closeDevTools() {
        this.devtoolsOpen = false;
        this.setBounds();
    }

    setBounds() {
        let width = win.getBounds().width;
        if (this.devtoolsOpen) {
            width -= this.devtoolsWidth;
        }
        this.view.setBounds({
            x: 0,
            y: 87,
            width: width,
            height: win.getBounds().height - 87,
        });
        this.devtoolsview.setBounds({
            x: width,
            y: 87,
            width: this.devtoolsWidth,
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
    .then((text) => {
        tldlist.push(...text.split("\n"), "LOCAL");
    });

tldlist.shift();

ipcMain.handle("getBrowserName", async () => {
    return browsername;
});

ipcMain.handle("startFPhost", () => {
    require("./fp/fphost")(app.getPath("documents"));
});

let intervalid = 0;

ipcMain.handle("sendDTResize", (...atr) => {
    if (atr[2] == "start") {
        intervalid = setInterval(() => {
            const tabid = atr[1];
            const tab = findTab(tabid);
            const screenx = screen.getCursorScreenPoint().x;
            console.log(screenx);
            const winBounds = win.getBounds();
            const x = screenx - winBounds.x;
            tab.devtoolsWidth = Math.max(Math.min(winBounds.width / 6, 500), (winBounds.width - x) + 10);
            tab.setBounds();
        }, 1);
    } else {
        clearInterval(intervalid);
    }
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

ipcMain.handle("debug", async (_, ...args) => {
    console.log(args);
    if (!args[0]) {
        return "args incorrect";
    }
    const debuggerInstance = findTab(args[0]).debugger;
    if (args[1] == "getHTML") {
        const script = `
            (function getFullHTMLWithPseudoElements() {
            function getPseudoContent(element, pseudo) {
                const style = window.getComputedStyle(element, pseudo);
                if (style.display === 'none') {
                    return undefined;
                }
                const result = style.content &&
                    style.content !== 'none' &&
                    style.content !== 'normal' ? 
                    style.content : undefined;
                if (
                    element.tagName.toLowerCase() == "li" &&
                    pseudo == "::marker" &&
                    style.content == 'normal'
                ) {
                    return "";
                }
                return result;
            }

            function serializeElement(element) {
                if (element.nodeType === Node.TEXT_NODE) {
                return element.textContent;
                }

                if (element.nodeType === Node.ELEMENT_NODE) {
                const tagName = element.tagName.toLowerCase();
                let serialized = \`<\${tagName}\`;

                // Add attributes
                Array.from(element.attributes).forEach(attr => {
                    serialized += \` \${attr.name}="\${attr.value}"\`;
                });

                serialized += '>\\n\\t';

                function addPseudoElement(pseudo) {
                    const beforeContent = getPseudoContent(element, pseudo);
                    if (beforeContent !== undefined) {
                        serialized += \`\${pseudo}\\n\\t\${beforeContent}\\n\`;
                    }
                }

                addPseudoElement('::after');
                addPseudoElement('::backdrop');
                addPseudoElement('::before');
                addPseudoElement('::cue');
                addPseudoElement('::cue()');
                addPseudoElement('::file-selector-button');
                addPseudoElement('::marker');
                addPseudoElement('::part');
                addPseudoElement('::placeholder');

                // Add child nodes
                Array.from(element.childNodes).forEach(child => {
                    serialized += serializeElement(child);
                });

                serialized += \`</\${tagName}>\`;
                return serialized;
                }

                return '';
            }

            // Start serialization from the root element
            return serializeElement(document.documentElement);
            })();
        `;
        const result = (
            await debuggerInstance.sendCommand("Runtime.evaluate", {
                expression: script,
            })
        ).result.value;
        return result;
    }
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
        url: url,
    });
    sendTabUpdate();
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
        findTab(currenttab).closeDevTools();
        win.contentView.addChildView(tab.view);
        win.contentView.addChildView(tab.devtoolsview);
        if (tab.devtoolsOpen) {
            tab.openDevTools();
        }
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

        win.webContents.once("did-finish-load", () => {
            win.webContents.send("register-shortcut");
        });

        win.webContents.on("devtools-opened", () => {
            if (explicitInternalDevTools) {
                explicitInternalDevTools = false;
            } else {
                win.webContents.closeDevTools();
                if (findTab(currenttab).devtoolsOpen) {
                    findTab(currenttab).closeDevTools();
                } else {
                    findTab(currenttab).openDevTools();
                }
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
        globalShortcut.register("F8", () => {
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
