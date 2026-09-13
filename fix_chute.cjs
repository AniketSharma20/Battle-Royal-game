const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

// 1. Fix parachute group creation
const pStart = code.indexOf('    const parachuteGroup = new THREE.Group();');
const pEnd = code.indexOf('    scene.add(parachuteGroup);') + '    scene.add(parachuteGroup);'.length;

const newParachuteCode = `    const parachuteGroup = new THREE.Group();
    const chuteGeo = new THREE.SphereGeometry(6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const chuteMat = new THREE.MeshLambertMaterial({ color: 0xeab308, side: THREE.DoubleSide }); // Yellow parachute
    const chute = new THREE.Mesh(chuteGeo, chuteMat);
    chute.position.set(0, 5, 0);
    chute.scale.set(1, 0.45, 1);
    parachuteGroup.add(chute);
    
    const cordGeo = new THREE.CylinderGeometry(0.02, 0.02, 6.5);
    const cordMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for(let i = 0; i < 4; i++) {
        const cord = new THREE.Mesh(cordGeo, cordMat);
        cord.position.set(i < 2 ? 3 : -3, 2.5, i % 2 === 0 ? 3 : -3);
        cord.rotation.z = i < 2 ? 0.35 : -0.35;
        cord.rotation.x = i % 2 === 0 ? -0.35 : 0.35;
        parachuteGroup.add(cord);
    }
    parachuteGroup.visible = false;
    scene.add(parachuteGroup);`;

code = code.slice(0, pStart) + newParachuteCode + code.slice(pEnd);

// 2. Fix the third person camera offset and look target
const camStart = code.indexOf('        // Offset the camera back and slightly up');
const camEnd = code.indexOf('      } else {\n        playerDropDummy.visible = false;');

const newCamCode = `        // Offset the camera back and slightly up
        let dropOffset;
        let lookTarget = realCamPos.clone();
        if (stateRef.current.dropPhase === 'parachute') {
           dropOffset = new THREE.Vector3(0, 4, 11).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
           lookTarget.y += 2.5; // Look up a bit to see parachute
        } else {
           dropOffset = new THREE.Vector3(0, 2, 6).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        }
        camera.position.add(dropOffset);
        camera.lookAt(lookTarget);
`;

code = code.slice(0, camStart) + newCamCode + code.slice(camEnd);

// 3. Fix Storm Damage logic
const stormStart = code.indexOf('      const isSafe = playerDistFromCenter <= stateRef.current.stormRadius;');
const stormEnd = code.indexOf('      setIsInsideSafeZone(isSafe);');

const newStormCode = `      const isSafe = (playerDistFromCenter <= stateRef.current.stormRadius) || stateRef.current.dropPhase !== 'landed';\n`;

code = code.slice(0, stormStart) + newStormCode + code.slice(stormEnd);

// 4. Parachute rotation fix (it wasn't syncing yaw)
const renderParachuteIdx = code.indexOf('          parachuteGroup.position.copy(camera.position);');
const renderParachuteEnd = code.indexOf('          parachuteGroup.rotation.x = Math.cos(now * 0.0015) * 0.1;');
const newRenderParachuteCode = `          parachuteGroup.position.copy(camera.position);
          parachuteGroup.rotation.y = yaw;
          parachuteGroup.rotation.z = Math.sin(now * 0.002) * 0.1;
          parachuteGroup.rotation.x = Math.cos(now * 0.0015) * 0.1;`;
code = code.slice(0, renderParachuteIdx) + newRenderParachuteCode + code.slice(renderParachuteEnd + '          parachuteGroup.rotation.x = Math.cos(now * 0.0015) * 0.1;'.length);


fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
console.log("Fixed parachute and camera");
