import React from 'react';
import { GitFork, ArrowRight, Shield, Crosshair, Skull, Radio, Monitor, Cpu, Box } from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl font-sans space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <GitFork className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Battle Royale System Architecture & Event Flow</h2>
        </div>
        <p className="text-xs text-slate-400">
          How decoupled Unity C# systems communicate via C# Action events, interfaces (IDamageable), raycast ballistics, and game loops.
        </p>
      </div>

      {/* Visual Component Nodes & Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Column 1: Player & Locomotion */}
        <div className="space-y-4">
          <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>PLAYER & VITALITY</span>
          </div>

          <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">PlayerController.cs</span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                MonoBehaviour
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Handles smooth WASD, mouse look pitch/yaw clamping, sprinting, jumping, and parachute glider descent.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <div>Requires: <span className="text-emerald-300">CharacterController</span></div>
              <div>Glider: <span className="text-slate-300">Airspeed Drift Model</span></div>
            </div>
          </div>

          <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">PlayerHealth.cs</span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                IDamageable
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dual-layer vitality: 100 Health + 100 Shield Armor. Damage punctures shields before HP. Receives storm tick damage.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <div>Events: <span className="text-indigo-300">Action&lt;hp, maxHp, shield, maxShield&gt;</span></div>
            </div>
          </div>
        </div>

        {/* Column 2: Weapons, Ballistics & Loot */}
        <div className="space-y-4">
          <div className="text-xs font-mono font-bold text-sky-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>ARSENAL & LOOT SYSTEM</span>
          </div>

          <div className="bg-slate-950 border border-sky-500/30 rounded-xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">WeaponSystem.cs</span>
              <span className="text-[10px] font-mono bg-sky-500/10 text-sky-300 px-2 py-0.5 rounded border border-sky-500/20">
                Arsenal Manager
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-weapon switching (Rifle, Shotgun, Sniper). Handles ADS camera FOV zoom, raycast ballistics, recoil kick, and reload coroutines.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <div>Raycast: <span className="text-sky-300">Physics.Raycast(Camera.main)</span></div>
              <div>Events: <span className="text-indigo-300">OnAmmoChanged, OnHitEnemy</span></div>
            </div>
          </div>

          <div className="bg-slate-950 border border-sky-500/30 rounded-xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">LootItem.cs</span>
              <span className="text-[10px] font-mono bg-sky-500/10 text-sky-300 px-2 py-0.5 rounded border border-sky-500/20">
                Trigger Entity
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Ground items & supply crates with vertical beacon pillars. Floats and spins; equips weapons, shields (+50), and medkits on 'E'.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <div>Trigger: <span className="text-slate-300">SphereCollider (IsTrigger: true)</span></div>
            </div>
          </div>
        </div>

        {/* Column 3: Battle Royale Directing & Storm */}
        <div className="space-y-4">
          <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>STORM, BOTS & DIRECTOR</span>
          </div>

          <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">StormZone.cs</span>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                Safe Zone Circle
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interpolates shrinking cylinder across 5 phases. Computes player distance to storm center; inflicts periodic DPS if caught in storm.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <div>Visual: <span className="text-amber-300">Inverted Cylinder Mesh</span></div>
              <div>Events: <span className="text-indigo-300">OnStormPhaseChanged</span></div>
            </div>
          </div>

          <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">HumanoidEnemyAI.cs</span>
              <span className="text-[10px] font-mono bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded border border-rose-500/20">
                NavMesh Bot
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Realistic soldier AI with head, vest, and rifle. NavMesh waypoint roaming, line-of-sight vision cone, rifle burst shooting, and death loot drop.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <div>Implements: <span className="text-emerald-300">IDamageable</span></div>
              <div>Drop: <span className="text-slate-300">Instantiate(lootPrefab)</span></div>
            </div>
          </div>

          <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">GameManager.cs</span>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                Match Director
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tracks 15 total combatants alive, simulates distant bot-vs-bot kills for the feed, and triggers '#1 Victory Royale' when you are the sole survivor.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
              <div>Victory: <span className="text-yellow-400">playersAlive == 1</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
