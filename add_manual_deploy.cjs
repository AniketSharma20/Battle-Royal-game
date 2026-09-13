const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const oldJump = `        {dropPhase === 'in_plane' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                stateRef.current.dropPhase = 'freefall';
                setDropPhase('freefall');
              }}
              className="pointer-events-auto px-14 py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-3xl tracking-widest uppercase rounded-sm border-b-4 border-yellow-700 active:border-b-0 active:mt-1 transition-all shadow-[0_0_20px_rgba(234,179,8,0.5)]"
            >
              JUMP
            </button>
          </div>
        )}`;

const newJump = `        {dropPhase === 'in_plane' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                stateRef.current.dropPhase = 'freefall';
                setDropPhase('freefall');
              }}
              className="pointer-events-auto px-14 py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-3xl tracking-widest uppercase rounded-sm border-b-4 border-yellow-700 active:border-b-0 active:mt-1 transition-all shadow-[0_0_20px_rgba(234,179,8,0.5)]"
            >
              JUMP
            </button>
          </div>
        )}
        {dropPhase === 'freefall' && (
          <div className="absolute inset-0 flex flex-col justify-end items-center pointer-events-none z-30 pb-32">
            <button
              onClick={(e) => {
                e.stopPropagation();
                stateRef.current.dropPhase = 'parachute';
                setDropPhase('parachute');
                // The parachute model doesn't exist in React state directly, but logic loop will animate it.
              }}
              className="pointer-events-auto px-8 py-3 bg-blue-500 hover:bg-blue-400 text-white font-black text-xl tracking-widest uppercase rounded-sm border-b-4 border-blue-700 active:border-b-0 active:mt-1 transition-all shadow-lg"
            >
              OPEN PARACHUTE
            </button>
          </div>
        )}`;

code = code.replace(oldJump, newJump);

// Also need to support manual deploy in spacebar/jump binding!
const oldLogic = `          // Auto-deploy parachute at 100m above ground
          if (camera.position.y < currentGroundY + 100) {
            stateRef.current.dropPhase = 'parachute';
            setDropPhase('parachute');
            parachuteGroup.scale.set(0.1, 0.1, 0.1);
            sounds.playJump();
          }`;
          
const newLogic = `          // Manual deploy via jump button or auto-deploy at 100m
          if (camera.position.y < currentGroundY + 100 || keys['Space'] || vInput.jump) {
            stateRef.current.dropPhase = 'parachute';
            setDropPhase('parachute');
            parachuteGroup.scale.set(0.1, 0.1, 0.1);
            sounds.playJump();
          }`;
          
code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
console.log("Added manual deploy button & keybind");
