const fs = require('fs');
let code = fs.readFileSync('src/utils/textureGenerator.ts', 'utf8');

// Fix Runway texture
code = code.replace("ctx.fillStyle = '#18181b';", "ctx.fillStyle = '#3f3f46';");
code = code.replace("ctx.fillStyle = Math.random() > 0.5 ? '#111215' : '#23252a';", "ctx.fillStyle = Math.random() > 0.5 ? '#27272a' : '#52525b';");

// Fix Road texture
code = code.replace("ctx.fillStyle = '#27272a';", "ctx.fillStyle = '#52525b';");
code = code.replace("ctx.fillStyle = Math.random() > 0.5 ? '#18181b' : '#3f3f46';", "ctx.fillStyle = Math.random() > 0.5 ? '#3f3f46' : '#71717a';");

fs.writeFileSync('src/utils/textureGenerator.ts', code);

// Fix mapBuilder.ts
let mbCode = fs.readFileSync('src/utils/mapBuilder.ts', 'utf8');
mbCode = mbCode.replace('new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 })', 'new THREE.MeshLambertMaterial({ color: 0x334155 })');
mbCode = mbCode.replace('new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 })', 'new THREE.MeshLambertMaterial({ color: 0x1e293b })');
mbCode = mbCode.replace('new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.1 })', 'new THREE.MeshLambertMaterial({ color: 0x64748b })');
mbCode = mbCode.replace(/MeshStandardMaterial/g, 'MeshLambertMaterial');
fs.writeFileSync('src/utils/mapBuilder.ts', mbCode);

console.log("Fixed textures and materials");
