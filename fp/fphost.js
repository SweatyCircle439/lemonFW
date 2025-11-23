const express = require('express');
const app = express();
const { exec } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

module.exports = async(docs) => {

    if (!fs.existsSync(path.join(docs, 'lemon'))) {
        fs.mkdirSync(path.join(docs, 'lemon'));
    }
    if (!fs.existsSync(path.join(docs, 'lemon', 'lfp'))) {
        fs.mkdirSync(path.join(docs, 'lemon', 'lfp'));
        fs.mkdirSync(path.join(docs, 'lemon', 'lfp', 'uploads'));
    }
    
    function openFileExplorer(path = '.') {
        const platform = os.platform();
    
        let command;
        console.log(platform);
        if (platform === 'win32') {
            command = `explorer \"${path}\"`;
        } else if (platform === 'darwin') {
            command = `open "${path}"`;
        } else if (platform === 'linux') {
            exec('which xdg-open', (error, stdout) => {
            if (stdout) {
                command = `xdg-open "${path}"`;
            } else {
                exec('which gnome-open', (gnomeError, gnomeStdout) => {
                if (gnomeStdout) {
                    command = `gnome-open "${path}"`;
                } else {
                    exec('which kde-open', (kdeError, kdeStdout) => {
                    if (kdeStdout) {
                        command = `kde-open "${path}"`;
                    } else {
                        console.error('No suitable file explorer opener found.');
                        return;
                    }
                    exec(command, (err) => {
                        if (err) console.error('Error opening file explorer:', err);
                    });
                    });
                }
                });
            }
            });
        } else {
            console.error('Unsupported OS platform:', platform);
            return;
        }
    
        if (command) {
            exec(command, (err) => {
            if (err) console.error('Error opening file explorer:', err);
            });
        }
    }
    openFileExplorer(path.join(docs, 'lemon', 'lfp', 'uploads'));
    const upload = require('multer')({
        storage: require('multer').diskStorage(
            {
                destination: function (req, file, cb) {
                    cb(null, path.join(docs, 'lemon', 'lfp', 'uploads'));
                },
                filename: function (req, file, cb) {
    
                    cb(null, file.originalname);
                }
            }
        )
    })
    
    const bodyParser = require('body-parser');
    
    app.use(bodyParser.urlencoded({ extended: true }));
    
    app.post('/upload', upload.single(`upload`), (req, res) => {
        res.redirect("/");
    });
    
    app.use(express.static(require("path").join(__dirname, "public")));
    
    app.listen(130, () => {
    });
}