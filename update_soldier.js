const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

// 1. Strip the old dummy from 476-492
code = code.replace(/    const dummyBodyGeo = new THREE\.CapsuleGeometry[\s\S]*?playerDropDummy\.add\(armR\);\n/, '');

// 2. We will refactor createHumanoidSoldier to extract the mesh builder
const createSoldierRegex = /    const createHumanoidSoldier = \(\n      id: string,[\s\S]*?\n      botGroup\.add\(rightArm\);\n\n/;
