export interface GameSettings {
  // Player Locomotion
  walkSpeed: number;
  sprintSpeed: number;
  jumpHeight: number;
  gravity: number;
  mouseSensitivity: number;

  // Active Primary Weapon
  damage: number;
  fireRate: number; // rounds per second
  magazineSize: number;
  reloadTime: number; // seconds
  range: number;

  // Humanoid Enemy AI Bots
  enemySpeed: number;
  enemyPatrolSpeed: number;
  detectionRadius: number;
  attackRange: number;
  enemyHealth: number;
  enemyDamage: number;
  botCount: number;

  // Battle Royale Storm / Zone
  initialStormRadius: number; // meters
  stormShrinkDuration: number; // seconds per phase
  stormDamagePerSecond: number;
}

export type WeaponType = 'rifle' | 'shotgun' | 'sniper';

export interface WeaponData {
  type: WeaponType;
  name: string;
  damage: number;
  fireRate: number;
  magSize: number;
  reloadTime: number;
  range: number;
  color: string;
  iconName: string;
}

export type LootType = 'rifle' | 'shotgun' | 'sniper' | 'medkit' | 'shield' | 'ammo';

export interface LootItem {
  id: string;
  type: LootType;
  name: string;
  color: string;
  amount?: number;
}

export interface KillFeedItem {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  isHeadshot?: boolean;
}

export interface ScriptFile {
  id: string;
  name: string;
  filename: string;
  category: 'Player' | 'Combat' | 'AI' | 'UI' | 'BattleRoyale' | 'Architecture';
  description: string;
  dependencies: string[];
  unityComponentsRequired: string[];
  code: string;
}

export interface SetupStep {
  id: string;
  title: string;
  category: string;
  summary: string;
  steps: string[];
  inspectorNotes?: { [key: string]: string };
  commonMistakes?: string[];
}

export type ViewTab = 'simulator' | 'scripts' | 'setup' | 'architecture' | 'tuner';
