const fs = require('fs');
const code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');
const start = code.indexOf('const buildSoldierMesh =');
console.log(code.slice(start, start + 1000));
