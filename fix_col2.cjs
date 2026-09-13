const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const colStart = code.indexOf('        // Simple AABB collision');
const colEnd = code.indexOf('          camera.position.x = stateRef.current.playerPosition.x;');

if (colStart !== -1 && colEnd !== -1) {
  const newColCode = `        // Simple AABB collision (3D)
        const playerMinY = camera.position.y - eyeHeight + 0.1; // step height allowance
        const playerMaxY = camera.position.y + 0.2; // head height
        if (
          camera.position.x > box.min.x &&
          camera.position.x < box.max.x &&
          camera.position.z > box.min.z &&
          camera.position.z < box.max.z &&
          playerMinY < box.max.y &&
          playerMaxY > box.min.y
        ) {
`;

  code = code.slice(0, colStart) + newColCode + code.slice(colEnd);
  fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
  console.log("Fixed 3D collisions!");
} else {
  console.log("Still not found");
}
