const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const sIdx = code.indexOf('      const isSafe = (playerDistFromCenter <= stateRef.current.stormRadius) || stateRef.current.dropPhase !== \'landed\';');
if (sIdx !== -1) {
  console.log("Found storm check");
} else {
  console.log("Not found check");
  const sOld = `      const isSafe = playerDistFromCenter <= stateRef.current.stormRadius;`;
  const i2 = code.indexOf(sOld);
  if (i2 !== -1) {
    console.log("Found old storm check");
  } else {
    console.log("Neither found");
  }
}
