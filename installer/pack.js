const { exec } = require('child_process');
const zip = require('jszip');
const fs = require('fs-extra');
const path = require('path');

const name = "lemoninstaller"

let uts = -1;

function main () {
    const finallogs = [
        "  _________                      __          _________ .__               .__            _____________  ________ ",
  " /   _____/_  _  __ ____ _____ _/  |_ ___.__.\_   ___ \\|__|______   ____ |  |   ____   /  |  \\_____  \\/   __   \\",
  " \\_____  \\\\ \\/ \\/ // __ \\\\__  \\\\   __<   |  |/    \\  \\/|  \\_  __ \\_/ ___\\|  | _/ __ \\ /   |  |__(__  <\\____    /",
  " /        \\\\     /\\  ___/ / __ \\|  |  \\___  |\\     \\___|  ||  | \\/\\  \\___|  |_\\  ___//    ^   /       \\  /    / ",
  "/_______  / \\/\\_/  \\___  >____  /__|  / ____| \\______  /__||__|    \\___  >____/\\___  >____   /______  / /____/  ",
  "        \\/             \\/     \\/      \\/             \\/                \\/          \\/     |__|      \\/          ",
  "__________       _______________________ _       _       _______ _______    ______         __________       ______  _______ _______   ",
  "\\__   __( (    /(  ____ \\__   __(  ___  ( \\     ( \\     (  ____ (  ____ )  (  ___ \\|\\     /\\__   __( \\     (  __  \\(  ____ (  ____ )  ",
  "   ) (  |  \\  ( | (    \\/  ) (  | (   ) | (     | (     | (    \\| (    )|  | (   ) | )   ( |  ) (  | (     | (  \\  | (    \\| (    )|  ",
  "   | |  |   \\ | | (_____   | |  | (___) | |     | |     | (__   | (____)|  | (__/ /| |   | |  | |  | |     | |   ) | (__   | (____)|  ",
  "   | |  | (\\ \\) (_____  )  | |  |  ___  | |     | |     |  __)  |     __)  |  __ ( | |   | |  | |  | |     | |   | |  __)  |     __)  ",
  "   | |  | | \\   |     ) |  | |  | (   ) | |     | |     | (     | (\\ (     | (  \\ \\| |   | |  | |  | |     | |   ) | (     | (\\ (     ",
  "___) (__| )  \\  /\\____) |  | |  | )   ( | (____/| (____/| (____/| ) \\ \\__  | )___) | (___) ___) (__| (____/| (__/  | (____/| ) \\ \\__  ",
  "\\_______|/    )_\\_______)  )_(  |/     \\(_______(_______(_______|/   \\__/  |/ \\___/(_______\\_______(_______(______/(_______|/   \\__/  "
    ];

    for (const arg of process.argv) {
        if (arg.startsWith("-uts=")) {
            uts = parseInt(arg.split("=")[1]);
            finallogs.push(`set uts to ${uts}`);
        }
    }
    function updateconsole() {
        console.clear();
        for (let log of finallogs) {
            console.log(log);
        }
    }
    if (uts < 1 && uts !== -1) {
        process.exit(0);
    }
    finallogs.push("· packaging installer...");
    updateconsole();
    const packprocess = exec(`npx electron-packager . ${name} --platform=win32 --arch=x64 --icon=logo.ico --overwrite`, { cwd: __dirname });
    packprocess.stdout.on('data', data => finallogs.push(data));
    packprocess.on("exit", async code => {
        if (code === 0) {
            finallogs.push("· packaging complete");
            updateconsole();
            if (uts < 2 && uts !== -1) {
                process.exit(0);
            }
            const zipfile = new zip();
            finallogs.push("· creating zip file...");
            updateconsole();
            let executablename = "";
            function tree (/** @type {zip} */ putdir, isouterloop = false, /** @type {String[]} */ ...paths) {
                console.log(`· packing directory ${ path.join(...paths) }`);
                for (const file of fs.readdirSync(path.join(...paths))) {
                    if (fs.lstatSync(path.join(...paths, file)).isDirectory()) {
                        if (file !== "output") {
                            if (true) {
                                tree(putdir.folder(file), false, ...paths, file);
                            }
                        }
                    }else {
                        putdir.file(file, fs.readFileSync(path.join(...paths, file)));
                        if (file.endsWith('.exe') && isouterloop) {
                            executablename = file;
                        }
                    }
                }
            }
            tree(zipfile, true, `${name}-win32-x64`);
            const zipcontent = await zipfile.generateAsync({type:"nodebuffer"});
            console.log("· cleaning now unnecessary files...");
            fs.emptyDirSync(`${name}-win32-x64`);
            fs.removeSync(`${name}-win32-x64`);
            console.log("· cleaning complete");
            fs.ensureDirSync("installer");
            fs.emptyDirSync("installer");
            fs.writeFileSync("installer/installer.zip", zipcontent);
            finallogs.push("· zip created successfully");
            updateconsole();
            if (uts < 3 && uts !== -1) {
                process.exit(0);
            }
        
            const data = await fs.readFile(path.join(__dirname, "installerloader.zip"));
        
            const zp = await zip.loadAsync(data);

            finallogs.push("· extracting installerloader...");
            updateconsole();
            for (const [relativePath, zipEntry] of Object.entries(zp.files)) {
                const destPath = path.join("installer", relativePath);
                
                if (zipEntry.dir) {
                    fs.mkdirSync(destPath, { recursive: true });
                } else {
                    fs.mkdirSync(path.dirname(destPath), { recursive: true });
                    const content = await zipEntry.async('nodebuffer');
                    fs.writeFileSync(destPath, content);
                }
            }
            finallogs.push("· installerloader extracted successfully");
            updateconsole();
            if (uts < 4 && uts !== -1) {
                process.exit(0);
            }

            finallogs.push("· creating config..");
            updateconsole();
            fs.writeFileSync("installer/config.json", JSON.stringify({
                executablename: executablename,
            }, null, 4));
            finallogs.push("· config created successfully");
            updateconsole();
            if (uts < 5 && uts !== -1) {
                process.exit(0);
            }
            finallogs.push("· building installer...");
            updateconsole();
            let exited = false;
            const buildprocess = exec(`npx electron-builder -w`, { cwd: path.join(process.cwd(),"installer") });
            buildprocess.stdout.on('data', data => {updateconsole();console.log(data);});
            buildprocess.on("exit", async code => {
                if (code === 0) {
                    finallogs.push("· building complete");
                    updateconsole();
                    if (uts < 6 && uts !== -1) {
                        process.exit(0);
                    }
                    finallogs.push("· moving exe...");
                    updateconsole();
                    fs.ensureDirSync("output");
                    fs.emptyDirSync("output");
                    for (const file of fs.readdirSync(path.join(`installer`, `dist`))) {
                        if (file.endsWith(".exe")) {
                            fs.moveSync(path.join(`installer`, `dist`, file), path.join("output", `${name}.exe`));
                            finallogs.push("· moving exe completed succesfully");
                            updateconsole();
                            console.log("· cleaning now unnecessary files...");
                            fs.emptyDirSync(`installer`);
                            fs.removeSync(`installer`);
                            console.log("· cleaning complete");
                            finallogs.push("! installer created successfully");
                            updateconsole();
                            process.exit(0);
                        }
                    }
                    console.error("No executable found in the build");
                } else {
                    console.error(`Building failed with code ${code}`);
                }
                exited = true;
            });

            await new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (exited) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });
        }else {
            console.error(`Packaging failed with code ${code}`);
        }
    });
}
main();