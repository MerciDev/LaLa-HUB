const { exec } = require('child_process');
const fs = require('fs');

exec('npm run typecheck:web', (error, stdout, stderr) => {
    fs.writeFileSync('ts_errors.txt', stdout + '\n' + stderr);
});
