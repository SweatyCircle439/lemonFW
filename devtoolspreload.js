const { ipcRenderer } = require("electron");

window.tabID = "";
ipcRenderer.on("setTabID", (_, tabID) => {
    window.tabID = tabID;
});

window.getHTML = async () => {
    try {
        return await new Promise(async (resolve, reject) => {
            const ticker = window.setInterval(async () => {
                if (window.tabID) {
                    clearInterval(ticker);
                    resolve(
                        await ipcRenderer.invoke(
                            "debug",
                            window.tabID,
                            "getHTML"
                        )
                    );
                }
            });
        });
    } catch (error) {}
};
window.getElementTree = async () => {
    try {
        return await new Promise(async (resolve, reject) => {
            const ticker = window.setInterval(async () => {
                if (window.tabID) {
                    clearInterval(ticker);
                    resolve(
                        JSON.parse(await ipcRenderer.invoke(
                            "debug",
                            window.tabID,
                            "getElementTree"
                        ))
                    );
                }
            });
        });
    } catch (error) {}
};
window.getDocumentComputedStyle = async (...args) => {
    try {
        return await new Promise(async (resolve, reject) => {
            const ticker = window.setInterval(async () => {
                if (window.tabID) {
                    clearInterval(ticker);
                    resolve(
                        JSON.parse(await ipcRenderer.invoke(
                            "debug",
                            window.tabID,
                            "getComputedStyle",
                            ...args
                        ))
                    );
                }
            });
        });
    } catch (error) {}
};

window.sendResize = (...atr) =>
    ipcRenderer.invoke("sendDTResize", window.tabID, ...atr);
window.runConsole = async(...args) =>
    await ipcRenderer.invoke("debug", window.tabID, "runConsole", ...args);

window.debug = async(...args) => 
    await ipcRenderer.invoke("debug", window.tabID, ...args);

window.closeDevTools = async () => {
    try {
        return await new Promise(async (resolve, reject) => {
            const ticker = window.setInterval(async () => {
                if (window.tabID) {
                    clearInterval(ticker);
                    resolve(
                        await ipcRenderer.invoke(
                            "debug",
                            window.tabID,
                            "closeDevTools"
                        )
                    );
                }
            });
        });
    } catch (error) {}
};

ipcRenderer.on("log", (_, m) => {window.log(m);});
ipcRenderer.on("warning", (_, m) => {window.warning(m);});
ipcRenderer.on("error", (_, m) => {window.error(m);});
ipcRenderer.on("redirect", (_) => {window.redirect()});