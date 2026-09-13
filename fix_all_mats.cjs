const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

code = code.replace(/MeshStandardMaterial/g, 'MeshLambertMaterial');
code = code.replace(/metalness: [0-9.]+, /g, '');
code = code.replace(/roughness: [0-9.]+, /g, '');
code = code.replace(/roughness: [0-9.]+/g, '');
code = code.replace(/metalness: [0-9.]+/g, '');

fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
console.log("Replaced all Standard materials in ThreeFPSGame");
