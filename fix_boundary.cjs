const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const boundaryStart = code.indexOf('      // Restrict player inside expanded island perimeter (480m boundary)');
const boundaryEnd = code.indexOf('      if (camera.position.z < -maxIslandR) camera.position.z = -maxIslandR;') + '      if (camera.position.z < -maxIslandR) camera.position.z = -maxIslandR;'.length;

const newBoundaryCode = `      // Restrict player inside expanded island perimeter (480m boundary)
      if (stateRef.current.dropPhase !== 'in_plane') {
        const maxIslandR = 480;
        if (camera.position.x > maxIslandR) camera.position.x = maxIslandR;
        if (camera.position.x < -maxIslandR) camera.position.x = -maxIslandR;
        if (camera.position.z > maxIslandR) camera.position.z = maxIslandR;
        if (camera.position.z < -maxIslandR) camera.position.z = -maxIslandR;
      }`;

code = code.slice(0, boundaryStart) + newBoundaryCode + code.slice(boundaryEnd);

fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
console.log("Fixed boundary logic");
