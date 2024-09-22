const { ipcRenderer } = require('electron');
const path = require('path');
window.requestBrowser = (url, x, y, width, height) => 
    ipcRenderer.invoke('requestBrowser', url, x, y, width, height);

window.lmn = {
    setBrowserStyleProperty: (property, value) => {
        ipcRenderer.invoke('setBrowserStyleProperty', property, value);
    },
    setDefaultBrowserStyleProperty: (property, value) => {
        if (window.location.href.startsWith(`file:///`)) {
            
        } else {
            throw new Error("ERR_LMN_UNAUTHORIZED unauthorized browser style property change");
        }
    },
    getIP: () => {
        if (window.location.href.startsWith(`file:///`)) {
            return require("ip").address();
        } else {
            throw new Error("ERR_LMN_UNAUTHORIZED unauthorized ip request");
        }
    },
    startFPhost: () => {
        if (window.location.href.startsWith(`file:///`)) {
            ipcRenderer.invoke('startFPhost');
        } else {
            throw new Error("ERR_LMN_UNAUTHORIZED unauthorized host request");
        }
    }
}

window.lmn.setBrowserStyleProperty("color-scheme", "dark");