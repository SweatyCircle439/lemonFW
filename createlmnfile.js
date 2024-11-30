const { exec } = require('child_process');
const zip = require('jszip');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
function readUntilEnter() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        let text = '';
        rl.on('line', (input) => {
            text += input;
            rl.close();
            resolve(text);
        });
    });
}
async function main () {
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
    ]
    function updateconsole() {
        console.clear();
        for (let log of finallogs) {
            console.log(log);
        }
    }
    updateconsole();
    console.log("please enter the edition name");
    const name = await readUntilEnter();
    finallogs.push(name);
    updateconsole();
    console.log("please enter the edition version");
    const version = await readUntilEnter();
    finallogs.push(version);
    updateconsole();
    console.log("please enter the unpack location");
    const extract = await readUntilEnter();
    finallogs.push(extract);
    updateconsole();
    finallogs.push("· building application...");
    updateconsole();
    const buildprocess = exec(`npx electron-builder -w`, { cwd: __dirname });
    buildprocess.stdout.on('data', data => {updateconsole();console.log(data);});
    buildprocess.on("exit", async code => {
        if (code === 0) {
            finallogs.push("· building complete");
            const zipfile = new zip();
            finallogs.push("· creating lmn file...");
            console.log("· creating lmn configuration...");
            zipfile.file(".lmn", JSON.stringify(
                {
                    name: name,
                    logo: "logo.png",
                    extract: extract,
                    license: "LICENSE",
                    version: version,
                    installers: {
                        windows: "installer.exe"
                    }
                },
                null,
                4
            ));
            console.log("· lmn configuration created");
            console.log("· packing logo...")
            zipfile.file("logo.png", fs.readFileSync(path.join(path.join(__dirname, "browser", "assets", "logo", "logo.png"))));
            console.log("· logo packed successfully");
            console.log("· packing license...")
            zipfile.file("LICENSE", fs.readFileSync(path.join(path.join(__dirname, "LICENSE"))));
            console.log("· license packed successfully");
            console.log("· packing installer...");
            for (const file of fs.readdirSync(path.join(path.join(__dirname, "dist")))) {
                if (file.endsWith(".exe") && file.includes("Setup")) {
                    zipfile.file("installer.exe", fs.readFileSync(path.join(path.join(__dirname, "dist", file))));
                }
            }
            console.log("· installer packed successfully");
            const zipcontent = await zipfile.generateAsync({type:"nodebuffer"});
            console.log("· cleaning now unnecessary files...");
            fs.emptyDirSync(path.join(__dirname, "dist"));
            fs.removeSync(path.join(__dirname, "dist"));
            console.log("· cleaning complete");
            fs.writeFileSync(path.join(__dirname, `${version}.lmn`), zipcontent);
            finallogs.push("! file created successfully");
            updateconsole();
            console.log("· checking for config file...");
            if (fs.existsSync(path.join(__dirname, '.lmn'))) {
                finallogs.push("· config file found");
                updateconsole();
                finallogs.push("· reading config...");
                updateconsole();
                const config = JSON.parse(fs.readFileSync(path.join(__dirname, '.lmn')));
                finallogs.push("· config loaded successfully");
                finallogs.push("· updating config...");
                updateconsole();
                config.push(`${version}.lmn`);
                fs.writeFileSync(path.join(__dirname, '.lmn'), JSON.stringify(config, null, 4));
                finallogs.push("· config updated successfully");
                finallogs.push("! done");
                updateconsole();
            }else {
                finallogs.push("X no config file found");
                finallogs.push("! done");
                updateconsole();
            }
            updateconsole();
            process.exit(0);
        } else {
            console.error(`Building failed with code ${code}`);
        }
    });
}
main();