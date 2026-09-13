const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeFPSGame.tsx', 'utf8');

const mportIdx = code.indexOf("mport * as THREE from 'three';");
if (mportIdx !== -1) {
  // The first 74 characters are:
  // "import React, { useEffect, useRef, useState, useCallback } from 'react';\ni"
  // Let's grab the first 74 chars from the original string
  const originalHeader = code.slice(0, mportIdx);
  
  // Actually, the original file header should be:
  const header = "import React, { useEffect, useRef, useState, useCallback } from 'react';\ni";
  
  // The rest of the original file is from mportIdx to the end
  const restOfFile = code.slice(mportIdx);
  
  const restoredCode = header + restOfFile;
  fs.writeFileSync('src/components/ThreeFPSGame.tsx', restoredCode);
  console.log("Restored file successfully!");
}
