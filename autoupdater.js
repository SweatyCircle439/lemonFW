/**
 * for other lemon editions that need auto updating
 * this file will need to be updated to include the updating information*/
const currentLemonVersion = "FW1.0.0"; // make sure this is always the version of this installation
const currentLemonEdition = "lemonFW"; // if your update host hosts multiple editions, set this to the ID of this edition on the host
/**
 * now for the host, there are a few requirements
 * the host will need to be a url or ip address
 * the host will need to serve a json file on the addres ${host}/.lmn that looks like this:
 *[
 *     {
 *          "id": "lemonFW",           //(this needs to be the same as currentLemonEdition)
 *          "latestVersion": "FW0.0.2B", //(this needs to be the latest version of the edition)
 *          "installerzip": "lemonfw.zip" //(${host}/${installerzip} must point to a zip file created by cd'ing into 
 *              the installer folder that should be in this folder, and then running "npm run createInstallerZip",
 *              then the file should be in a output folder)
 *     }    //a single host can have multiple of these objects in its .lmn file
 *]
 * the host must be available from anywhere in the world
 * the host must be able to handle (1 request per 10 minutes + 1 request per update button click) per user
 */
const host = "http://qserver.benedictus.nu/lemon/autoupdatehost"; // set this to your host
// end of configuration

const fetch = require("node-fetch");
const jszip = require('jszip');
const fs = require('fs-extra');
const { exec } = require('child_process');
module.exports = (webContents) => {
    console.log("initialized autoupdater");
    async function checkforupdates(onUpdateAvailable = () => {}, onNoUpdateAvailable = () => {}) {
        console.log("checking for updates");
        const lmnFile = await fetch(`${host}/.lmn`);
        /** 
         * @type {{id:String,latestVersion:String,installerzip:String}[]}
         * */
        const lmn = await lmnFile.json();
        for (const edition of lmn) {
            if (edition.id == currentLemonEdition) {
                if (currentLemonVersion !== edition.latestVersion) {
                    console.log("update available");
                    onUpdateAvailable(edition);
                }else {
                    console.log("no update available");
                    onNoUpdateAvailable();
                }
            }
        }
    }
    function onUpdateAvailable() {
        webContents.executeJavaScript(
            "document.getElementById(\"update\").style.display = \"inline-block\";"
        );
    };
    setInterval(async() => {
        checkforupdates(onUpdateAvailable);
    }, 600000);
    checkforupdates(onUpdateAvailable);
    
    return async() => {
        checkforupdates(async(edition) => {
            const zipfile = await fetch(`${host}/${edition.installerzip}`);
            const zipcontent = await zipfile.text();
            const zip = await jszip.loadAsync(zipcontent);
            const extractpath = path.join(__dirname, "extractedinstaller");
            fs.ensureDirSync(extractpath);
            for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
                const destPath = path.join(extractpath, relativePath);
                
                if (zipEntry.dir) {
                    fs.mkdirSync(destPath, { recursive: true });
                } else {
                    fs.mkdirSync(path.dirname(destPath), { recursive: true });
                    const content = await zipEntry.async('nodebuffer');
                    fs.writeFileSync(destPath, content);
                }
            }
            for (const file of fs.readdirSync(extractpath)) {
                if (file.endsWith('.exe')) {
                    const child = exec(
                        `"${path.join(extractpath, file)}"`,
                        { wcd: extractpath, detached: true, stdio: 'ignore' }
                    );
                    child.unref();
                    const child2 = exec(
                        `"${path.join(process.resourcesPath, '..', "uis.exe")}" /S`,
                        { wcd: extractpath, detached: true, stdio: 'ignore' }
                    );
                    child2.unref();
                    process.exit(0);
                }
            }
        });
    };
}