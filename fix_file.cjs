const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const mportIdx = code.indexOf("}mport * as THREE from 'three';");
if (mportIdx !== -1) {
  // mportIdx is where the duplication starts.
  // The first part (0 to mportIdx + 1) is the corrupted part from the script before.
  // Actually, the original file is starting from mportIdx + 1 (the 'm' in 'mport') but missing the 'i'.
  // Let's just grab the rest of the file from mportIdx + 1
  const restOfFile = code.slice(mportIdx + 1);
  
  const header = "import React, { useEffect, useRef, useState, useCallback } from 'react';\ni";
  
  // wait, restOfFile starts with "mport * as THREE..."
  // So header + restOfFile is correct.
  // But wait! Is there anything missing at the end of the first chunk?
  // We can just discard the first chunk entirely, and use the second chunk (which is the full original file)
  
  const restoredCode = header + restOfFile;
  fs.writeFileSync('src/components/ThreeFPSGame.tsx', restoredCode);
  console.log("Restored successfully!");
}
