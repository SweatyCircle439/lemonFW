const { ipcRenderer } = require('electron');
const path = require('path');

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

ipcRenderer.on("resetBrowserStyle", (event) => {
    window.browserStyleResetListener();
});