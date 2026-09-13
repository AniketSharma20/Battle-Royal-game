const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const target = `          // Render Parachute
          parachuteGroup.visible = true;
          
          // Animate opening scale`;

const replacement = `          // Render Parachute
          if (!parachuteGroup.visible) {
             parachuteGroup.scale.set(0.1, 0.1, 0.1);
             sounds.playJump();
          }
          parachuteGroup.visible = true;
          
          // Animate opening scale`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
console.log("Fixed parachute scale reset");
