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
    class CodeView {
        constructor({ containerId, value = "", disabled = false }) {
            this.containerId = containerId;
            this.editor;
            this.value = value;
            this.container = document.getElementById(this.containerId);
            const thi = this;
            require(["vs/editor/editor.main"], async () => {
                thi.editor = monaco.editor.create(thi.container, {
                    value: thi.value,
                    language: "html",
                    theme: "vs-dark",
                });
                console.log("resizing this editor");
                thi.resizeCodeView();
                window.addEventListener("resize", () => thi.resizeCodeView());
            });
            editors.push(this);
        }
        resizeCodeView() {
            console.trace(this.containerId);
            console.trace(this.container);
            const { offsetWidth, offsetHeight } = this.container;
            this.editor.layout({
                width: offsetWidth,
                height: offsetHeight,
            });
        }
        setValue(value) {
            this.value = value;
            this.editor.getModel().setValue(value);
        }
    }
    (async () => {
        new CodeView({
            containerId: "codecontainer",
            value: await window.getHTML(),
        });
    })();
    new CodeView({
        containerId: "consolecommand",
    });
    new CodeView({
        containerId: "consoleoutput",
    });
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
    document.getElementById("resize-bar").ondragstart = async (_) => {
        window.sendResize("start");
    };
    document.getElementById("resize-bar").ondragend = async (_) => {
        window.sendResize("stop");
    };
});
