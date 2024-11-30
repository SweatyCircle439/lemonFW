const { ipcRenderer } = require('electron');
const path = require('path');
window.requestBrowser = (url, x, y, width, height) => 
    ipcRenderer.invoke('requestBrowser', url, x, y, width, height);

window.tabElementProperties = {
    ITHML: undefined,
    style: {
        background: undefined,
        clipPath: undefined,
        hoverBackground: undefined,
        hoverClipPath: undefined
    },
    css: {

    }
}

window.getTabElementProperties = () => {
    return window.tabElementProperties
}

window.lmn = {
    lmntab: {
        InnerHTML: (html) => {
            window.tabElementProperties.IHTML = html;
            ipcRenderer.invoke("sendTabUpdate");
        },
        StyleProperty: (property, value) => {
            window.tabElementProperties.style[property] = value;
            ipcRenderer.invoke("sendTabUpdate");
        },
        css: (property, value) => {
            window.tabElementProperties.css[property] = value;
            ipcRenderer.invoke("sendTabUpdate");
        }
    },
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

window.getBrowserName = () => ipcRenderer.invoke('getBrowserName');

window.lmn.setBrowserStyleProperty("color-scheme", "dark");

window.addEventListener('keydown', (event) => {
    console.log(event.key);
    ipcRenderer.invoke("keydown", event.key);
});