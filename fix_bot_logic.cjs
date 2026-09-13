const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const bOld = `        if (distToPlayer <= stateRef.current.settings.detectionRadius) {
          bot.state = distToPlayer <= stateRef.current.settings.attackRange ? 'Attack' : 'Chase';
        } else if (distToPlayer > stateRef.current.settings.detectionRadius * 1.5) {
          bot.state = 'Patrol';
        }`;

const bNew = `        const canSeePlayer = stateRef.current.dropPhase === 'landed' && distToPlayer <= stateRef.current.settings.detectionRadius;
        if (canSeePlayer) {
          bot.state = distToPlayer <= stateRef.current.settings.attackRange ? 'Attack' : 'Chase';
        } else if (distToPlayer > stateRef.current.settings.detectionRadius * 1.5 || stateRef.current.dropPhase !== 'landed') {
          bot.state = 'Patrol';
        }`;

code = code.replace(bOld, bNew);
fs.writeFileSync('src/components/ThreeFPSGame.tsx', code);
console.log("Bot logic fixed!");
