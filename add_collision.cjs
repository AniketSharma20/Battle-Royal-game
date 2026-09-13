const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const targetStr = '      stateRef.current.playerPosition.copy(camera.position);';

const newCode = `      // Player 3D Collision Check
      if (stateRef.current.dropPhase !== 'in_plane') {
        const playerMinY = camera.position.y - 1.85 + 0.1; // eyeHeight = 1.85
        const playerMaxY = camera.position.y + 0.2;
        for (const mesh of collidableMeshes) {
          const box = new THREE.Box3().setFromObject(mesh);
          box.min.x -= 0.4; box.max.x += 0.4; // player radius
          box.min.z -= 0.4; box.max.z += 0.4;
          if (
            camera.position.x > box.min.x &&
            camera.position.x < box.max.x &&
            camera.position.z > box.min.z &&
            camera.position.z < box.max.z &&
            playerMinY < box.max.y &&
            playerMaxY > box.min.y
          ) {
            // Revert X/Z to last frame
            camera.position.x = stateRef.current.playerPosition.x;
            camera.position.z = stateRef.current.playerPosition.z;
            break;
          }
        }
      }

      stateRef.current.playerPosition.copy(camera.position);`;

code = code.split(targetStr).join(newCode);
fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
console.log("Added 3D collisions");
