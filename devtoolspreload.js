const { ipcRenderer } = require('electron');

window.tabID = "";
ipcRenderer.on('setTabID', (_, tabID) => {
    window.tabID = tabID;
});

window.getHTML = async() => {
    try {
        return await new Promise(async(resolve, reject) => {
            const ticker = window.setInterval(async() => {
                if (window.tabID) {
                    clearInterval(ticker);
                    resolve(await ipcRenderer.invoke("debug", window.tabID, "getHTML"));
                }
            });
        });
    } catch (error) {
        
    }
}

window.sendResize = (...atr) => ipcRenderer.invoke("sendDTResize", window.tabID, ...atr);