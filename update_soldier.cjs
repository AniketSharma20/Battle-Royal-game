const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const botStartIdx = code.indexOf('// 1. Torso: Heavy Camo Fatigues BDU');
const botEndIdx = code.indexOf('// 8. Sleek High-Resolution Overhead Health/Shield Billboard in English');

if (botStartIdx !== -1 && botEndIdx !== -1) {
  let builderCode = code.substring(botStartIdx, botEndIdx);
  // Replace 'botGroup' with 'targetGroup'
  builderCode = builderCode.replace(/botGroup/g, 'targetGroup');
  
  // Create the helper function
  const helperFunction = `
    const buildSoldierMesh = (targetGroup: THREE.Group, uniformMat: THREE.Material) => {
      ${builderCode}
      return { torso, leftLeg, rightLeg, leftArm, rightArm };
    };
  `;
  
  // Insert the helper function right before createHumanoidSoldier
  const createFuncIdx = code.indexOf('const createHumanoidSoldier = (');
  code = code.slice(0, createFuncIdx) + helperFunction + code.slice(createFuncIdx);
  
  // Now modify createHumanoidSoldier to use this helper
  const oldBodyStartIdx = code.indexOf('// 1. Torso: Heavy Camo Fatigues BDU', createFuncIdx + helperFunction.length);
  const oldBodyEndIdx = code.indexOf('// 8. Sleek High-Resolution Overhead Health/Shield Billboard in English', createFuncIdx + helperFunction.length);
  
  const replacement = `const { torso, leftLeg, rightLeg, leftArm, rightArm } = buildSoldierMesh(botGroup, uniformMat);\n\n      `;
  code = code.slice(0, oldBodyStartIdx) + replacement + code.slice(oldBodyEndIdx);
  
  fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
  console.log("Success phase 1");
} else {
  console.log("Failed to find indices", botStartIdx, botEndIdx);
}
