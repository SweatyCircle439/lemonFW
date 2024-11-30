const { ipcRenderer, contextBridge } = require('electron');
const path = require('path');
const { remote } = require('@electron/remote');
window.minimize = () => ipcRenderer.invoke('minimize');

window.progresschangelistener = (prog) => {}
window.setprogresschangelistener = (listener) => window.progresschangelistener = listener;

ipcRenderer.on('progress', ...args => {args.shift(); window.progresschangelistener(args); });