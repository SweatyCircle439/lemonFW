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

ipcRenderer.on("setTabID", (_, tabID) => {
    Object.defineProperty(window.lmn, "tabID", {
        get: () => tabID,
        set: () => {}
    });
});

/**
 * 
 * @param {HTMLScriptElement} script 
 */
const execNodeJS = (script) => {
    async function exec(v) {
        await new Promise(res => {
            function clock() {
                if (window.lmn.tabID) {
                    res();
                }else {
                    setTimeout(clock, 100);
                }
            }
            clock();
        });
        console.log("executing " + v);
        ipcRenderer.invoke("execNodeJS", v, window.lmn.tabID)
    }
    window.lmn.execNodeJS = exec;
    if (script.src) {
        fetch(script.src)
            .then(
                v => v.text()
                    .then(
                        exec
                    )
            )
            .catch(e => {throw e});
        script.src = "";
    }else {
        exec(script.innerHTML);
        script.innerHTML = "";
    }
};

const execPython = (script) => {
    async function exec(v) {
        await new Promise(res => {
            function clock() {
                if (window.lmn.tabID) {
                    res();
                }else {
                    setTimeout(clock, 100);
                }
            }
            clock();
        });
        console.log("executing " + v);
        ipcRenderer.invoke("execPython", v, window.lmn.tabID)
    }
    window.lmn.execPython = exec;
    if (script.src) {
        fetch(script.src)
            .then(
                v => v.text()
                    .then(
                        exec
                    )
            )
            .catch(e => {throw e});
        script.src = "";
    }else {
        exec(script.innerHTML);
        script.innerHTML = "";
    }
};

const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'SCRIPT' && node.getAttribute('lang') === 'nodeJS') {
                    execNodeJS(node);
                }else if (node.tagName === 'SCRIPT' && node.getAttribute('lang') === 'python') {
                    execPython(node);
                }
            });
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('script[lang="nodeJS"]').forEach(execNodeJS);
    document.querySelectorAll('script[lang="python"]').forEach(execPython);
    observer.observe(document.head, { childList: true, subtree: true });
    observer.observe(document.body, { childList: true, subtree: true });
});

window.getBrowserName = () => ipcRenderer.invoke('getBrowserName');

window.lmn.setBrowserStyleProperty("color-scheme", "dark");

window.addEventListener('keydown', (event) => {
    ipcRenderer.invoke("keydown", event.key);
});

document.addEventListener('contextmenu', (e) => {
    setTimeout(() => {
        if (e.defaultPrevented) return;
        const customMenu = document.createElement('ul');
        customMenu.style.display = 'block';
    
        customMenu.style.left = (e.pageX - 25) + 'px';
        customMenu.style.top = (e.pageY - 25) + 'px';

        customMenu.style.backgroundColor = '#1e1e1e';
        customMenu.style.color = '#ffffff';
        customMenu.style.padding = '0px';
        customMenu.style.margin = '0px';
        customMenu.style.border = "1px solid darkgray";
        customMenu.style.zIndex = '999999999999999999999999999999999999999999999999999999999999999999999999999999999999';
        customMenu.style.position = 'absolute';
        customMenu.style.borderRadius = "10px";
        customMenu.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
        customMenu.style.overflow = "hidden";
        customMenu.innerText = 'lemon context menu V1.0.0';
        
        function closeMenu() {
            customMenu.animate([{opacity: 1}, {opacity: 0}], {
                duration: 200,
                easing: 'ease-in-out'
            });
            setTimeout( _ => document.body.removeChild(customMenu), 190);
            customMenu.removeEventListener('mouseleave', closeMenu);
        }

        const items = [
            {
                name: 'inspect',
                action: () => {
                    ipcRenderer.invoke('inspect');
                }
            }
        ]

        for (const item of items) {
            const itemli = document.createElement('li');
            itemli.textContent = item.name;
            itemli.addEventListener('click', () => {
                item.action();
                closeMenu();
            });
            itemli.style.cursor = 'pointer';
            itemli.style.listStyleType  = 'none';
            itemli.style.padding = '5px 10px';
            itemli.style.backgroundColor = '';
            itemli.addEventListener('mouseover', () => {
                itemli.style.backgroundColor = '#2e2e2e';
            });
            itemli.addEventListener('mouseleave', () => {
                itemli.style.backgroundColor = '';
            });

            customMenu.appendChild(itemli);
        }

        document.body.appendChild(customMenu);

        customMenu.animate([{opacity: 0, transform: 'translateY(-100px)'}, {opacity: 1, transform: 'translateY(0)'}], {
            duration: 200,
            easing: 'ease-in-out'
        });
        customMenu.addEventListener('mouseleave', closeMenu);
    }, 0);
});