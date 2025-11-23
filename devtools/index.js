const rootMonacoPath =
    (() => {
        const list = window.location.href.split("/");
        list.splice(list.length - 1);
        return list.join("/").replace("///", "//");
    })() + "/monaco-editor";
document.addEventListener("DOMContentLoaded", async (_) => {
    require.config({ paths: { vs: `${rootMonacoPath}/vs` } });
    window.MonacoEnvironment = { getWorkerUrl: () => proxy };

    let proxy = URL.createObjectURL(
        new Blob(
            [
                `
    self.MonacoEnvironment = {
        baseUrl: '${rootMonacoPath}',
    };
    importScripts('${rootMonacoPath}/vs/base/worker/workerMain.js');
`,
            ],
            { type: "text/javascript" }
        )
    );

    /** @type {CodeView[]} */
    const editors = [];

    require(["vs/editor/editor.main"], async () => {
        monaco.languages.register({ id: 'log' });

        monaco.languages.setMonarchTokensProvider('log', {
            tokenizer: {
                root: [
                    [/[\​].{1,}/g, 'invalid'],
                    [/[\‍].{1,}/g, "constant"],
                    [/[\‌].{1,}/g, 'string.escape'],
                    [/\b\d+\b/, 'number'],      // Numbers
                    [/\b(true|false)\b/, 'boolean'], // Booleans
                    [/".*?"/, 'string'],        // Strings
                    [/\b(if|else|for|while)\b/, 'keyword'], // Keywords
                    [/[{}()\[\]]/, 'delimiter'], // Delimiters
                    [/\/\/.*/, 'comment'],      // Comments
                ]
            }
        });

        monaco.languages.setLanguageConfiguration('log', {
            brackets: [['{', '}'], ['[', ']'], ['(', ')']],
            autoClosingPairs: [{ open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' }]
        });
    });
    class CodeView {
        constructor({
            containerId,
            value = "",
            disabled = false,
            language = "javascript",
            invisibleCharactersOrangeRendering = true,
        }) {
            this.containerId = containerId;
            this.editor;
            this.value = value;
            this.disabled = disabled;
            this.language = language;
            this.container = document.getElementById(this.containerId);
            this.invisibleCharactersOrangeRendering = invisibleCharactersOrangeRendering;
            this.onChange = () => {};
            const thi = this;
            require(["vs/editor/editor.main"], async () => {
                thi.editor = monaco.editor.create(thi.container, {
                    value: thi.value,
                    language: this.language,
                    theme: "vs-dark",
                    readOnly: this.disabled
                });
                console.log("resizing this editor");
                thi.resizeCodeView();
                window.addEventListener("resize", () => thi.resizeCodeView());
                thi.editor.getModel().onDidChangeContent(() => {
                    thi.value = this.editor.getValue();
                    this.onChange();
                });
            });
            editors.push(this);
        }
        resizeCodeView(width, height) {
            const { offsetWidth, offsetHeight } = this.container;
            this.editor.layout({
                width: typeof width == "undefined" ? offsetWidth : width,
                height: typeof height == "undefined" ? offsetHeight : height,
            });
        }
        setValue(value) {
            this.value = value;
            this.editor.getModel().setValue(value);
            this.onChange();
        }
    }
    /** @type {CodeView} */
    let codeEditor;
    (async () => {
        codeEditor = new CodeView({
            containerId: "codecontainer",
            value: await window.getHTML(),
            language: "html",
        });
    })();
    const consolecommand = new CodeView({
        containerId: "consolecommand",
    });
    const consoleoutput = new CodeView({
        containerId: "consoleoutput",
        value: ``,
        disabled: true,
        language: "log",
        invisibleCharactersOrangeRendering: false,
    });
    function defaultGlobalFunction(name, parameters, returnType) {
        const functionDefinition = `declare function ${name}(${parameters}): ${returnType};`;
        
        require(["vs/editor/editor.main"], async () => {
            monaco.languages.typescript.javascriptDefaults.addExtraLib(functionDefinition, `custom/${name}.d.ts`);
        });
    }
    function defaultGlobalVar(name, type) {
        const definition = `declare const ${name}: ${type};`;
        require(["vs/editor/editor.main"], async () => {
            monaco.languages.typescript.javascriptDefaults.addExtraLib(definition, `custom/${name}.d.ts`);
        });
    }
    defaultGlobalVar("lmn", `{
        lmntab: {
            InnerHTML(html: string): void,
            StyleProperty(property: string, value: string): void,
            css(property: string, value: string): void
        },
        setBrowserStyleProperty(property: string, value: string): void,
        /**
         * similair to \`lmn.\`
         * 
         * only works on the \`file://\` protocol
        */
        setDefaultBrowserStyleProperty(property: string, value: string): void,
        /**
         * returns the local ip of the device
         * 
         * only works on the \`file://\` protocol
        */
        getIP(): String?,
        startFPhost(): void,
        /**
         * executes the \`script\` within node.js
         * 
         * ### CONNECTIONS
         * 
         * \`console\` - is connected to the \`console\` of this tab
         * 
         * \`__urlhref\` - \`window.location.href\`
         * 
         * \`__downloads\` - the users downloads directory
         * 
         * \`__homedir\` - the users home directory
         * \`\`\`js
         * lmn.execNodeJS(\`
         * \`\`\`
         * \`\`\`js
         *     const path = require("path");
         *     pass("JS", path.join(__downloads, "download.txt"))
         * \`\`\`
         * \`\`\`js
         * \`)
         * \`\`\`
         * @param script the script to execute
         */
        execNodeJS(script: string): void,
        tabID: String,
    }`);

    document.querySelectorAll("#tabs button").forEach((b) => {
        try {
            if (!b.classList.contains("active")) {
                document.getElementById(b.dataset.open).style.display = "none";
            }
        } catch (error) {}
    });
    document.querySelectorAll("#tabs button").forEach((e) => {
        e.onclick = () => {
            document.querySelectorAll("#tabs button").forEach((b) => {
                try {
                    b.classList.remove("active");
                    document.getElementById(b.dataset.open).style.display =
                        "none";
                } catch (error) {}
            });
            e.classList.add("active");
            document.getElementById(e.dataset.open).style.display = "flex";
            for (const editor of editors) {
                if (editor.editor) {
                    console.log("resizing editors");
                    editor.resizeCodeView();
                }
            }
        };
    });
    document.querySelectorAll("#styletabs button").forEach((b) => {
        try {
            if (!b.classList.contains("active")) {
                document.getElementById(b.dataset.open).style.display = "none";
            }
        } catch (error) {}
    });
    document.querySelectorAll("#styletabs button").forEach((e) => {
        e.onclick = () => {
            document.querySelectorAll("#styletabs button").forEach((b) => {
                try {
                    b.classList.remove("active");
                    document.getElementById(b.dataset.open).style.display =
                        "none";
                } catch (error) {}
            });
            e.classList.add("active");
            document.getElementById(e.dataset.open).style.display = "flex";
            for (const editor of editors) {
                if (editor.editor) {
                    console.log("resizing editors");
                    editor.resizeCodeView();
                }
            }
        };
    });
    let resizing = false;
    document.getElementById("resize-bar").onclick = (e) => {
        resizing = !resizing;
        if (resizing) {
            window.sendResize("start");
        } else {
            window.sendResize("stop");
        }
    };
    let mouseleftrb = false;
    document.getElementById("resize-bar").onmouseleave = (_) => {
        if (resizing) {
            mouseleftrb = true;
            window.setTimeout((_) => {
                if (mouseleftrb) {
                    resizing = false;
                    window.sendResize("stop");
                }
            }, 1600);
        }
    };
    let resizingConsole = false;
    let mouseX = 0;
    let mouseY = 0;
    window.addEventListener("mousedown", (e) => {
        mouseX = e.pageX;
        mouseY = e.pageY;
    });
    window.addEventListener("mousemove", (e) => {
        mouseX = e.pageX;
        mouseY = e.pageY;
        if (resizingConsole) {
            let height = window.innerHeight - mouseY;
            height -= parseInt(
                getComputedStyle(document.getElementById("consoleoptions"))
                    .height
            );
            height -=
                parseInt(
                    getComputedStyle(document.getElementById("consoleresize"))
                        .height
                ) / 2;
            document.getElementById("consoleSendButton").style.bottom =
                height - 20 + "px";
            document.getElementById("consolecommandsizepreview").style.height =
                height + "px";
        }
    });
    let consoleCooldown = 0;
    setInterval(() => {
        consoleCooldown -= 30;
    }, 30);
    document.getElementById("consoleresize").onclick = (e) => {
        if (consoleCooldown <= 0) {
            consoleCooldown = 100;
            if (resizingConsole) {
                resizingConsole = false;
                document.getElementById("consoleoptions").style.visibility =
                    "visible";
                document.getElementById("consoleoutput").style.flex = "";
                document.getElementById("consolecommand").style.height =
                    getComputedStyle(
                        document.getElementById("consolecommandsizepreview")
                    ).height;
                document
                    .getElementById("consolecommandsizepreview")
                    .classList.remove("active");
                document
                    .getElementById("consoleoutputsizepreview")
                    .classList.remove("active");
                document.getElementById("consoleSendButton").style.visibility =
                    "visible";
                consolecommand.resizeCodeView();
                consoleoutput.resizeCodeView();
                return;
            }
            consolecommand.resizeCodeView(0, 0);
            consoleoutput.resizeCodeView(0, 0);

            document.getElementById("consoleSendButton").style.visibility =
                "hidden";
            document.getElementById("consolecommandsizepreview").style.height =
                getComputedStyle(consolecommand.container).height;
            document
                .getElementById("consolecommandsizepreview")
                .classList.add("active");
            document
                .getElementById("consoleoutputsizepreview")
                .classList.add("active");
            document.getElementById("consolecommand").style.height = "0px";
            document.getElementById("consoleoutput").style.flex = "unset";
            document.getElementById("consoleoptions").style.visibility =
                "hidden";
            resizingConsole = true;
        }
    };
    let consoleoutputappends = [];
    const consoletab = document.getElementById("consoletab");
    const consoletabIHTMLOPTIONS = {
        error_warning:
            '<span style="color:red"><span></span><span style="color:orange"></span><span>console</span></span>',
        error: '<span style="color:red"><span></span><span>console</span></span>',
        warning:
            '<span style="color:orange"><span></span><span>console</span></span>',
    };
    window.log = (m) => {
        consoleoutputappends.push(` "${m.split("\n").join("\n‍")}"\n`);
        updateconsole();
        console.log(m);
    };
    window.warning = (m) => {
        consoleoutputappends.push(` "${m.split("\n").join("\n‌")}"\n`);
        updateconsole();
        switch (consoletab.innerHTML) {
            case consoletabIHTMLOPTIONS.error_warning:
                break;
            case consoletabIHTMLOPTIONS.warning:
                break;
            case consoletabIHTMLOPTIONS.error:
                consoletab.innerHTML = consoletabIHTMLOPTIONS.error_warning;
                break;
            default:
                consoletab.innerHTML = consoletabIHTMLOPTIONS.warning;
                break;
        }
        console.log(m);
    };
    window.error = (m) => {
        consoleoutputappends.push(` "${m.split("\n").join("\n​")}"\n`);
        updateconsole();
        switch (consoletab.innerHTML) {
            case consoletabIHTMLOPTIONS.error_warning:
                break;
            case consoletabIHTMLOPTIONS.error:
                break;
            case consoletabIHTMLOPTIONS.warning:
                consoletab.innerHTML = consoletabIHTMLOPTIONS.error_warning;
                break;
            default:
                consoletab.innerHTML = consoletabIHTMLOPTIONS.error;
                break;
        }
        console.log(m);
        document.getElementById("consoleSendButton").disabled = false;
    };
    document.getElementById("consoleSendButton").onclick = async (_) => {
        document.getElementById("consoleSendButton").disabled = true;
        let lemonscoping = document.getElementById("devtoolsScope").checked;
        consoleoutputappends.push(
            `${lemonscoping ? "(LS) >>" : ">"} ${consolecommand.value}\n`
        );
        updateconsole();
        consoleoutputappends.push(
            `< ${
                (await window.runConsole(consolecommand.value, lemonscoping))
                    .result
            }\n`
        );
        updateconsole();
        document.getElementById("consoleSendButton").disabled = false;
        consolecommand.setValue("");
    };
    const updateconsole = () => {
        try {
            consoleoutput.setValue(
                `${consoleoutput.value}${consoleoutputappends.join("")}`
            );
            consoleoutputappends = [];
        } catch (error) {}
    };
    async function updateElementTree() {
        const tree = await window.getElementTree();
        const treeview = document.getElementById("elementtree");
        treeview.innerHTML = "";
        const buttons = [];
        console.log(tree);
        function serialize(element, treeview) {
            console.log(element);
            const li = document.createElement("li");
            const button = document.createElement("button");
            for (const namepart of element.name) {
                const span = document.createElement("span");
                span.innerText = namepart.val;
                span.style.color = namepart.col;
                span.style.fontWeight = namepart.weight;
                button.appendChild(span);
            }
            button.dataset.selector = JSON.stringify(element.selector);
            button.addEventListener("mouseover", async _ => {
                const selector = await debug("getQuerySelector", element.selector);
                await debug("highlight", selector);
            });
            button.onclick = async () => {
                for (const btn of buttons) {
                    btn.classList.remove("active");
                }
                button.classList.add("active");
                /** @type {CSSStyleDeclaration} */
                const computedstyle = {};
                const decleration = await window.getDocumentComputedStyle(element.selector);
                for (const dec in decleration) {
                    if (isNaN(parseInt(dec)))
                        computedstyle[dec] = decleration[dec];
                }
                document.getElementById("elementBlock").style.width = computedstyle.width;
                document.getElementById("elementBlock").style.height = computedstyle.height;
                document.getElementById("leftPaddingElementBlock").style.width = computedstyle.paddingLeft;
                document.getElementById("leftPaddingElementBlock").style.height = 
                    parseInt(computedstyle.height) + parseInt(computedstyle.paddingTop) + parseInt(computedstyle.paddingBottom) + "px";
                document.getElementById("leftPaddingElementBlock").style.transform = `translate(-${parseInt(computedstyle.width) / 2}px, -50%) translateX(-100%) translateY(${-((parseInt(computedstyle.paddingTop) - parseInt(computedstyle.paddingBottom)) / 2)}px)`;

                document.getElementById("rightPaddingElementBlock").style.width = computedstyle.paddingRight;
                document.getElementById("rightPaddingElementBlock").style.height = 
                    parseInt(computedstyle.height) + parseInt(computedstyle.paddingTop) + parseInt(computedstyle.paddingBottom) + "px";
                document.getElementById("rightPaddingElementBlock").style.transform = `translate(${parseInt(computedstyle.width) / 2}px, -50%) translateY(${-((parseInt(computedstyle.paddingTop) - parseInt(computedstyle.paddingBottom)) / 2)}px)`;
                
                document.getElementById("topPaddingElementBlock").style.height = computedstyle.paddingTop;
                    document.getElementById("topPaddingElementBlock").style.width = 
                    parseInt(computedstyle.width) + parseInt(computedstyle.paddingLeft) + parseInt(computedstyle.paddingRight) + "px";
                document.getElementById("topPaddingElementBlock").style.transform = `translate(-50%, -${parseInt(computedstyle.height) / 2}px) translateY(-100%) translateX(${-((parseInt(computedstyle.paddingLeft) - parseInt(computedstyle.paddingRight)) / 2)}px)`;
                
                document.getElementById("bottomPaddingElementBlock").style.height = computedstyle.paddingBottom;
                    document.getElementById("bottomPaddingElementBlock").style.width = 
                    parseInt(computedstyle.width) + parseInt(computedstyle.paddingLeft) + parseInt(computedstyle.paddingRight) + "px";
                document.getElementById("bottomPaddingElementBlock").style.transform = `translate(-50%, ${parseInt(computedstyle.height) / 2}px) translateX(${-((parseInt(computedstyle.paddingLeft) - parseInt(computedstyle.paddingRight)) / 2)}px)`;

                document.getElementById("leftBorderElementBlock").style.width = computedstyle.borderLeftWidth;
                document.getElementById("leftBorderElementBlock").style.height = 
                    parseInt(computedstyle.height) +
                    parseInt(computedstyle.paddingTop) +
                    parseInt(computedstyle.paddingBottom) + 
                    parseInt(computedstyle.borderTopWidth) +
                    parseInt(computedstyle.borderBottomWidth) + 
                    "px";
                document.getElementById("leftBorderElementBlock").style.transform = `translate(-${(parseInt(computedstyle.width) / 2) + parseInt(computedstyle.paddingLeft)}px, -50%) translateX(-100%)`;

                document.getElementById("rightBorderElementBlock").style.width = computedstyle.borderRightWidth;
                document.getElementById("rightBorderElementBlock").style.height = 
                    parseInt(computedstyle.height) +
                    parseInt(computedstyle.paddingTop) +
                    parseInt(computedstyle.paddingBottom) + 
                    parseInt(computedstyle.borderTopWidth) +
                    parseInt(computedstyle.borderBottomWidth) + 
                    "px";
                document.getElementById("rightBorderElementBlock").style.transform = `translate(${(parseInt(computedstyle.width) / 2) + parseInt(computedstyle.paddingRight)}px, -50%)`;
            };
            buttons.push(button);
            if (element.children.length > 0) {
                const details = document.createElement("details");
                details.open = false;
                const summary = document.createElement("summary");
                summary.appendChild(button);
                details.appendChild(summary);
                const ul = document.createElement("ul");
                details.appendChild(ul);
                li.appendChild(details);
                for (const child of element.children) {
                    serialize(child, ul);
                }
            } else {
                li.appendChild(button);
            }
            treeview.appendChild(li);
        }
        serialize(tree, treeview);
    }
    updateElementTree();
    async function updateCode() {
        codeEditor.setValue(await window.getHTML());
    }
    window.redirect = () => {
        updateCode();
        updateElementTree();
    };
    document.getElementById("close").onclick = window.closeDevTools;
    document.getElementById("hoverSelect").onclick = async() => {
        const promise = updateElementTree();
        const selector = await debug("searchNode");
        console.log(selector);
        await promise;
        document.querySelectorAll("button").forEach(v => {
            if (typeof v.dataset.selector === "string") {
                console.log("has selector");
                function open (element) {
                    if (element instanceof HTMLDetailsElement) {
                        element.open = true;
                        console.log(element.parentElement.parentElement.parentElement);
                        open(element.parentElement.parentElement.parentElement);
                    }
                }
                if (!JSON.parse(v.dataset.selector).map((v, i) => v === selector[i]).includes(false)) {
                    console.log("found selector");
                    v.click();
                    console.log(v.parentElement.parentElement.parentElement);
                    open(v.parentElement.parentElement.parentElement);
                }
            }
        });
    }
});
window.log = (m) => {};
window.warning = (m) => {};
window.error = (m) => {};
window.redirect = () => {};
