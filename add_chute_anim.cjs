const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const sOld = `          // Render Parachute
          parachuteGroup.visible = true;
          parachuteGroup.position.copy(camera.position);
          parachuteGroup.rotation.y = yaw;
          parachuteGroup.rotation.z = Math.sin(now * 0.002) * 0.1;
          parachuteGroup.rotation.x = Math.cos(now * 0.0015) * 0.1;`;

const sNew = `          // Render Parachute
          parachuteGroup.visible = true;
          
          // Animate opening scale
          if (parachuteGroup.scale.x < 1) {
             parachuteGroup.scale.addScalar(delta * 2);
             if (parachuteGroup.scale.x > 1) parachuteGroup.scale.set(1, 1, 1);
          }
          
          parachuteGroup.position.copy(camera.position);
          parachuteGroup.rotation.y = yaw;
          parachuteGroup.rotation.z = Math.sin(now * 0.002) * 0.1;
          parachuteGroup.rotation.x = Math.cos(now * 0.0015) * 0.1;`;

code = code.replace(sOld, sNew);

const rOld = `            stateRef.current.dropPhase = 'parachute';
            setDropPhase('parachute');
            sounds.playJump();`;
            
const rNew = `            stateRef.current.dropPhase = 'parachute';
            setDropPhase('parachute');
            parachuteGroup.scale.set(0.1, 0.1, 0.1);
            sounds.playJump();`;

code = code.replace(rOld, rNew);

fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
console.log("Added parachute scale animation");
