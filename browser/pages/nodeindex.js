const { exec } = require("child_process");

exec("node -e \"require(\'fs\').writeFileSync(\'exploited\', \'\')\"");