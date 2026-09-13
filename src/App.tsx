import React, { useState } from 'react';
import { GameSettings } from './types';
import { ThreeFPSGame } from './components/ThreeFPSGame';

const DEFAULT_SETTINGS: GameSettings = {
  walkSpeed: 5.0,
  sprintSpeed: 9.5,
  jumpHeight: 1.8,
  gravity: 20.0,
  mouseSensitivity: 2.0,
  damage: 32.0,
  fireRate: 6.5,
  magazineSize: 30,
  reloadTime: 1.8,
  range: 85.0,
  enemySpeed: 5.5,
  enemyPatrolSpeed: 2.4,
  detectionRadius: 16.0,
  attackRange: 14.0,
  enemyHealth: 100.0,
  enemyDamage: 12.0,
  botCount: 20,
  initialStormRadius: 210,
  stormShrinkDuration: 35,
  stormDamagePerSecond: 4.0
};

export default function App() {
  const [settings] = useState<GameSettings>(DEFAULT_SETTINGS);

  return (
    <div className="fixed inset-0 w-screen h-screen h-[100dvh] overflow-hidden bg-slate-950 text-slate-100 font-sans select-none m-0 p-0">
      {/* PURE FULLSCREEN 3D BATTLE ROYALE GAMEPLAY */}
      <ThreeFPSGame settings={settings} />
    </div>
  );
}
