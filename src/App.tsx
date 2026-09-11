import React, { useState, useMemo } from 'react';
import { GameSettings, ViewTab } from './types';
import { getUnityScripts } from './data/unityScripts';
import { ThreeFPSGame } from './components/ThreeFPSGame';
import { ScriptViewer } from './components/ScriptViewer';
import { SetupGuide } from './components/SetupGuide';
import { MechanicsTuner } from './components/MechanicsTuner';
import { ArchitectureDiagram } from './components/ArchitectureDiagram';
import { Gamepad2, Code2, BookOpen, Sliders, GitFork, Archive, X } from 'lucide-react';
import JSZip from 'jszip';

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
  botCount: 14,
  initialStormRadius: 130,
  stormShrinkDuration: 30,
  stormDamagePerSecond: 4.0
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('scripts');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);

  // Re-generate C# scripts whenever tuning settings change
  const scripts = useMemo(() => getUnityScripts(settings), [settings]);

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const scriptsFolder = zip.folder('Unity_BattleRoyale_Scripts');

      scripts.forEach((script) => {
        scriptsFolder?.file(script.filename, script.code);
      });

      scriptsFolder?.file(
        'README.txt',
        `Unity 3D Battle Royale FPS System Scripts
Generated for Unity 2022 LTS / Unity 6000 & URP.

SCRIPTS INCLUDED:
1. PlayerController.cs - Smooth WASD First-Person controller, mouse look, jump, sprint, and parachute glider drop
2. WeaponSystem.cs - Multi-weapon arsenal (Rifle, Shotgun, Sniper), ADS camera zoom, raycasting, and recoil
3. HumanoidEnemyAI.cs - Humanoid soldier AI with rifle bursts, NavMesh pathfinding, cover-taking, and loot drops
4. StormZone.cs - Shrinking safe zone circle (The Storm), multi-phase transitions, and damage ticks
5. LootItem.cs - Ground loot items & supply crates with floating beacons, weapon pickups, medkits, and shield potions
6. PlayerHealth.cs - 100 Health + 100 Shield Armor system with storm penetration
7. HUDController.cs - Compass ribbon, Alive counter, Kill feed, dynamic crosshairs, and Victory Royale screen
8. GameManager.cs - Match director tracking 15 combatants, dropship deployment, and win conditions
9. IDamageable.cs - Interface for decoupled combat architecture

HOW TO IMPORT:
1. Drag this entire folder into your Unity Project window under 'Assets/Scripts/'.
2. See the Setup Instructions in the Developer Studio for component attachment guides.
`
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Unity_BattleRoyale_FPS_Scripts.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen h-[100dvh] overflow-hidden bg-slate-950 text-slate-100 font-sans select-none m-0 p-0">
      {/* PURE FULLSCREEN 3D GAMEPLAY VIEW */}
      <ThreeFPSGame
        settings={settings}
        onOpenStudio={() => setShowStudioModal(true)}
      />

      {/* DEVELOPER STUDIO MODAL (C# Scripts, Hierarchy Guide, Mechanics Tuner & Architecture) */}
      {showStudioModal && (
        <div
          id="unity-studio-modal"
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col text-slate-100 overflow-hidden animate-in fade-in duration-200"
        >
          {/* Studio Header */}
          <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Unity 3D Battle Royale FPS Studio
                    </h1>
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                      C# & Architecture
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 hidden sm:block">
                    C# Unity Scripts, Hierarchy Guide & Mechanics Tuner
                  </p>
                </div>
              </div>

              {/* Quick Actions: Export ZIP & Back to Game */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  id="header-btn-download-all"
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{downloadingZip ? 'Exporting...' : 'Export All (.ZIP)'}</span>
                </button>

                <button
                  id="btn-close-studio-modal"
                  onClick={() => setShowStudioModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer active:scale-95"
                >
                  <X className="w-4 h-4 text-rose-400" />
                  <span>RESUME GAME</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto border-t border-slate-800/60 py-1.5 scrollbar-thin">
              <button
                id="nav-tab-scripts"
                onClick={() => setActiveTab('scripts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'scripts'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Code2 className={`w-3.5 h-3.5 ${activeTab === 'scripts' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>C# Unity Scripts ({scripts.length})</span>
              </button>

              <button
                id="nav-tab-setup"
                onClick={() => setActiveTab('setup')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'setup'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'setup' ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>Setup & Hierarchy Guide</span>
              </button>

              <button
                id="nav-tab-tuner"
                onClick={() => setActiveTab('tuner')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'tuner'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Sliders className={`w-3.5 h-3.5 ${activeTab === 'tuner' ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>Mechanics Tuner</span>
              </button>

              <button
                id="nav-tab-architecture"
                onClick={() => setActiveTab('architecture')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'architecture'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <GitFork className={`w-3.5 h-3.5 ${activeTab === 'architecture' ? 'text-rose-400' : 'text-slate-500'}`} />
                <span>Architecture & Event Flow</span>
              </button>
            </div>
          </header>

          {/* Modal Main Content Area */}
          <div className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {activeTab === 'scripts' && <ScriptViewer scripts={scripts} />}
            {activeTab === 'setup' && <SetupGuide />}
            {activeTab === 'tuner' && (
              <MechanicsTuner
                settings={settings}
                onSettingsChange={setSettings}
                onResetDefaults={() => setSettings(DEFAULT_SETTINGS)}
              />
            )}
            {activeTab === 'architecture' && <ArchitectureDiagram />}
          </div>
        </div>
      )}
    </div>
  );
}
