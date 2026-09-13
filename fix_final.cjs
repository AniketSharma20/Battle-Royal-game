const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

// Fix boundary check
const bOld = `      // Restrict player inside expanded island perimeter (480m boundary)
      const playerDist = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
      if (playerDist > 480) {
        camera.position.x = (camera.position.x / playerDist) * 480;
        camera.position.z = (camera.position.z / playerDist) * 480;
      }`;
      
const bNew = `      // Restrict player inside expanded island perimeter (480m boundary)
      if (stateRef.current.dropPhase !== 'in_plane') {
        const playerDist = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
        if (playerDist > 480) {
          camera.position.x = (camera.position.x / playerDist) * 480;
          camera.position.z = (camera.position.z / playerDist) * 480;
        }
      }`;
code = code.replace(bOld, bNew);

// Fix storm damage check
const sOld = `      const isSafe = playerDistFromCenter <= stateRef.current.stormRadius;`;
const sNew = `      const isSafe = (playerDistFromCenter <= stateRef.current.stormRadius) || stateRef.current.dropPhase !== 'landed';`;
code = code.replace(sOld, sNew);

fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
console.log("Final fixes applied.");
