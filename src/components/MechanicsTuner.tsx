import React from 'react';
import { GameSettings } from '../types';
import { Sliders, RotateCcw, User, Crosshair, Skull, Radio } from 'lucide-react';

interface MechanicsTunerProps {
  settings: GameSettings;
  onSettingsChange: (newSettings: GameSettings) => void;
  onResetDefaults: () => void;
}

export const MechanicsTuner: React.FC<MechanicsTunerProps> = ({
  settings,
  onSettingsChange,
  onResetDefaults
}) => {
  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl font-sans space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-wide">Battle Royale Mechanics & Balance Tuner</h2>
          </div>
          <p className="text-xs text-slate-400">
            Adjusting parameters dynamically updates the in-browser 3D simulation AND the generated Unity C# serialized fields.
          </p>
        </div>

        <button
          id="btn-reset-tuner"
          onClick={onResetDefaults}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Player Locomotion */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono border-b border-slate-800 pb-2">
            <User className="w-4 h-4" />
            <span>PLAYER LOCOMOTION</span>
          </div>

          {/* Walk Speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Walk Speed:</span>
              <span className="text-emerald-400 font-bold">{settings.walkSpeed} m/s</span>
            </div>
            <input
              id="slider-walk-speed"
              type="range"
              min="3"
              max="10"
              step="0.5"
              value={settings.walkSpeed}
              onChange={(e) => updateSetting('walkSpeed', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Sprint Speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Sprint Speed:</span>
              <span className="text-emerald-400 font-bold">{settings.sprintSpeed} m/s</span>
            </div>
            <input
              id="slider-sprint-speed"
              type="range"
              min="6"
              max="16"
              step="0.5"
              value={settings.sprintSpeed}
              onChange={(e) => updateSetting('sprintSpeed', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Jump Height */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Jump Height:</span>
              <span className="text-emerald-400 font-bold">{settings.jumpHeight} m</span>
            </div>
            <input
              id="slider-jump-height"
              type="range"
              min="1.0"
              max="3.5"
              step="0.1"
              value={settings.jumpHeight}
              onChange={(e) => updateSetting('jumpHeight', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Gravity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Gravity:</span>
              <span className="text-emerald-400 font-bold">{settings.gravity} m/s²</span>
            </div>
            <input
              id="slider-gravity"
              type="range"
              min="9.8"
              max="35.0"
              step="1.0"
              value={settings.gravity}
              onChange={(e) => updateSetting('gravity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Mouse Sens */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Mouse Sensitivity:</span>
              <span className="text-emerald-400 font-bold">{settings.mouseSensitivity}x</span>
            </div>
            <input
              id="slider-mouse-sensitivity"
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={settings.mouseSensitivity}
              onChange={(e) => updateSetting('mouseSensitivity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        {/* Weapons & Ballistics */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 font-mono border-b border-slate-800 pb-2">
            <Crosshair className="w-4 h-4" />
            <span>WEAPONS & COMBAT</span>
          </div>

          {/* Damage */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Base Rifle Damage:</span>
              <span className="text-sky-400 font-bold">{settings.damage} HP</span>
            </div>
            <input
              id="slider-damage"
              type="range"
              min="15"
              max="80"
              step="1"
              value={settings.damage}
              onChange={(e) => updateSetting('damage', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Fire Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Rifle Fire Rate:</span>
              <span className="text-sky-400 font-bold">{settings.fireRate} rps</span>
            </div>
            <input
              id="slider-fire-rate"
              type="range"
              min="1"
              max="12"
              step="0.5"
              value={settings.fireRate}
              onChange={(e) => updateSetting('fireRate', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Magazine Size */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Magazine Size:</span>
              <span className="text-sky-400 font-bold">{settings.magazineSize} rds</span>
            </div>
            <input
              id="slider-magazine-size"
              type="range"
              min="6"
              max="60"
              step="2"
              value={settings.magazineSize}
              onChange={(e) => updateSetting('magazineSize', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Reload Time */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Reload Time:</span>
              <span className="text-sky-400 font-bold">{settings.reloadTime}s</span>
            </div>
            <input
              id="slider-reload-time"
              type="range"
              min="0.8"
              max="4.0"
              step="0.2"
              value={settings.reloadTime}
              onChange={(e) => updateSetting('reloadTime', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Effective Range */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Effective Range:</span>
              <span className="text-sky-400 font-bold">{settings.range} m</span>
            </div>
            <input
              id="slider-range"
              type="range"
              min="30"
              max="200"
              step="10"
              value={settings.range}
              onChange={(e) => updateSetting('range', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        </div>

        {/* Humanoid Bot AI */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400 font-mono border-b border-slate-800 pb-2">
            <Skull className="w-4 h-4" />
            <span>HUMANOID BOT AI</span>
          </div>

          {/* Bot Detection Radius */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Detection Radius:</span>
              <span className="text-rose-400 font-bold">{settings.detectionRadius} m</span>
            </div>
            <input
              id="slider-detection-radius"
              type="range"
              min="8"
              max="35"
              step="1"
              value={settings.detectionRadius}
              onChange={(e) => updateSetting('detectionRadius', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Chase Speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Combat Run Speed:</span>
              <span className="text-rose-400 font-bold">{settings.enemySpeed} m/s</span>
            </div>
            <input
              id="slider-chase-speed"
              type="range"
              min="3.0"
              max="10.0"
              step="0.5"
              value={settings.enemySpeed}
              onChange={(e) => updateSetting('enemySpeed', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Patrol Speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Tactical Patrol:</span>
              <span className="text-rose-400 font-bold">{settings.enemyPatrolSpeed} m/s</span>
            </div>
            <input
              id="slider-patrol-speed"
              type="range"
              min="1.0"
              max="4.5"
              step="0.2"
              value={settings.enemyPatrolSpeed}
              onChange={(e) => updateSetting('enemyPatrolSpeed', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Bot Max Health */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Bot Health:</span>
              <span className="text-rose-400 font-bold">{settings.enemyHealth} HP</span>
            </div>
            <input
              id="slider-enemy-health"
              type="range"
              min="50"
              max="200"
              step="10"
              value={settings.enemyHealth}
              onChange={(e) => updateSetting('enemyHealth', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Bot Attack Damage */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Bot Rifle Burst:</span>
              <span className="text-rose-400 font-bold">{settings.enemyDamage} HP</span>
            </div>
            <input
              id="slider-enemy-damage"
              type="range"
              min="5"
              max="35"
              step="2"
              value={settings.enemyDamage}
              onChange={(e) => updateSetting('enemyDamage', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>
        </div>

        {/* Battle Royale Storm Zone */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono border-b border-slate-800 pb-2">
            <Radio className="w-4 h-4" />
            <span>STORM & SAFE ZONE</span>
          </div>

          {/* Initial Storm Radius */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Initial Safe Radius:</span>
              <span className="text-amber-400 font-bold">{settings.initialStormRadius} m</span>
            </div>
            <input
              id="slider-storm-radius"
              type="range"
              min="80"
              max="180"
              step="10"
              value={settings.initialStormRadius}
              onChange={(e) => updateSetting('initialStormRadius', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Storm Shrink Duration */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Shrink Duration:</span>
              <span className="text-amber-400 font-bold">{settings.stormShrinkDuration}s</span>
            </div>
            <input
              id="slider-storm-duration"
              type="range"
              min="15"
              max="90"
              step="5"
              value={settings.stormShrinkDuration}
              onChange={(e) => updateSetting('stormShrinkDuration', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Storm Damage Per Second */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Storm Tick Damage:</span>
              <span className="text-amber-400 font-bold">{settings.stormDamagePerSecond} HP/s</span>
            </div>
            <input
              id="slider-storm-dps"
              type="range"
              min="1"
              max="15"
              step="1"
              value={settings.stormDamagePerSecond}
              onChange={(e) => updateSetting('stormDamagePerSecond', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Total Match Bots */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Starting Bot Combatants:</span>
              <span className="text-amber-400 font-bold">{settings.botCount} Bots</span>
            </div>
            <input
              id="slider-bot-count"
              type="range"
              min="8"
              max="24"
              step="2"
              value={settings.botCount}
              onChange={(e) => updateSetting('botCount', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
