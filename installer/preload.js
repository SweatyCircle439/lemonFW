const { ipcRenderer } = require('electron');
const path = require('path');
const { remote } = require('@electron/remote');
window.minimize = () => ipcRenderer.invoke('minimize');


window.install = async (...param) => {
    const response = await ipcRenderer.invoke('install', ...param);
    return await response;
}