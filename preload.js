const { ipcRenderer } = require('electron');
const path = require('path');

window.getTabs = () => ipcRenderer.invoke("getTabs");

window.getBrowserName = () => ipcRenderer.invoke('getBrowserName');

window.createTab = () => ipcRenderer.invoke('createTab');

window.openTab = (tabid) => ipcRenderer.invoke('openTab', tabid);

window.closeTab = (tabid) => ipcRenderer.invoke('closeTab', tabid);

window.redirectTab = (tabid, url) => ipcRenderer.invoke('redirectTab', tabid, url);

window.maximize = () => ipcRenderer.invoke('maximize');

window.unmaximize = () => ipcRenderer.invoke('unmaximize');

window.minimize = () => ipcRenderer.invoke('minimize');

window.getCurrentTab = () => ipcRenderer.invoke('getCurrentTab');

window.getTldList = () => ipcRenderer.invoke('getTldList');

window.redirectListener = () => {};

window.browserStylePropertyChangeListener = () => {};

window.browserStyleResetListener = () => {};

window.setRedirectListener = (listener) => window.redirectListener = listener;

window.setBrowserStylePropertyChangeListener = (listener) => window.browserStylePropertyChangeListener = listener;

window.setBrowserStyleResetListener = (listener) => window.browserStyleResetListener = listener;

ipcRenderer.on("redirect", (event, url) => {
    window.redirectListener(url);
});

ipcRenderer.on("setBrowserStyleProperty", (event, property, value) => {
    window.browserStylePropertyChangeListener(property, value);
});

ipcRenderer.on("resetBrowserStyle", (_) => {
    window.browserStyleResetListener();
});

let stagedTabUpdates = [];

window.updateTabsListener = (tabs) => {
    stagedTabUpdates = tabs;
};

ipcRenderer.on("tabUpdate", (_, tabs) => {
    window.updateTabsListener(tabs);
});

window.setUpdateTabsListener = (listener) => {
    window.updateTabsListener = listener;
    listener(stagedTabUpdates);
};

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("update").onclick = () => {
        document.getElementById("update").classList.add("updating");
        ipcRenderer.invoke("update");
    };
});

window.addEventListener('keydown', (event) => {
    console.log(event.key);
    ipcRenderer.invoke("keydown", event.key);
});
