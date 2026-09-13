const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

// Strip out the old dummy from 476-492
const dummyStart = code.indexOf('    const dummyBodyGeo = new THREE.CapsuleGeometry(0.6, 1.2, 4, 8);');
const dummyEnd = code.indexOf('playerDropDummy.visible = false;', dummyStart);
if(dummyStart !== -1 && dummyEnd !== -1) {
  code = code.slice(0, dummyStart) + code.slice(dummyEnd);
}

// Now insert the call to buildSoldierMesh *after* buildSoldierMesh is defined!
const botRosterIdx = code.indexOf('const botRosterConfig = [');
if(botRosterIdx !== -1) {
    const dummyInit = `
    // Add real player model to the drop dummy
    const playerCamoMat = camoMaterials[3]; // SpecOps camo for player
    const dummyParts = buildSoldierMesh(playerDropDummy, playerCamoMat);
    // Center the dummy relative to the camera
    playerDropDummy.position.y = -1.2;
    
`;
    code = code.slice(0, botRosterIdx) + dummyInit + code.slice(botRosterIdx);
}

fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
console.log("Success phase 2");
