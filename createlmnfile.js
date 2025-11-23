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
    const buildprocess = exec([
        `npx`, `electron-packager`,
        `.`, name,
        `--build-version=${version}`,
        `--protocol=http`, `--protocol-name="hypertext transport protocol"`,
        `--out=lmnfileConstruction`, `--icon=${path.join(__dirname, "browser", "assets", "logo", "logo.png")}`,
        // `--protocol=https`, `--protocol-name=hypertext transport protocol secure`,
    ].join(" "), { cwd: __dirname });
    buildprocess.stdout.on('data', data => {updateconsole();console.log(data);});
    buildprocess.stderr.on('data', data => {updateconsole();console.log(data);});
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
                        windows: "windows.lmn"
                    }
                },
                null,
                4
            ));
            console.log("· lmn configuration created");
            console.log("· packing license...")
            zipfile.file("LICENSE", fs.readFileSync(path.join(path.join(__dirname, "LICENSE"))));
            console.log("· license packed successfully");
            console.log("· packing application...");
            for (const folder of fs.readdirSync(path.join(__dirname, "lmnfileConstruction"))) {
                const appzip = new zip();
                function tree(prevfolder = appzip, treepath = path.join(__dirname, "lmnfileConstruction", folder)) {
                    return new Promise(async(resolve, reject) => {
                        for (const file of fs.readdirSync(treepath)) {
                            if (fs.lstatSync(path.join(treepath, file)).isDirectory()) {
                                const newfolder = prevfolder.folder(file);
                                await tree(newfolder, path.join(treepath, file));
                                resolve();
                            }else {
                                const stream = fs.createReadStream(path.join(treepath, file));
                                prevfolder.file(file, stream);
                                console.log(`· packed ${file}`);
                                stream.on('end', resolve);
                            }
                        }
                    });
                }
                await tree();
                const stream = appzip.generateNodeStream({type: "nodebuffer"});
                zipfile.file(`windows.lmn`, stream);
                await new Promise((resolve, reject) => stream.on('end', resolve));
            }
            console.log("· application packed successfully");
            console.log("· creating lmn file...");
            const zipstream = zipfile.generateNodeStream({
                type: 'nodebuffer',
                streamFiles: true
            });
            const writestream = fs.createWriteStream(path.join(__dirname, `${name}-${version}.lmn`));
            console.log("· write stream Initializing ");
            zipstream.pipe(writestream).on('finish', () => {
                finallogs.push("! lmn file created successfully");
                console.log("· cleaning now unnecessary files...");
                fs.emptyDirSync(path.join(__dirname, "lmnfileConstruction"));
                fs.removeSync(path.join(__dirname, "lmnfileConstruction"));
                console.log("· cleaning complete");
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
                    config.push(`${name}-${version}.lmn`);
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
            });
        } else {
            console.error(`Building failed with code ${code}`);
        }
    });
}
main();