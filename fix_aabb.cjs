const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const colStart = code.indexOf('      // Player 3D Collision Check');
const colEnd = code.indexOf('      stateRef.current.playerPosition.copy(camera.position);');

if (colStart !== -1 && colEnd !== -1) {
    const newColCode = `      // Robust 3D AABB Collision & Push-out
      if (stateRef.current.dropPhase !== 'in_plane') {
        const playerMinY = camera.position.y - 1.85 + 0.1; // eyeHeight = 1.85
        const playerMaxY = camera.position.y + 0.2;
        for (const mesh of collidableMeshes) {
          const box = new THREE.Box3().setFromObject(mesh);
          const r = 0.4; // player radius
          
          if (
            camera.position.x + r > box.min.x &&
            camera.position.x - r < box.max.x &&
            camera.position.z + r > box.min.z &&
            camera.position.z - r < box.max.z &&
            playerMinY < box.max.y &&
            playerMaxY > box.min.y
          ) {
            // Find closest face to push out
            const distLeft = (camera.position.x + r) - box.min.x;
            const distRight = box.max.x - (camera.position.x - r);
            const distFront = (camera.position.z + r) - box.min.z;
            const distBack = box.max.z - (camera.position.z - r);
            const distTop = box.max.y - playerMinY;
            
            const minDist = Math.min(distLeft, distRight, distFront, distBack, distTop);
            
            if (minDist === distTop) {
               camera.position.y = box.max.y + 1.85 - 0.1;
               verticalVelocity = 0;
               isGrounded = true;
               if (stateRef.current.dropPhase !== 'landed') {
                 stateRef.current.dropPhase = 'landed';
                 setDropPhase('landed');
                 parachuteGroup.visible = false;
               }
            } else if (minDist === distLeft) {
               camera.position.x = box.min.x - r;
            } else if (minDist === distRight) {
               camera.position.x = box.max.x + r;
            } else if (minDist === distFront) {
               camera.position.z = box.min.z - r;
            } else if (minDist === distBack) {
               camera.position.z = box.max.z + r;
            }
          }
        }
      }

`;
    code = code.slice(0, colStart) + newColCode + code.slice(colEnd);
    fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
    console.log("Collision replaced");
} else {
    console.log("Could not find collision block");
}
