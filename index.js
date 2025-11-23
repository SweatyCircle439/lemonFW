const {
    app,
    BrowserWindow,
    WebContentsView,
    ipcMain,
    screen,
    nativeImage,
    session,
} = require("electron");
const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs-extra");
const crypto = require("crypto");
const { execFile, execFileSync, spawn, exec } = require("child_process");
const net = require("net");
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

let browsername = "lemon FW browser";
let searchengine = "https://duckduckgo.com/?q=%s";
const defaultSearchengine = "https://duckduckgo.com?q=%s";
const torSeachengine =
    "https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/?q=%s";

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

/** Calculate the current Firefox version based on date & release schedule. */
const firefoxVersion = () => {
    const daysSinceBase =
        (new Date().getTime() - new Date(2023, 4, 9).getTime()) / 86400000;
    return `${113 + Math.floor(daysSinceBase / 28)}.0`;
};

/** Return the Firefox navigator.userAgent. */
const firefoxUseragent = () => {
    const ver = firefoxVersion();
    const sys = userAgentPlatform();
    return `Mozilla/5.0 (${sys}; rv:${ver}) Gecko/20100101 Firefox/${ver}`;
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
                allowRunningInsecureContent: true,
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
            this.devtoolsview.webContents.send("redirect");
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
        this.view.webContents.debugger.on(
            "message",
            (event, method, params) => {
                if (method === "Runtime.exceptionThrown") {
                    const error = params.exceptionDetails;
                    console.error("Runtime Exception:", error.text);
                    if (error.exception) {
                        this.devtoolsview.webContents.send(
                            "error",
                            `${error.text} ${error.exception.description}`
                        );
                    } else {
                        this.devtoolsview.webContents.send(
                            "error",
                            `${error.text} Error: Unknown`
                        );
                    }
                }
                if (method === "Console.messageAdded") {
                    const { message } = params;
                    if (message.level === "error") {
                        this.devtoolsview.webContents.send(
                            "error",
                            message.text
                        );
                    } else if (message.level === "warning") {
                        this.devtoolsview.webContents.send(
                            "warning",
                            message.text
                        );
                    } else if (message.level === "log") {
                        this.devtoolsview.webContents.send("log", message.text);
                    }
                }
            }
        );
        this.debugger.sendCommand("Console.enable");
        this.debugger.sendCommand("Runtime.enable");
        this.debugger.sendCommand("Overlay.enable");
        this.setBounds();
        this.devtoolsview.webContents.loadFile(
            path.join(__dirname, "devtools", "index.html")
        );
        this.devtoolsview.webContents.addListener("did-finish-load", () => {
            this.devtoolsview.webContents.send("setTabID", this.id);
        });
        this.view.webContents.addListener("did-finish-load", () => {
            this.view.webContents.send("setTabID", this.id);
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
        this.latestElementTree = {
            existant: false,
        };
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
            try {
                await this.view.webContents.loadURL(
                    url.startsWith("http") ? url : `http://${url}`
                );
            } catch (error) {
                console.error("Failed to load URL:", error);
                await this.view.webContents.loadURL(
                    searchengine.replace("%s", url)
                );
            }
        }
        this.devtoolsview.webContents.send("redirect");
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

/**
 * @type {string[]}
 */
let tldlist = [];
fetch("https://data.iana.org/TLD/tlds-alpha-by-domain.txt")
    .then((res) => res.text())
    .then((text) => {
        tldlist.push(...text.split("\n"), "LOCAL", "ONION");
    });

tldlist.shift();

ipcMain.handle("getBrowserName", async () => {
    return browsername;
});

ipcMain.handle("inspect", () => {
    findTab(currenttab).openDevTools();
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
            const winBounds = win.getBounds();
            const x = screenx - winBounds.x;
            tab.devtoolsWidth = Math.min(
                Math.max(
                    Math.min(winBounds.width / 6, 500),
                    winBounds.width - x + 10
                ),
                winBounds.width - 0 //Math.min(winBounds.width / 6, 500)
            );
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
    return new Promise(async (ROOTres, ROOTrej) => {
        console.log(args);
        if (!args[0] || !args[1]) {
            return "args incorrect";
        }
        const debuggerInstance = findTab(args[0]).debugger;
        const webContents = findTab(args[0]).view.webContents;
        if (args[1] == "getHTML") {
            const script = `
        (() => { return (function getFullHTMLWithPseudoElements() {
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
                    addPseudoElement('::before');
                    addPseudoElement('::marker');

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
                })();})()
        `;
            const result = (
                await debuggerInstance.sendCommand("Runtime.evaluate", {
                    expression: script,
                })
            ).result.value;
            ROOTres(result);
        } else if (args[1] == "runConsole") {
            function toJavaScriptObject(node, indent = 0) {
                const indentation = "    ".repeat(indent);

                if (node.type == "error") {
                    findTab(args[0]).devtoolsview.webContents.send(
                        "error",
                        node.value
                    );
                    return undefined;
                }

                // Handle objects
                if (node.type === "object") {
                    const entries = Object.entries(node.value)
                        .map(([key, item]) => {
                            return `${"    ".repeat(indent + 1)}${item.name
                                }: ${toJavaScriptObject(item, indent + 1)}`;
                        })
                        .filter((entry) => entry !== null); // Remove the null entries
                    return `{\n${entries.join(",\n")}\n${indentation}}`;
                }

                // Handle functions: show function definition without quotes
                if (node.type === "function") {
                    return node.value.toString().replace(/\n\s*$/g, ""); // Clean up extra spaces/newlines
                }

                // Handle strings: wrap in double quotes
                if (node.type === "string") {
                    return `'${node.value.replaceAll("'", "\\'")}'`;
                }

                // Handle undefined explicitly
                if (node.type === "undefined") {
                    return "undefined";
                }

                // Handle primitives (numbers, booleans, null)
                return node.value;
            }

            async function evaluateScript(script) {
                return new Promise(async function (resolve, reject) {
                    try {
                        const evalResult = await debuggerInstance.sendCommand(
                            "Runtime.evaluate",
                            {
                                expression: script,
                                returnByValue: false,
                                awaitPromise: true,
                                async: true,
                            }
                        );

                        if (
                            evalResult.result.type === "object" &&
                            evalResult.result.objectId
                        ) {
                            const properties =
                                await debuggerInstance.sendCommand(
                                    "Runtime.getProperties",
                                    {
                                        objectId: evalResult.result.objectId,
                                    }
                                );

                            const reconstructed = properties.result.reduce(
                                (acc, prop) => {
                                    if (prop.value) {
                                        const resultNode = {
                                            name: prop.name,
                                            type: prop.value.type,
                                            value: null,
                                        };

                                        console.log("type: ", prop.value.type);

                                        if (prop.value.type === "") {
                                        }

                                        if (prop.value.type === "function") {
                                            resultNode.value =
                                                prop.value.description;
                                        } else if (
                                            prop.value.type === "object" ||
                                            prop.value.type === "array"
                                        ) {
                                            resultNode.value = prop.value;
                                            resultNode.type = "object";
                                        } else {
                                            resultNode.value = prop.value.value;
                                        }
                                        acc[prop.name] = resultNode;
                                    } else {
                                        // Explicitly handle undefined properties
                                        acc[prop.name] = {
                                            name: prop.name,
                                            type: "undefined",
                                            value: undefined,
                                        };
                                    }
                                    return acc;
                                },
                                {}
                            );

                            const formattedOutput = toJavaScriptObject(
                                {
                                    type: "object", // Overall type is "object"
                                    value: Object.values(reconstructed), // Use the property values as the object values
                                },
                                0
                            );
                            console.log(
                                "Reconstructed Output:\n",
                                formattedOutput
                            );
                            resolve(formattedOutput); // Return formatted output
                        } else {
                            const primitiveResult = evalResult.result.value;
                            console.log("Primitive Result:", primitiveResult);
                            resolve(
                                toJavaScriptObject(
                                    {
                                        type: typeof primitiveResult,
                                        value: primitiveResult,
                                    },
                                    0
                                ) // Handle primitive types
                            );
                        }
                    } catch (error) {
                        console.error("Error during script evaluation:", error);
                        resolve(null);
                    }
                });
            }
            let result;
            if (args[3]) {
                result = await evaluateScript(
                    `(() => {
                        return new Promise((res, rej) => {
                            let result = undefined;
                            setTimeout(
                                async() => {
                                    result = await (async() => {
                                        const res = undefined;
                                        ${args[2]}
                                    })();
                                    res(result)});
                                },
                                0
                            )
                        }
                    )()`
                );
            } else {
                result = await evaluateScript(args[2]);
            }
            console.log(`result: ${result}`);
            ROOTres({ success: true, result });
        } else if (args[1] == "getElementTree") {
            const script = `
                (() => {
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
                    const pseudos = [
                        '::after',
                        '::before',
                        '::marker'
                    ];
                    function tree(element, selector = []) {
                        const childarray = [];
                        let currentSelector = 0;
                        for (let child of element.childNodes ? element.childNodes : []) {
                            if (child.nodeType === Node.ELEMENT_NODE) {
                                const innerSelector = [];
                                for (const selec of selector) {
                                    innerSelector.push(selec);
                                }
                                innerSelector.push(currentSelector);
                                currentSelector++;
                                childarray.push(tree(child, innerSelector));
                        };
                        }
                        for(const pseudo of pseudos) {
                            if (typeof getPseudoContent(element, pseudo) !== 'undefined') {
                                const innerSelector = [];
                                for (const selec of selector) {
                                    innerSelector.push(selec);
                                }
                                innerSelector.push(currentSelector);
                                currentSelector++;
                                childarray.push({
                                    name: [{col: "var(--ET-element-pseudo)", val: pseudo}],
                                    children: [],
                                    selector: innerSelector,
                                    isPseudo: true,
                                    pseudo
                                });
                            }
                        };
                        const name = [];
                        name.push({col: "var(--ET-element-tag)", val: element.tagName ? element.tagName.toLowerCase() : "unknown element"});
                        if (name[0].val == "link") {
                            name.push({col: "var(--ET-element-EST)", val: \`(\${element.rel})\`});
                        }
                        if (name[0].val == "script") {
                            name.push({col: "var(--ET-element-EST)", val: "{"});
                            name.push({col: "var(--ET-element-EST)", val: \`\${element.lang === "nodeJS" ? "\\\" : element.lang === "python" ? "\\\" : "\\\"}\`, weight: "400"});
                            name.push({col: "var(--ET-element-EST)", val: \` \${element.lang === "nodeJS" ? "node.js" : element.lang ? element.lang : "javascript"}}\`});
                            if (element.type) {
                                name.push({col: "var(--ET-element-EST)", val: \`[\${element.type}]\`});
                            }
                        }
                        if (element.id) {
                            name.push({col: "var(--ET-element-id)",val: \`#\${element.id}\`});
                        }
                        for (const cls of element.classList) {
                            name.push({col: "var(--ET-element-class)",val: \`.\${cls}\`});
                        }
                        return {
                            name,
                            children: childarray,
                            selector,
                            isPseudo: false
                        }
                    }
                    return JSON.stringify(tree(document.documentElement));
                })()
            `;
            const result = (
                await debuggerInstance.sendCommand("Runtime.evaluate", {
                    expression: script,
                })
            ).result.value;
            findTab(args[0]).latestElementTree = {
                existant: true,
                tree: result,
            };
            ROOTres(result);
        } else if (args[1] == "getComputedStyle") {
            let find = "[";
            for (const fnd of args[2]) {
                if (find.length == 1) {
                    find += fnd;
                } else {
                    find += `, ${fnd}`;
                }
            }
            find += "]";
            const script = `
                (() => {
                    const find = ${find};
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
                    const pseudos = [
                        '::after',
                        '::before',
                        '::marker'
                    ];
                    let found = false;
                    let result;
                    function checkSelector(selector) {
                        const finds = selector.map((e, i) => e == find[i]);
                        for(const e of finds) {
                            if(!e) return false;
                        }
                        return true;
                    }
                    function tree(element, selector = []) {
                        const childarray = [];
                        let currentSelector = 0;
                        for (let child of element.childNodes ? element.childNodes : []) {
                            if (child.nodeType === Node.ELEMENT_NODE) {
                                const innerSelector = [];
                                for (const selec of selector) {
                                    innerSelector.push(selec);
                                }
                                innerSelector.push(currentSelector);
                                if (checkSelector(innerSelector)) {
                                    found = true;
                                    result = window.getComputedStyle(child);
                                }
                                currentSelector++;
                                childarray.push(tree(child, innerSelector));
                        };
                        }
                        for(const pseudo of pseudos) {
                            if (typeof getPseudoContent(element, pseudo) !== 'undefined') {
                                const innerSelector = [];
                                for (const selec of selector) {
                                    innerSelector.push(selec);
                                }
                                innerSelector.push(currentSelector);
                                if (checkSelector(innerSelector)) {
                                    found = true;
                                    result = window.getComputedStyle(element, pseudo);
                                }
                                currentSelector++;
                                childarray.push({
                                    name: [{col: "var(--ET-element-pseudo)", val: pseudo}],
                                    children: [],
                                    selector: innerSelector,
                                    isPseudo: true,
                                    pseudo
                                });
                            }
                        };
                        const name = [];
                        name.push({col: "var(--ET-element-tag)", val: element.tagName ? element.tagName.toLowerCase() : "unknown element"});
                        if (name[0].val == "link") {
                            name.push({col: "var(--ET-element-EST)", val: \`(\${element.rel})\`});
                        }
                        if (element.id) {
                            name.push({col: "var(--ET-element-id)",val: \`#\${element.id}\`});
                        }
                        for (const cls of element.classList) {
                            name.push({col: "var(--ET-element-class)",val: \`.\${cls}\`});
                        }
                        if (found) return result;
                        return {
                            found: false
                        }
                    }
                    return JSON.stringify(tree(document.documentElement));
                })()
            `;
            const result = (
                await debuggerInstance.sendCommand("Runtime.evaluate", {
                    expression: script,
                })
            ).result.value;
            findTab(args[0]).latestElementTree = {
                existant: true,
                tree: result,
            };
            ROOTres(result);
        } else if (args[1] == "getGlobalVariables") {
            debuggerInstance
                .sendCommand("Runtime.evaluate", {
                    expression: "Object.getOwnPropertyNames(window)",
                    returnByValue: true,
                })
                .then((result) => {
                    const globalVariables = result.result.value;
                    console.log("Global Variables:", globalVariables);

                    // Get detailed info about global variables
                    globalVariables.forEach((variable) => {
                        debuggerInstance
                            .sendCommand("Runtime.evaluate", {
                                expression: `typeof ${variable} === 'function' ? ${variable}.toString() : typeof ${variable} === 'object' ? ${variable} : typeof ${variable}`,
                                returnByValue: true,
                            })
                            .then((details) => {
                                const value = details.result.value;
                                if (
                                    typeof value === "string" &&
                                    value.startsWith("function")
                                ) {
                                    // Extract parameters using regex (exclude body)
                                    const params = value.match(/\(([^)]*)\)/);
                                    const paramsList = params
                                        ? params[1]
                                            .split(",")
                                            .map((param) => param.trim())
                                        : [];
                                    console.log(
                                        `${variable} (${paramsList.join(", ")})`
                                    );
                                } else if (
                                    typeof value === "object" &&
                                    value !== null
                                ) {
                                    // For objects, log properties in the format { key: value }
                                    debuggerInstance
                                        .sendCommand("Runtime.evaluate", {
                                            expression: `Object.entries(${variable})`,
                                            returnByValue: true,
                                        })
                                        .then((objectDetails) => {
                                            const entries =
                                                objectDetails.result.value;
                                            const formattedObject = entries
                                                .map(
                                                    ([key, val]) =>
                                                        `${key}: ${val}`
                                                )
                                                .join(", ");
                                            console.log(
                                                `${variable} { ${formattedObject} }`
                                            );
                                        })
                                        .catch((err) => {
                                            console.error(
                                                "Error retrieving object entries:",
                                                err
                                            );
                                        });
                                } else {
                                    console.log(`${variable}: ${value}`);
                                }
                            })
                            .catch((err) => {
                                console.error(
                                    "Error evaluating variable:",
                                    err
                                );
                            });
                    });
                })
                .catch((err) => {
                    console.error("Error fetching global variables:", err);
                });
        } else if (args[1] == "closeDevTools") {
            return findTab(args[0]).closeDevTools();
        } else if (args[1] == "getQuerySelector") {
            let find = "[";
            for (const fnd of args[2]) {
                if (find.length == 1) {
                    find += fnd;
                } else {
                    find += `, ${fnd}`;
                }
            }
            find += "]";
            const script = `
                (() => {
                    function getUniqueSelector(element) {
                        if (!(element instanceof Element)) throw new Error("Input must be an Element");

                        const parts = [];
                        while (element.parentElement) {
                            let selector = element.tagName.toLowerCase();
                            
                            if (element.className) {
                                const classList = [...element.classList].map(cls => \`.\${CSS.escape(cls)}\`).join("");
                                selector += classList;
                            }

                            if (element.id) selector += \`#\${CSS.escape(element.id)}\`;

                            const siblings = Array.from(element.parentElement.children);
                            const sameTagSiblings = siblings.filter(el => el.tagName === element.tagName);

                            if (sameTagSiblings.length > 1) {
                                const index = sameTagSiblings.indexOf(element) + 1;
                                selector += \`:nth-of-type(\${index})\`;
                            }

                            parts.unshift(selector);

                            const testSelector = parts.join(" > ");
                            if (document.querySelectorAll(testSelector).length === 1) {
                                return testSelector;
                            }

                            element = element.parentElement;
                        }

                        return parts.join(" > ");
                    }
                    const find = ${find};
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
                    const pseudos = [
                        '::after',
                        '::before',
                        '::marker'
                    ];
                    let found = false;
                    let result;
                    function checkSelector(selector) {
                        const finds = selector.map((e, i) => e == find[i]);
                        for(const e of finds) {
                            if(!e) return false;
                        }
                        return true;
                    }
                    function tree(element, selector = []) {
                        const childarray = [];
                        let currentSelector = 0;
                        for (let child of element.childNodes ? element.childNodes : []) {
                            if (child.nodeType === Node.ELEMENT_NODE) {
                                const innerSelector = [];
                                for (const selec of selector) {
                                    innerSelector.push(selec);
                                }
                                innerSelector.push(currentSelector);
                                if (checkSelector(innerSelector)) {
                                    found = true;
                                    result = getUniqueSelector(child);
                                }
                                currentSelector++;
                                childarray.push(tree(child, innerSelector));
                        };
                        }
                        for(const pseudo of pseudos) {
                            if (typeof getPseudoContent(element, pseudo) !== 'undefined') {
                                const innerSelector = [];
                                for (const selec of selector) {
                                    innerSelector.push(selec);
                                }
                                innerSelector.push(currentSelector);
                                if (checkSelector(innerSelector)) {
                                    found = true;
                                    result = getUniqueSelector(element) + pseudo;
                                }
                                currentSelector++;
                                childarray.push({
                                    name: [{col: "var(--ET-element-pseudo)", val: pseudo}],
                                    children: [],
                                    selector: innerSelector,
                                    isPseudo: true,
                                    pseudo
                                });
                            }
                        };
                        const name = [];
                        name.push({col: "var(--ET-element-tag)", val: element.tagName ? element.tagName.toLowerCase() : "unknown element"});
                        if (name[0].val == "link") {
                            name.push({col: "var(--ET-element-EST)", val: \`(\${element.rel})\`});
                        }
                        if (element.id) {
                            name.push({col: "var(--ET-element-id)",val: \`#\${element.id}\`});
                        }
                        for (const cls of element.classList) {
                            name.push({col: "var(--ET-element-class)",val: \`.\${cls}\`});
                        }
                        if (found) return result;
                        return {
                            found: false
                        }
                    }
                    return (tree(document.documentElement));
                })()
            `;
            const result = (
                await debuggerInstance.sendCommand("Runtime.evaluate", {
                    expression: script,
                })
            ).result.value;
            findTab(args[0]).latestElementTree = {
                existant: true,
                tree: result,
            };
            ROOTres(result);
        } else if (args[1] == "highlight") {
            // console.log('highlighting ', args[2]);
            // console.log(args[2].map(v => `:nth_child(${v})`).join(" > "));
            // debuggerInstance.sendCommand("DOM.getDocument", {}).then(({ root }) => {
            //     debuggerInstance.sendCommand("DOM.querySelector", {
            //         nodeId: root.nodeId,
            //         selector: args[2].map(v => `:nth_child(${v})`).join(" > ")
            //     }).then(({ nodeId }) => {
            //         console.log(nodeId);
            //         if (nodeId) {
            //             debuggerInstance.sendCommand("Overlay.highlightNode", {
            //                 highlightConfig: {
            //                     borderColor: { r: 255, g: 0, b: 0, a: 1 }
            //                 },
            //                 nodeId: nodeId
            //             });
            //             resolve();
            //         }
            //     });
            // });
            // await webContents.debugger.sendCommand("Overlay.enable");
            // debuggerInstance.sendCommand("Overlay.setInspectMode", {
            //     mode: "searchForNode",
            //     highlightConfig: { borderColor: { r: 0, g: 255, b: 0, a: 1 } }
            // });   
            
            debuggerInstance.sendCommand("DOM.getDocument").then(({ root }) => {
                return debuggerInstance.sendCommand("DOM.querySelector", {
                    nodeId: root.nodeId,
                    selector: args[2]
                });
            }).then(({ nodeId }) => {
                if (!nodeId) {
                    console.error("Element not found!");
                    return;
                }
                return debuggerInstance.sendCommand("Overlay.highlightNode", {
                    highlightConfig: {
                        showInfo: true,
                        showRulers: true,
                        showExtensionLines: true,
                        showMargin: true,
                        showBorder: true,
                        showPadding: true,
                        borderColor: { r: 255, g: 0, b: 0, a: 1 },
                        contentColor: { r: 173, g: 216, b: 230, a: 0.75 },
                        marginColor: { r: 122, g: 122, b: 122, a: 0.5},
                        paddingColor: { r: 3, g: 132, b: 3, a: 0.5},
                        backgroundColor: { r: 173, g: 216, b: 230, a: 0.55}
                    },
                    nodeId: nodeId
                });
            }).catch(console.error).then(ROOTres);
                     
        } else if (args[1] == "searchNode") {
            await debuggerInstance.sendCommand("Overlay.setInspectMode", {
                mode: "searchForUAShadowDOM",
                highlightConfig: {
                    showInfo: true,
                    showRulers: true,
                    showExtensionLines: true,
                    showMargin: true,
                    showBorder: true,
                    showPadding: true,
                    borderColor: { r: 255, g: 0, b: 0, a: 1 },
                    contentColor: { r: 173, g: 216, b: 230, a: 0.75 },
                    marginColor: { r: 122, g: 122, b: 122, a: 0.5},
                    paddingColor: { r: 3, g: 132, b: 3, a: 0.5},
                    backgroundColor: { r: 173, g: 216, b: 230, a: 0.55}
                }
            });
            // const script = `
            //     (() => {
            //         let hasClicked = false;
            //         return new Promise(res => {
            //             window.addEventListener("click", e => {
            //                 if (!hasClicked) {
            //                     hasClicked = true;
            //                     console.log("resolved: " + JSON.stringify(e.target.style));
            //                     res("resolved: " + JSON.stringify(e.target.style));
            //                 }
            //             }); 
            //         })
            //     })()
            // `;
            // const result = (
            //     await debuggerInstance.sendCommand("Runtime.evaluate", {
            //         expression: script,
            //         awaitPromise: true,
            //         async: true,
            //     })
            // ).result.value;
            debuggerInstance.on("message", async (event, method, params) => {
                // console.log("event: ", event);
                // console.log("method: ", method);
                // console.log("params: ", params);
                if (method === "Overlay.inspectNodeRequested") {
                    const nodeId = params.backendNodeId;
                
                    const { object } = await debuggerInstance.sendCommand("DOM.resolveNode", {
                            backendNodeId: nodeId
                    });
                    
                    const objectId = object.objectId;
                    
                    const result = await debuggerInstance.sendCommand("Runtime.callFunctionOn", {
                        objectId: objectId,
                        functionDeclaration: `
                            function() {return new Promise((res, rej) => {
                                const e = this;
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
                                const pseudos = [
                                    '::after',
                                    '::before',
                                    '::marker'
                                ];
                                function tree(element, selector = []) {
                                    const childarray = [];
                                    let currentSelector = 0;
                                    for (let child of element.childNodes ? element.childNodes : []) {
                                        if (child.nodeType === Node.ELEMENT_NODE) {
                                            const innerSelector = [];
                                            for (const selec of selector) {
                                                innerSelector.push(selec);
                                            }
                                            innerSelector.push(currentSelector);
                                            currentSelector++;
                                            if (child === e) {
                                                console.log("child found: " + JSON.stringify(innerSelector));
                                                res(JSON.stringify(innerSelector));
                                            }else {
                                                childarray.push(tree(child, innerSelector));
                                            }
                                    };
                                    }
                                    for(const pseudo of pseudos) {
                                        if (typeof getPseudoContent(element, pseudo) !== 'undefined') {
                                            const innerSelector = [];
                                            for (const selec of selector) {
                                                innerSelector.push(selec);
                                            }
                                            innerSelector.push(currentSelector);
                                            currentSelector++;
                                            childarray.push({
                                                name: [{col: "var(--ET-element-pseudo)", val: pseudo}],
                                                children: [],
                                                selector: innerSelector,
                                                isPseudo: true,
                                                pseudo
                                            });
                                        }
                                    };
                                    const name = [];
                                    name.push({col: "var(--ET-element-tag)", val: element.tagName ? element.tagName.toLowerCase() : "unknown element"});
                                    if (name[0].val == "link") {
                                        name.push({col: "var(--ET-element-EST)", val: \`(\${element.rel})\`});
                                    }
                                    if (element.id) {
                                        name.push({col: "var(--ET-element-id)",val: \`#\${element.id}\`});
                                    }
                                    for (const cls of element.classList) {
                                        name.push({col: "var(--ET-element-class)",val: \`.\${cls}\`});
                                    }
                                    return {
                                        name,
                                        children: childarray,
                                        selector,
                                        isPseudo: false
                                    }
                                }
                                return JSON.stringify(tree(document.documentElement));
                            })}
                        `,
                        returnByValue: true,
                        async: true,
                        awaitPromise: true,
                    });
                    await debuggerInstance.sendCommand("Overlay.setInspectMode", {
                        mode: "none",
                        highlightConfig: {}
                    });
                    ROOTres(JSON.parse(result.result.value));
                }
            });
        } else {
            ROOTrej("unknown command");
        }
    });
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

let torProcess;

ipcMain.handle("setTorEnabled", (_, enabled) => {
    if (enabled) {
        for (const tab of tabs) {
            tab.view.webContents.setUserAgent(firefoxUseragent());
        }
        searchengine = torSeachengine;
        const newIcon = nativeImage.createFromPath(
            path.join(__dirname, "browser", "assets", "logo", "logoTor.png")
        );
        win.setIcon(newIcon);
        torProcess = spawn(path.join(__dirname, "tor", "tor.exe"), []);
        session.defaultSession.setProxy({
            proxyRules: "socks5://127.0.0.1:9050",
        });
    } else {
        searchengine = defaultSearchengine;
        for (const tab of tabs) {
            tab.view.webContents.setUserAgent(defaultUseragent());
        }
        const newIcon = nativeImage.createFromPath(
            path.join(__dirname, "browser", "assets", "logo", "logo.png")
        );
        win.setIcon(newIcon);
        torProcess.kill();
        session.defaultSession.setProxy({
            proxyRules: "",
        });
    }
});

ipcMain.handle("execNodeJS", (_, script, tabID) => {
    const tab = findTab(tabID);
    console.log(tabID, tab);
    
    const scope = {
        "require": package => {
            const requirecache = fs.readJSONSync(path.join(__dirname, "nodejspackagescache.json"));
            if (requirecache[package]) {
                if (requirecache[package].status === "banned") {
                    throw new Error(`package \ ${package} is banned because ${requirecache[package].message}`);
                }
                if (requirecache[package].status === "low_level_threat") {
                    tab.devtoolsview.webContents.send("warning", `package \ ${package} is considered a low-level threat`);
                }
                return require(package);
            }else {
                throw new Error(`package \ ${package} either has not been reviewed yet or does not exist`);
            }
        },
        "console": {
            log: m => {
                tab.devtoolsview.webContents.send("log", m);
                return m;
            },
            warn: m => {
                tab.devtoolsview.webContents.send("warning", m);
                return m;
            },
            error: m => {
                tab.devtoolsview.webContents.send("error", m);
                return m;
            }
        },
        "lmn": {
            "pass": (data) => {
                tab.view.webContents.send("pass", data);
            },
        },
        "__urlhref": tab.view.webContents.getURL(),
        "__downloads": app.getPath("downloads"),
        "__homedir": app.getPath("home"),
        "process": {
            exit: _ => {
                throw new Error("haha nice try buddy, but that aint gonna work");
            }
        }
    };
    const scopenames = [];
    for (const name in scope) {
        scopenames.push(name);
    }
    const func = new Function(...scopenames, script);

    (async() => {
        try {
            func(...scopenames.map(n => scope[n]));
        } catch (error) {
            tab.devtoolsview.webContents.send("error", `Uncaught ${error.stack ? error.stack : ""}\n\t\tat \ node.js client execution`);
        }
    })();
});

ipcMain.handle("execPython", (_, script, tabID) => {
    const tab = findTab(tabID);
    console.log(tabID, tab);

    (async() => {
        try {
            await new Promise((resolve, reject) => {
                console.log("execing py");
                const py = spawn("python3", ["-u", "sandbox.py"]); // -u for unbuffered output
    
                let error = "";
    
                py.stdout.on("data", (data) => {
                    const text = data.toString();
                    console.log("data", text);
                    tab.devtoolsview.webContents.send("log", text);
                });
    
                py.stderr.on("data", (err) => {
                    error += err;
                    console.error("Python Error:", err.toString());
                });
    
                py.on("close", code => {
                    if (code !== 0) {
                        reject(new Error(error.toString()));
                    }
                });
    
                setTimeout(() => {
                    console.log("Sending script...");
                    py.stdin.write(script + "\n");
                    py.stdin.write("EOS\n");
                    py.stdin.end();
                }, 100);
            });
        } catch (error) {
            tab.devtoolsview.webContents.send("error", `Uncaught ${error.message ? error.message : ""}\n\t\tat \ python client execution`);
        }
    })();
});

const pyimportserver = net.createServer((socket) => {
    socket.on("data", (data) => {
        const requirecache = fs.readJSONSync(path.join(__dirname, "pythonpackagecache.json"));
        if (data.toString().trim().startsWith("module:")) {
            const moduleName = data.toString().trim().replace("module:", "");
            if (requirecache.includes(moduleName)) {
                socket.write("ALLOW\n");
            } else {
                socket.write("DENY\n");
            }
        }else if (data.toString().trim().startsWith("pass:")) { 
        }
    });
});

pyimportserver.listen(13096, "127.0.0.1", () => {
    console.log("python server running on port 13096");
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
        const newIcon = nativeImage.createFromPath(
            path.join(__dirname, "browser", "assets", "logo", "logo.png")
        );
        win.setIcon(newIcon);
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
