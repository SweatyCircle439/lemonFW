let ismaximized = true;

let maxunmaxcooldown = 100;

let maxunmaxcooldowncurrent  = 0;

window.setInterval(() => {
    maxunmaxcooldowncurrent -= maxunmaxcooldown / 3;
    if (maxunmaxcooldowncurrent <= 0) {
        maxunmaxcooldowncurrent = 0;
    }
}, maxunmaxcooldown / 3);

function unmax() {
    if (maxunmaxcooldowncurrent == 0) {
        window.unmaximize();
        document.getElementById('maximize').innerText = 'g';
        maxunmaxcooldowncurrent = maxunmaxcooldown;
    }
}

function max() {
    if (maxunmaxcooldowncurrent == 0) {
        window.maximize();
        document.getElementById('maximize').innerText = 's';
        maxunmaxcooldowncurrent = maxunmaxcooldown;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tortoggle = document.getElementById('torToggle');
    let torEnabled = false;
    function updateTorIcon() {
        tortoggle.innerHTML = `
            <img src="assets/logo/logoTor.png" alt="Tor" style="width: 20px; height: 20px;">
            ${
                torEnabled ?
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M192 64C86 64 0 150 0 256S86 448 192 448l192 0c106 0 192-86 192-192s-86-192-192-192L192 64zm192 96a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"/></svg>` :
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M384 128c70.7 0 128 57.3 128 128s-57.3 128-128 128l-192 0c-70.7 0-128-57.3-128-128s57.3-128 128-128l192 0zM576 256c0-106-86-192-192-192L192 64C86 64 0 150 0 256S86 448 192 448l192 0c106 0 192-86 192-192zM192 352a96 96 0 1 0 0-192 96 96 0 1 0 0 192z"/></svg>`
            }
        `
    }
    tortoggle.addEventListener('click', async () => {
        torEnabled = !torEnabled;
        try {
            await window.setTorEnabled(torEnabled);
        } catch (error) {
            console.error(error);
        }
        updateTorIcon();
    });
    updateTorIcon();
    document.getElementById("newTab").addEventListener("click", async () => {
        openTab(await createTab());
    });
    document.getElementById('maximize').addEventListener('click',
        () => {
            if (ismaximized) {
                unmax();
            }else {
                max();
            }
            ismaximized = !ismaximized;
        }
    );
});
setBrowserStylePropertyChangeListener((property, value) => {
    if (property == "color-scheme") {
        let colorScheme = value.replace("_", "");
        document.documentElement.style.setProperty(`--titlebar-background`, `var(--theme-titlebar-background-${colorScheme})`);
        document.documentElement.style.setProperty(`--titlebar-text-color`, `var(--theme-titlebar-text-color-${colorScheme})`);
        document.documentElement.style.setProperty(`--titlebar-hover-color`, `var(--theme-titlebar-hover-color-${colorScheme})`);
        document.documentElement.style.setProperty(`--main-tabinfo-background`, `var(--theme-main-tabinfo-background-${colorScheme})`);
        document.documentElement.style.setProperty(`--main-urlbar-background`, `var(--theme-main-urlbar-background-${colorScheme})`);
        document.documentElement.style.setProperty(`--main-text-color`, `var(--theme-main-text-color-${colorScheme})`);
        document.documentElement.style.setProperty(`--main-button-color`, `var(--theme-main-button-color-${colorScheme})`);
        document.documentElement.style.setProperty(`--main-button-color`, `var(--theme-main-button-color-${colorScheme})`);
        document.documentElement.style.setProperty(`--main-button-hover-color`, `var(--theme-main-button-hover-color-${colorScheme})`);
        document.documentElement.style.setProperty(`--main-base-tab-background`, `var(--theme-main-base-tab-background-${colorScheme})`);
        document.documentElement.style.setProperty(`--main-base-tab-hover-background`, `var(--theme-main-base-tab-hover-background-${colorScheme})`);
        document.documentElement.style.setProperty(`--main-base-tab-clip-path`, `var(--theme-main-base-tab-clip-path-${colorScheme})`);
        return
    }
    document.documentElement.style.setProperty(`--main-${property}`, value);
});

async function load () {
    const urlbar = document.querySelector(".urlbar");
    const tldlist = await getTldList();
    const geturl = () => {
        return urlbar.value;
    }
    animation = document.querySelector("#reload svg").animate([{ transform: "rotate(0)" },
        { transform: "rotate(360deg)" },], {duration: 5000, iterations: 999999999999999})
    try {
        await redirectTab(await getCurrentTab(), geturl());
        animation.cancel();
    } catch (e) {
        animation.cancel();
        switch (e.toString().split("Error: ")[2].split(" ")[0]) {
            case "ERR_CONNECTION_TIMED_OUT":
                await redirectTab(await getCurrentTab(), "lmn://error/timedout");
                break;
        
            default:
                await redirectTab(await getCurrentTab(), "lmn://error/henk");
                break;
        }
    }
}
async function main() {

    const browserName = await window.getBrowserName();
    const title = document.createElement('title');
    title.innerText = browserName;
    document.body.appendChild(title);
    
    window.openTab(await window.createTab());

    document.getElementById('minimize').addEventListener('click', () => {
        window.minimize();
    });

    document.getElementById('close').addEventListener('click', () => {
        window.close();
    });
    /** @type {HTMLInputElement} */
    const urlbar = document.querySelector(".urlbar");
    urlbar.addEventListener("keypress", (e) => {
        if (e.key == "Enter") {
            load();
        }
    });
    setRedirectListener((url) => {
        urlbar.value = url;
    });
    document.getElementById("reload").onclick = () => {
        load();
    }
}
document.addEventListener("DOMContentLoaded", main);

window.setUpdateTabsListener(async(tabs) => {
    const tabsElement = document.getElementById('tabs');
    tabsElement.innerHTML = "";
    for (const tab of tabs) {
        const tabElement = document.createElement("div");
        tabElement.classList.add("tab");
        tabElement.style.background = tab.style.background ? tab.style.background : "";
        tabElement.style.clipPath = tab.style.clipPath ? tab.style.clipPath : "";
        tabElement.innerHTML = tab.innerHTML ? tab.innerHTML : `<img class=\"tab-icon\" data-replace=\"src\" data-replaceWith=\"icon\"></img><p class=\"tab-name\" data-replace=\"innerText\" data-replaceWith=\"title\"></p>`;
        tabElement.addEventListener("click", async() => {
            await window.openTab(tab.id);
        });
        for (const key in tab.css) {
            if (Object.prototype.hasOwnProperty.call(tab.css, key)) {
                const value = tab.css[key];
                tabElement.style[key] = value;
            }
        }
        if (!tab.hidden) {
            tabsElement.appendChild(tabElement);
        }
        function replaceElem(e) {
            for (const child of e.children) {
                if (child.tagName === "SCRIPT") {
                    child.remove();
                }
                if (child.dataset.replace) {
                    if (child.dataset.replacewith) {
                        let result = "";
                        if (child.dataset.replacewith == "icon") {
                            result = tab.icon;
                        }
                        if (child.dataset.replacewith == "title") {
                            console.log(tab);
                            result = tab.name;
                        }
                        console.log(child.dataset.replacewith);
                        console.log(result);
                        child[child.dataset.replace] = result;
                    }
                }
                for (const key in child) {
                    if (key.startsWith('on')) {
                        child[key] = () => {};
                    }
                }
                replaceElem(child);
            }
        }
        tabElement.style.position = 'relative';
        tabElement.style.top = 'unset';
        tabElement.style.left = 'unset';
        tabElement.style.bottom = 'unset';
        tabElement.style.right = 'unset';
        tabElement.style.marginLeft = 'unset';
        tabElement.style.marginRight = 'unset';
        tabElement.style.marginTop = 'unset';
        tabElement.style.marginBottom = 'unset';
        replaceElem(tabElement);
        const tabCloseElement = document.createElement('button');
        tabCloseElement.innerText = "x";
        tabCloseElement.classList.add("tab-close");
        tabCloseElement.addEventListener('click', () => {
            window.closeTab(tab.id);
        });
        tabElement.appendChild(tabCloseElement);
    }
});