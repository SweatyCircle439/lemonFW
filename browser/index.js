let maxcooldown = 0;
let ismaximized = true;

function unmax() {
    window.unmaximize();
    document.getElementById('maximize').innerText = 'g';
}

function max() {
    window.maximize();
    document.getElementById('maximize').innerText = 's';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("newTab").addEventListener("click", async () => {
        openTab(await createTab());
    });
    document.getElementById('maximize').addEventListener('click',
        () => {
            if (maxcooldown == 0) {
                ismaximized ? unmax() : max();
                ismaximized = !ismaximized;
                maxcooldown = 50;
            }
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
        if (urlbar.value == "") {
            return "lmn://newtab";
        }
        if (urlbar.value.startsWith("file:///")) {
            return `${urlbar.value}`;
        }
        if (urlbar.value.startsWith("lmn://")) {
            return `${urlbar.value}`;
        }
        if (urlbar.value.startsWith("data:")) {
            return `${urlbar.value}`;
        }
        if (urlbar.value.startsWith("http://")) {
            return `${urlbar.value}`;
        }else if (urlbar.value.startsWith("https://")) {
            return `${urlbar.value}`;
        }else if (urlbar.value.startsWith("localhost")) {
            return `http://${urlbar.value}`;
        }
        for (const tld of tldlist) {
            if (urlbar.value.split("/")[0].toUpperCase().endsWith(`.${tld}`)) {
                return `http://${urlbar.value}`;
            }
        }
        return `https://duckduckgo.com/?q=${encodeURI(urlbar.value)}`;
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

    document.getElementById('maximize').addEventListener('click', () => {
            window.maximize();
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

function updatemaxcooldown () {
    if (maxcooldown > 0) {
        maxcooldown--;
    }
    window.requestAnimationFrame(updatemaxcooldown);
}

updatemaxcooldown();

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