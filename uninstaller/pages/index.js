let currentpage = "start";

const installexecutables = {};

function changePage(page) {
    document.getElementById(currentpage).classList.remove("currentpage");
    document.getElementById(page).classList.add("currentpage");
    currentpage = page;
    if (page == "install") {
        document.querySelector(".loadingcircle").classList.add("active");
        document.getElementById("selectversionback").disabled = true;
        document.getElementById("installlog").innerText = "please wait while the installer uninstalls lemon";
        install().then(
            (result) => {
                document.getElementById("installlog").innerText = result;
                document.querySelector(".loadingcircle").classList.remove("active");
                if (result == "successfully removed the lemon edition") {
                    changePage("finished");
                }else {
                    changePage("failed");
                    document.getElementById("exitcode").innerText = result;
                }
            }
        );
    }
}

document.addEventListener("DOMContentLoaded", async() => {
    const packedEditionsElement = document.getElementById("packedEditions");
    const fetch = await window.fetch("packededitions/.lmn");
    const lmnFile = JSON.parse(await fetch.text());
    for (const instance of lmnFile) {
        const editionOptionElement = document.createElement("input");
        editionOptionElement.type = "radio";
        editionOptionElement.value = editionOptionElement.id = instance;
        editionOptionElement.name = "edition";
        const editionElement = document.createElement("label");
        editionElement.htmlFor = editionOptionElement.id;
        editionElement.classList.add("edition");
        const editionimage = document.createElement("img");
        editionElement.appendChild(editionimage);
        const editionName = document.createElement("p");
        editionElement.appendChild(editionName);
        const editionVersion = document.createElement("p");
        editionVersion.classList.add("grayed")
        editionElement.appendChild(editionVersion);
        editionElement.appendChild(editionOptionElement);
        try {
            const zip = new JSZip();
            const lmnFetch = await window.fetch(`packededitions/${instance}`);
            const lmnContents = await zip.loadAsync(await lmnFetch.arrayBuffer());
            const manifest = JSON.parse(await zip.file(".lmn").async('text'));
            installexecutables[instance] = manifest.installers.windows;
            async function getFileDataUrl(filename, fallback = 'application/octet-stream') {
                const file = await zip.file(filename);
                const fileData = await file.async('base64');
                const mimeType = filename.endsWith('.png') ? 'image/png' :
                    filename.endsWith('.jpg') ? 'image/jpeg' :
                    filename.endsWith('.txt') ? 'text/plain' :
                    filename.endsWith('.exe') ? 'application/vnd.microsoft.portable-executable' :
                    filename.endsWith('.deb') ? 'application/vnd.debian.binary-package' :
                    'application/octet-stream';
                const dataUrl = `data:${mimeType};base64,${fileData}`;
                return dataUrl;
            }
            editionOptionElement.onchange = async() => {
                if (editionOptionElement.checked) {
                    document.getElementById("selectedinstallerlogo").src = await getFileDataUrl(manifest.logo);
                    const license = await zip.file(manifest.license);
                    document.getElementById("licensetxt").innerText = await license.async("text");
                }
            }
            editionimage.src = await getFileDataUrl(manifest.logo);
            editionName.innerText = manifest.name;
            editionVersion.innerText = manifest.version;
            Object.keys(lmnContents.files).forEach(filename => {
                zip.file(filename).async('text').then(fileData => {
                    console.log(filename, fileData);
                });
            });
            packedEditionsElement.appendChild(editionElement);
        } catch (error) {
            alert(error);
        }
    }
})