import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameSettings, WeaponType, WeaponData, LootItem, KillFeedItem, POILocation } from '../types';
import { sounds } from '../utils/soundEffects';
import { TextureGenerator } from '../utils/textureGenerator';
import { MapBuilder, ExplosiveBarrelInstance, JumpPadInstance } from '../utils/mapBuilder';
import { GameGuideModal } from './GameGuideModal';
import confetti from 'canvas-confetti';
import {
  Shield,
  Heart,
  Crosshair,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Trophy,
  Skull,
  Radio,
  Clock,
  Compass,
  Zap,
  Target,
  ChevronRight,
  HelpCircle,
  Sliders,
  Maximize2,
  Minimize2,
  Navigation,
  Move,
  Gamepad2,
  Pause,
  Smartphone,
  RotateCw
} from 'lucide-react';

interface ThreeFPSGameProps {
  settings: GameSettings;
}

// Arsenal Definitions
const WEAPONS_CATALOG: Record<WeaponType, WeaponData> = {
  rifle: {
    type: 'rifle',
    name: 'M4A1 Tactical Rifle',
    damage: 34,
    fireRate: 6.5,
    magSize: 30,
    reloadTime: 1.8,
    range: 90,
    color: '#3b82f6',
    iconName: 'Assault'
  },
  shotgun: {
    type: 'shotgun',
    name: 'SPAS-12 Shotgun',
    damage: 88, // 8 pellets x 11
    fireRate: 1.1,
    magSize: 8,
    reloadTime: 2.2,
    range: 35,
    color: '#f59e0b',
    iconName: 'Shotgun'
  },
  sniper: {
    type: 'sniper',
    name: 'AWM Bolt-Action Sniper',
    damage: 130,
    fireRate: 0.7,
    magSize: 5,
    reloadTime: 2.8,
    range: 220,
    color: '#ec4899',
    iconName: 'Sniper'
  }
};

interface HumanoidEnemy {
  id: string;
  name: string;
  mesh: THREE.Group;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  state: 'Patrol' | 'Chase' | 'Attack' | 'Dead';
  waypoints: THREE.Vector3[];
  currentWaypoint: number;
  nextFireTime: number;
  healthBarCanvas: HTMLCanvasElement;
  healthBarTexture: THREE.CanvasTexture;
  healthBarSprite: THREE.Sprite;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  torso: THREE.Mesh;
  head: THREE.Mesh;
  walkCycle: number;
  isShooting: boolean;
}

interface GroundLootInstance {
  id: string;
  type: LootItem['type'];
  name: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  color: string;
}

interface BulletTracer {
  line: THREE.Line;
  startTime: number;
  duration: number;
}

interface ImpactSpark {
  mesh: THREE.Points;
  velocities: THREE.Vector3[];
  startTime: number;
  duration: number;
}

export const ThreeFPSGame: React.FC<ThreeFPSGameProps> = ({ settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);

  // Player Gameplay Stats
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerShield, setPlayerShield] = useState(50);
  const [activeWeaponType, setActiveWeaponType] = useState<WeaponType>('rifle');
  const [currentAmmo, setCurrentAmmo] = useState(WEAPONS_CATALOG.rifle.magSize);
  const [reserveAmmo, setReserveAmmo] = useState(180);
  const [isReloading, setIsReloading] = useState(false);
  const [isAimingDownSights, setIsAimingDownSights] = useState(false);

  // Battle Royale Telemetry
  const [playersAlive, setPlayersAlive] = useState(21);
  const [playerKills, setPlayerKills] = useState(0);
  const [stormPhase, setStormPhase] = useState(1);
  const [stormTimer, setStormTimer] = useState(45);
  const [isStormShrinking, setIsStormShrinking] = useState(false);
  const [isInsideSafeZone, setIsInsideSafeZone] = useState(true);
  const [distanceToSafeCenter, setDistanceToSafeCenter] = useState(0);
  const [compassHeading, setCompassHeading] = useState(0);
  const [nearbyLootPrompt, setNearbyLootPrompt] = useState<string | null>(null);

  // Match State & Overlays
  const [isVictory, setIsVictory] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [dropPhase, setDropPhase] = useState<'in_plane' | 'freefall' | 'parachute' | 'landed'>('in_plane');
  const [isMatchPaused, setIsMatchPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [accuracy, setAccuracy] = useState(100);
  const [activeObjectiveTip, setActiveObjectiveTip] = useState<string>(
    'Find glowing supply crates for weapons & armor! [Press E]'
  );

  // Control Enhancements (Default to TRUE so virtual controls are immediately visible on mobile/touch)
  const [mouseSensitivity, setMouseSensitivity] = useState(2.0);
  const [showOnScreenControls, setShowOnScreenControls] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth <= 1024
      );
    }
    return true;
  });
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Crosshair & Feedback
  const [hitmarkerActive, setHitmarkerActive] = useState(false);
  const [isDamagedVignette, setIsDamagedVignette] = useState(false);

  // Mobile Touch Joystick & Touch Look State
  const [joystickKnobPos, setJoystickKnobPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef({ x: 0, y: 0 });

  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookTouchRef = useRef({ x: 0, y: 0 });
  const rotateCameraRef = useRef<(deltaYaw: number, deltaPitch: number) => void>(() => {});

  // Virtual Controls Action Trigger Refs
  const virtualInputRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    shoot: false,
    ads: false,
    lookLeft: false,
    lookRight: false,
    lookUp: false,
    lookDown: false
  });

  // State ref for high-frequency animation loop
  const stateRef = useRef({
    playerHealth: 100,
    playerShield: 50,
    activeWeapon: WEAPONS_CATALOG.rifle,
    ammoByWeapon: {
      rifle: { current: 30, reserve: 180 },
      shotgun: { current: 8, reserve: 40 },
      sniper: { current: 5, reserve: 25 }
    },
    isReloading: false,
    isAimingDownSights: false,
    playersAlive: 21,
    playerKills: 0,
    shotsFired: 0,
    shotsHit: 0,
    hasStartedPlaying: false,
    dropPhase: 'in_plane' as 'in_plane' | 'freefall' | 'parachute' | 'landed',
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    isPointerLocked: false,
    joystickVector: { x: 0, y: 0 },
    isFiringContinuous: false,
    settings,
    mouseSensitivity: 2.0,
    stormRadius: 210,
    stormCenter: new THREE.Vector3(0, 0, 0),
    isInsideSafeZone: true,
    compassHeading: 0,
    playerPosition: new THREE.Vector3(0, 1.68, 20),
    playerVelocity: new THREE.Vector3(0, 0, 0)
  });

  const resetMatchRef = useRef<() => void>(() => {});
  const revivePlayerRef = useRef<() => void>(() => {});
  const togglePauseMatchRef = useRef<() => void>(() => {});
  const pickupLootRef = useRef<() => void>(() => {});
  const shootWeaponRef = useRef<() => void>(() => {});
  const reloadWeaponRef = useRef<() => void>(() => {});

  // Auto-detect mobile and touch devices & screen orientation
  useEffect(() => {
    const isTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (typeof window !== 'undefined' && window.innerWidth < 1024);
    setIsTouchDevice(isTouch);
    if (isTouch) {
      setShowOnScreenControls(true);
    }

    const checkOrientation = () => {
      const isP = window.innerHeight > window.innerWidth;
      setIsPortrait(isP);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    if (typeof screen !== 'undefined' && screen.orientation) {
      screen.orientation.addEventListener('change', checkOrientation);
    }
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (typeof screen !== 'undefined' && screen.orientation) {
        screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, []);

  // Handler: Request browser fullscreen and lock orientation to landscape
  const handleAutoRotateLandscape = useCallback(async () => {
    try {
      const docEl = document.documentElement as any;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen().catch(() => {});
        }
      }
      if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch (err) {
      console.log('Screen orientation lock note:', err);
    }
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keep mouse sensitivity ref updated
  useEffect(() => {
    stateRef.current.mouseSensitivity = mouseSensitivity;
  }, [mouseSensitivity]);

  // Update sound mute status
  useEffect(() => {
    sounds.setMuted(isSoundMuted);
  }, [isSoundMuted]);

  // Main Three.js Scene Setup & Battle Royale Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animId: number;
    const clock = new THREE.Clock();

    // 1. SCENE & ATMOSPHERE
    const scene = new THREE.Scene();
    // Crystal-clear azure sky with distant horizon fog for maximum visual clarity
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.Fog(0x38bdf8, 400, 1800);

    // 2. CAMERA (First Person Player View)
    const isMobileDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (typeof window !== 'undefined' && window.innerWidth < 1024);

    const initialWidth = container.clientWidth || window.innerWidth;
    const initialHeight = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(
      75,
      initialWidth / (initialHeight || 1),
      0.1,
      2500
    );
    camera.position.set(0, 300, 0);

    // 3. RENDERER with Antialiasing, Tone Mapping & Soft Shadows for ultra-crisp graphics
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobileDevice, // Disable on mobile to save performance
      powerPreference: 'high-performance',
      precision: isMobileDevice ? 'mediump' : 'highp'
    });
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(isMobileDevice ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = !isMobileDevice; // Disable expensive shadows on mobile entirely
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 4. LIGHTING & SUN FLARE
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.95);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.55);
    sunLight.position.set(100, 180, 80);
    if (!isMobileDevice) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 500;
      const d = 160;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);

    // Crisp ambient fill light for crystal-clear shadow details
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    // Sun Disc in Sky
    const sunMeshGeo = new THREE.SphereGeometry(14, 16, 16);
    const sunMeshMat = new THREE.MeshBasicMaterial({ color: 0xfff3a1 });
    const sunMesh = new THREE.Mesh(sunMeshGeo, sunMeshMat);
    sunMesh.position.set(250, 450, 200);
    scene.add(sunMesh);

    // Sky Clouds Group
    const cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });
    const numClouds = isMobileDevice ? 6 : 20;
    for (let c = 0; c < numClouds; c++) {
      const cloudGeo = new THREE.DodecahedronGeometry(Math.random() * 15 + 20, isMobileDevice ? 0 : 1);
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(
        (Math.random() - 0.5) * 600,
        150 + Math.random() * 60,
        (Math.random() - 0.5) * 600
      );
      cloud.scale.set(1.8, 0.5, 1.2);
      cloudsGroup.add(cloud);
    }
    scene.add(cloudsGroup);

    // Tracers and spark particle tracking
    const tracers: BulletTracer[] = [];
    const impactSparks: ImpactSpark[] = [];

    // AIRPLANE MODEL (C-130 style drop plane)
    const airplaneGroup = new THREE.Group();
    const fuseGeo = new THREE.CylinderGeometry(4.5, 4.5, 36, 16);
    fuseGeo.rotateX(Math.PI / 2);
    const planeMat = new THREE.MeshLambertMaterial({ color: 0x475569 }); // slate-600
    const fuselage = new THREE.Mesh(fuseGeo, planeMat);
    airplaneGroup.add(fuselage);
    
    const wingGeo = new THREE.BoxGeometry(45, 1.2, 7);
    const wingMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // slate-700
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, 2, 2);
    airplaneGroup.add(wings);
    
    const tailGeo = new THREE.BoxGeometry(14, 1.2, 5);
    const tail = new THREE.Mesh(tailGeo, wingMat);
    tail.position.set(0, 2, -15);
    airplaneGroup.add(tail);
    
    const finGeo = new THREE.BoxGeometry(1.2, 7, 5);
    const fin = new THREE.Mesh(finGeo, wingMat);
    fin.position.set(0, 5, -15);
    airplaneGroup.add(fin);
    
    let planeZ = -550;
    airplaneGroup.position.set(0, 320, planeZ);
    scene.add(airplaneGroup);

    // PARACHUTE MODEL (Attached to player during drop)
    const parachuteGroup = new THREE.Group();
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
    scene.add(parachuteGroup);

    // PLAYER DROP DUMMY (Visible only in 3rd person skydive)
    const playerDropDummy = new THREE.Group();
playerDropDummy.visible = false;
    scene.add(playerDropDummy);

    // 5. EXPANDED BATTLE ROYALE MAP (1000m Island)
    const {
      terrain,
      collidableMeshes,
      interactiveBarrels,
      jumpPads,
      pois,
      getTerrainHeight
    } = MapBuilder.buildMap(scene, isMobileDevice);





    // Atmospheric Battlefield Dust / Wind Drift Particles
    const particleCount = 260;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount * 3; p += 3) {
      pPositions[p] = (Math.random() - 0.5) * 440;
      pPositions[p + 1] = Math.random() * 26 + 0.5;
      pPositions[p + 2] = (Math.random() - 0.5) * 440;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.32,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const dustParticles = new THREE.Points(pGeo, pMat);
    scene.add(dustParticles);

    // 6. DYNAMIC STORM BARRIER (Cyber energy shield cylinder)
    let stormPhaseTime = 45;
    let currentPhase = 1;
    let isShrinkActive = false;
    let stormDamageTimer = 0;

    const initialStormR = 480;
    const stormCylinderGeo = new THREE.CylinderGeometry(initialStormR, initialStormR, 75, 64, 1, true);
    const stormMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });
    const stormCylinder = new THREE.Mesh(stormCylinderGeo, stormMat);
    stormCylinder.position.set(0, 37.5, 0);
    scene.add(stormCylinder);

    // Storm glowing edge ring on the ground
    const ringGeo = new THREE.RingGeometry(initialStormR - 1.5, initialStormR + 1.5, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const stormRing = new THREE.Mesh(ringGeo, ringMat);
    stormRing.position.set(0, 0.2, 0);
    scene.add(stormRing);

    // 7. GROUND LOOT WITH VERTICAL BEACONS
    const groundLootRoster: GroundLootInstance[] = [];

    const createLootPickup = (
      id: string,
      type: LootItem['type'],
      name: string,
      colorHex: number,
      pos: THREE.Vector3
    ) => {
      const lootGroup = new THREE.Group();
      const baseGroundY = getTerrainHeight(pos.x, pos.z);
      const finalPos = new THREE.Vector3(pos.x, baseGroundY + pos.y, pos.z);
      lootGroup.position.copy(finalPos);

      // Floating crate box
      const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      const boxMat = new THREE.MeshLambertMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.35
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.y = 0.6;
      box.castShadow = true;
      lootGroup.add(box);

      // Gold/Cyan glow ring
      const gRingGeo = new THREE.TorusGeometry(0.65, 0.05, 8, 16);
      gRingGeo.rotateX(Math.PI / 2);
      const gRingMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.7 });
      const gRing = new THREE.Mesh(gRingGeo, gRingMat);
      gRing.position.y = 0.6;
      lootGroup.add(gRing);

      // Tall vertical beacon beam of light
      const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 35, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.35
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 17.5;
      lootGroup.add(beam);

      scene.add(lootGroup);
      groundLootRoster.push({
        id,
        type,
        name,
        mesh: lootGroup,
        position: finalPos,
        color: `#${colorHex.toString(16).padStart(6, '0')}`
      });
    };

    // Strategic Loot Points across all 6 POIs on the expanded 1000m map
    const lootSpawnPoints = [
      // Central Plaza & HQ
      { id: 'l1', type: 'rifle' as const, name: 'M4A1 Assault Rifle', hex: 0x3b82f6, pos: new THREE.Vector3(0, 0, 15) },
      { id: 'l2', type: 'shield' as const, name: 'Shield Potion (+50)', hex: 0x06b6d4, pos: new THREE.Vector3(-4, 0, 18) },
      { id: 'l3', type: 'medkit' as const, name: 'Medkit (+50 HP)', hex: 0x22c55e, pos: new THREE.Vector3(4, 0, 18) },
      { id: 'l4', type: 'shotgun' as const, name: 'SPAS-12 Shotgun', hex: 0xf59e0b, pos: new THREE.Vector3(20, 0, -10) },
      { id: 'l5', type: 'ammo' as const, name: 'Heavy Ammo Pack', hex: 0xf59e0b, pos: new THREE.Vector3(-20, 0, -10) },

      // Airfield & Hangars
      { id: 'l6', type: 'rifle' as const, name: 'M4A1 Assault Rifle', hex: 0x3b82f6, pos: new THREE.Vector3(-280, 0, -40) },
      { id: 'l7', type: 'shotgun' as const, name: 'SPAS-12 Shotgun', hex: 0xf59e0b, pos: new THREE.Vector3(-330, 0, -30) },
      { id: 'l8', type: 'shield' as const, name: 'Shield Potion (+50)', hex: 0x06b6d4, pos: new THREE.Vector3(-230, 0, -50) },
      { id: 'l9', type: 'ammo' as const, name: 'Heavy Ammo Pack', hex: 0xf59e0b, pos: new THREE.Vector3(-280, 0, -160) },

      // Citadel Fortress & Helipad
      { id: 'l10', type: 'sniper' as const, name: 'AWM Sniper Rifle', hex: 0xec4899, pos: new THREE.Vector3(60, 12.6, -280) },
      { id: 'l11', type: 'shield' as const, name: 'Shield Potion (+50)', hex: 0x06b6d4, pos: new THREE.Vector3(36, 0, -270) },
      { id: 'l12', type: 'medkit' as const, name: 'Medkit (+50 HP)', hex: 0x22c55e, pos: new THREE.Vector3(84, 0, -270) },

      // Cargo Port Container Yard
      { id: 'l13', type: 'shotgun' as const, name: 'SPAS-12 Shotgun', hex: 0xf59e0b, pos: new THREE.Vector3(280, 0, 70) },
      { id: 'l14', type: 'shield' as const, name: 'Shield Potion (+50)', hex: 0x06b6d4, pos: new THREE.Vector3(250, 0, 100) },
      { id: 'l15', type: 'ammo' as const, name: 'Heavy Ammo Pack', hex: 0xf59e0b, pos: new THREE.Vector3(300, 0, 50) },

      // Radio Relay Peak
      { id: 'l16', type: 'sniper' as const, name: 'AWM Sniper Rifle', hex: 0xec4899, pos: new THREE.Vector3(240, 2.2, -224) },
      { id: 'l17', type: 'shield' as const, name: 'Shield Potion (+50)', hex: 0x06b6d4, pos: new THREE.Vector3(264, 0, -236) },

      // Lumber Camp & Forest Outpost
      { id: 'l18', type: 'rifle' as const, name: 'M4A1 Assault Rifle', hex: 0x3b82f6, pos: new THREE.Vector3(-230, 0, 230) },
      { id: 'l19', type: 'medkit' as const, name: 'Medkit (+50 HP)', hex: 0x22c55e, pos: new THREE.Vector3(-260, 0, 260) },

      // River Bridge
      { id: 'l20', type: 'ammo' as const, name: 'Heavy Ammo Pack', hex: 0xf59e0b, pos: new THREE.Vector3(-100, 0.4, 0) }
    ];
    lootSpawnPoints.forEach((lp) => createLootPickup(lp.id, lp.type, lp.name, lp.hex, lp.pos));

    // Shared tactical materials and camo skins for high-fidelity soldiers
    const camoWoodlandTex = TextureGenerator.createCamoTexture('woodland');
    const camoUrbanTex = TextureGenerator.createCamoTexture('urban');
    const camoDesertTex = TextureGenerator.createCamoTexture('desert');
    const camoSpecOpsTex = TextureGenerator.createCamoTexture('specops');

    const camoMaterials = [
      new THREE.MeshLambertMaterial({ map: camoWoodlandTex,  }),
      new THREE.MeshLambertMaterial({ map: camoUrbanTex,  }),
      new THREE.MeshLambertMaterial({ map: camoDesertTex,  }),
      new THREE.MeshLambertMaterial({ map: camoSpecOpsTex,  })
    ];

    // Shared military gear materials
    const tacticalArmorVestMat = new THREE.MeshLambertMaterial({ color: 0x090d16,  });
    const tacticalHelmetMat = new THREE.MeshLambertMaterial({ color: 0x181e29,  });
    const tacticalBootMat = new THREE.MeshLambertMaterial({ color: 0x05070a,  });
    const tacticalGunMat = new THREE.MeshLambertMaterial({ color: 0x1c2128,  });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xcca076 });
    const visorCyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const pouchMat = new THREE.MeshLambertMaterial({ color: 0x1f2937,  });
    const backpackMat = new THREE.MeshLambertMaterial({ color: 0x111827,  });

    // 8. HEAVY TACTICAL HUMANOID SOLDIER BOTS (Thick Armor, Modular Helmet, Backpack, and Assault Rifle)
    
    const buildSoldierMesh = (targetGroup: THREE.Group, uniformMat: THREE.Material) => {
      // 1. Torso: Heavy Camo Fatigues BDU
      const torsoGeo = new THREE.BoxGeometry(0.62, 0.78, 0.36);
      const torso = new THREE.Mesh(torsoGeo, uniformMat);
      torso.position.y = 1.18;
      torso.castShadow = true;
      targetGroup.add(torso);

      // 2. Thick Tactical Plate Carrier Vest (Heavy ceramic front/back plates)
      const vestGeo = new THREE.BoxGeometry(0.68, 0.60, 0.42);
      const vest = new THREE.Mesh(vestGeo, tacticalArmorVestMat);
      vest.position.y = 1.22;
      vest.castShadow = true;
      targetGroup.add(vest);

      // Triple MOLLE Ammo Pouches on chest
      for (let p = -1; p <= 1; p++) {
        const pouchGeo = new THREE.BoxGeometry(0.14, 0.18, 0.08);
        const pouch = new THREE.Mesh(pouchGeo, pouchMat);
        pouch.position.set(p * 0.17, 1.16, 0.24);
        pouch.castShadow = true;
        targetGroup.add(pouch);
      }

      // Tactical Radio Communicator on shoulder with antenna
      const radioGeo = new THREE.BoxGeometry(0.10, 0.15, 0.08);
      const radio = new THREE.Mesh(radioGeo, tacticalArmorVestMat);
      radio.position.set(-0.24, 1.42, 0.16);
      targetGroup.add(radio);

      const antennaGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.28, 4);
      const antenna = new THREE.Mesh(antennaGeo, tacticalGunMat);
      antenna.position.set(-0.24, 1.58, 0.16);
      targetGroup.add(antenna);

      // Heavy Military Tactical Backpack / Rucksack on back
      const packGeo = new THREE.BoxGeometry(0.50, 0.54, 0.32);
      const backpack = new THREE.Mesh(packGeo, backpackMat);
      backpack.position.set(0, 1.22, -0.32);
      backpack.castShadow = true;
      targetGroup.add(backpack);

      // Bedroll cylinder on top of backpack
      const rollGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.48, 8);
      rollGeo.rotateZ(Math.PI / 2);
      const bedroll = new THREE.Mesh(rollGeo, pouchMat);
      bedroll.position.set(0, 1.52, -0.32);
      targetGroup.add(bedroll);

      // 3. Head & FAST Ballistic Helmet
      const headGeo = new THREE.SphereGeometry(0.20, 12, 12);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.74;
      head.castShadow = true;
      targetGroup.add(head);

      // Ballistic Combat Helmet Shell
      const helmetGeo = new THREE.SphereGeometry(0.24, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.68);
      const helmet = new THREE.Mesh(helmetGeo, tacticalHelmetMat);
      helmet.position.set(0, 1.78, 0);
      helmet.castShadow = true;
      targetGroup.add(helmet);

      // Helmet Ear-Guards / Comms Ear-cups
      const earGeo = new THREE.BoxGeometry(0.08, 0.12, 0.10);
      const leftEar = new THREE.Mesh(earGeo, tacticalArmorVestMat);
      leftEar.position.set(-0.22, 1.74, 0);
      targetGroup.add(leftEar);

      const rightEar = new THREE.Mesh(earGeo, tacticalArmorVestMat);
      rightEar.position.set(0.22, 1.74, 0);
      targetGroup.add(rightEar);

      // Glowing Tactical Visor / Ballistic Goggles
      const visorGeo = new THREE.BoxGeometry(0.26, 0.08, 0.14);
      const visor = new THREE.Mesh(visorGeo, visorCyanMat);
      visor.position.set(0, 1.75, 0.19);
      targetGroup.add(visor);

      // NVG Forehead Mount Bracket
      const nvgMountGeo = new THREE.BoxGeometry(0.08, 0.07, 0.06);
      const nvgMount = new THREE.Mesh(nvgMountGeo, tacticalGunMat);
      nvgMount.position.set(0, 1.86, 0.20);
      targetGroup.add(nvgMount);

      // 4. Arms & Thick Tactical Shoulder Pauldrons
      const armGeo = new THREE.CylinderGeometry(0.11, 0.10, 0.68, 8);

      const leftArm = new THREE.Mesh(armGeo, uniformMat);
      leftArm.position.set(-0.40, 1.25, 0.15);
      leftArm.rotation.x = Math.PI / 4;
      leftArm.castShadow = true;
      targetGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, uniformMat);
      rightArm.position.set(0.40, 1.25, 0.15);
      rightArm.rotation.x = Math.PI / 4;
      rightArm.castShadow = true;
      targetGroup.add(rightArm);

      // Thick Ballistic Shoulder Armor Plates (Left & Right Pauldrons)
      const pauldronGeo = new THREE.BoxGeometry(0.24, 0.20, 0.24);
      const leftPauldron = new THREE.Mesh(pauldronGeo, tacticalArmorVestMat);
      leftPauldron.position.set(-0.42, 1.44, 0.02);
      leftPauldron.castShadow = true;
      targetGroup.add(leftPauldron);

      const rightPauldron = new THREE.Mesh(pauldronGeo, tacticalArmorVestMat);
      rightPauldron.position.set(0.42, 1.44, 0.02);
      rightPauldron.castShadow = true;
      targetGroup.add(rightPauldron);

      // Ballistic Elbow Armor Pads
      const elbowGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 6);
      const lElbow = new THREE.Mesh(elbowGeo, tacticalArmorVestMat);
      lElbow.position.set(-0.40, 1.18, 0.15);
      targetGroup.add(lElbow);

      const rElbow = new THREE.Mesh(elbowGeo, tacticalArmorVestMat);
      rElbow.position.set(0.40, 1.18, 0.15);
      targetGroup.add(rElbow);

      // Tactical Gloves Gripping the Weapon
      const gloveGeo = new THREE.BoxGeometry(0.15, 0.15, 0.16);
      const lGlove = new THREE.Mesh(gloveGeo, tacticalArmorVestMat);
      lGlove.position.set(-0.28, 1.05, 0.40);
      targetGroup.add(lGlove);

      const rGlove = new THREE.Mesh(gloveGeo, tacticalArmorVestMat);
      rGlove.position.set(0.25, 1.08, 0.38);
      targetGroup.add(rGlove);

      // 5. Heavy Combat Rifle Model Held in Hands
      const rifleGroup = new THREE.Group();
      rifleGroup.position.set(0.22, 1.14, 0.46);

      // Rifle Receiver & Stock
      const rReceiverGeo = new THREE.BoxGeometry(0.09, 0.15, 0.48);
      const rReceiver = new THREE.Mesh(rReceiverGeo, tacticalGunMat);
      rReceiver.castShadow = true;
      rifleGroup.add(rReceiver);

      const rStockGeo = new THREE.BoxGeometry(0.07, 0.12, 0.24);
      const rStock = new THREE.Mesh(rStockGeo, tacticalArmorVestMat);
      rStock.position.set(0, -0.02, 0.34);
      rifleGroup.add(rStock);

      // Curved Banana Magazine
      const rMagGeo = new THREE.BoxGeometry(0.06, 0.24, 0.12);
      const rMag = new THREE.Mesh(rMagGeo, tacticalArmorVestMat);
      rMag.position.set(0, -0.16, -0.04);
      rMag.rotation.x = -0.2;
      rifleGroup.add(rMag);

      // Handguard Rail & Heavy Fluted Barrel
      const rBarrelGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.44, 8);
      rBarrelGeo.rotateX(Math.PI / 2);
      const rBarrel = new THREE.Mesh(rBarrelGeo, tacticalGunMat);
      rBarrel.position.set(0, 0.02, -0.42);
      rifleGroup.add(rBarrel);

      // Flash Suppressor Muzzle Tip
      const rFlashGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.08, 8);
      rFlashGeo.rotateX(Math.PI / 2);
      const rFlash = new THREE.Mesh(rFlashGeo, tacticalArmorVestMat);
      rFlash.position.set(0, 0.02, -0.66);
      rifleGroup.add(rFlash);

      // Tactical Holographic Optic Sight with glowing cyan dot
      const rSightGeo = new THREE.BoxGeometry(0.06, 0.07, 0.12);
      const rSight = new THREE.Mesh(rSightGeo, tacticalArmorVestMat);
      rSight.position.set(0, 0.10, -0.08);
      rifleGroup.add(rSight);

      const rLensGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
      const rLens = new THREE.Mesh(rLensGeo, visorCyanMat);
      rLens.position.set(0, 0.10, -0.02);
      rifleGroup.add(rLens);

      targetGroup.add(rifleGroup);

      // 6. Legs & Reinforced Knee Armor Guards
      const legGeo = new THREE.CylinderGeometry(0.14, 0.13, 0.75, 8);
      const leftLeg = new THREE.Mesh(legGeo, uniformMat);
      leftLeg.position.set(-0.20, 0.45, 0);
      leftLeg.castShadow = true;
      targetGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, uniformMat);
      rightLeg.position.set(0.20, 0.45, 0);
      rightLeg.castShadow = true;
      targetGroup.add(rightLeg);

      // Heavy Ballistic Knee Armor Plates
      const kneeGeo = new THREE.BoxGeometry(0.22, 0.18, 0.14);
      const lKnee = new THREE.Mesh(kneeGeo, tacticalArmorVestMat);
      lKnee.position.set(-0.20, 0.42, 0.10);
      targetGroup.add(lKnee);

      const rKnee = new THREE.Mesh(kneeGeo, tacticalArmorVestMat);
      rKnee.position.set(0.20, 0.42, 0.10);
      targetGroup.add(rKnee);

      // Tactical Drop-Leg Pistol Holster on right thigh
      const holsterGeo = new THREE.BoxGeometry(0.12, 0.20, 0.14);
      const holster = new THREE.Mesh(holsterGeo, tacticalArmorVestMat);
      holster.position.set(0.32, 0.52, 0.02);
      targetGroup.add(holster);

      // Utility Canteen Pouch on left hip
      const canteenGeo = new THREE.BoxGeometry(0.14, 0.16, 0.12);
      const canteen = new THREE.Mesh(canteenGeo, pouchMat);
      canteen.position.set(-0.32, 0.78, 0.02);
      targetGroup.add(canteen);

      // 7. Thick Military Combat Assault Boots
      const bootGeo = new THREE.BoxGeometry(0.24, 0.22, 0.34);
      const lBoot = new THREE.Mesh(bootGeo, tacticalBootMat);
      lBoot.position.set(-0.20, 0.11, 0.06);
      lBoot.castShadow = true;
      targetGroup.add(lBoot);

      const rBoot = new THREE.Mesh(bootGeo, tacticalBootMat);
      rBoot.position.set(0.20, 0.11, 0.06);
      rBoot.castShadow = true;
      targetGroup.add(rBoot);

      
      return { torso, head, leftLeg, rightLeg, leftArm, rightArm };
    };
  const createHumanoidSoldier = (
      id: string,
      name: string,
      x: number,
      z: number,
      waypoints: THREE.Vector3[]
    ): HumanoidEnemy => {
      const botGroup = new THREE.Group();
      botGroup.position.set(x, getTerrainHeight(x, z), z);

      // Cycle camo uniforms across bots
      const botNum = parseInt(id.replace(/\D/g, '') || '0', 10);
      const uniformMat = camoMaterials[botNum % camoMaterials.length];

      const { torso, head, leftLeg, rightLeg, leftArm, rightArm } = buildSoldierMesh(botGroup, uniformMat);

      // 8. Sleek High-Resolution Overhead Health/Shield Billboard in English
      const healthCanvas = document.createElement('canvas');
      healthCanvas.width = 256;
      healthCanvas.height = 64;
      const hCtx = healthCanvas.getContext('2d')!;
      const healthTexture = new THREE.CanvasTexture(healthCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: healthTexture, depthTest: false });
      const healthSprite = new THREE.Sprite(spriteMat);
      healthSprite.position.set(0, 2.35, 0);
      healthSprite.scale.set(1.6, 0.4, 1);
      botGroup.add(healthSprite);

      const renderBotHealthBar = (hp: number, maxHp: number, sh: number, maxSh: number) => {
        hCtx.clearRect(0, 0, 256, 64);

        // Dark tactical background with border
        hCtx.fillStyle = 'rgba(10, 15, 26, 0.88)';
        hCtx.beginPath();
        hCtx.roundRect(0, 0, 256, 64, 8);
        hCtx.fill();

        hCtx.strokeStyle = 'rgba(71, 85, 105, 0.7)';
        hCtx.lineWidth = 3;
        hCtx.stroke();

        // Bot Label Header in English
        hCtx.fillStyle = '#f8fafc';
        hCtx.font = 'bold 18px monospace';
        hCtx.fillText(`[BOT] ${name.toUpperCase()}`, 12, 22);

        // Shield Gauge (Cyan)
        hCtx.fillStyle = '#06b6d4';
        const shieldWidth = Math.max(0, (sh / maxSh) * 232);
        hCtx.fillRect(12, 28, shieldWidth, 12);

        // Health Gauge (Green or Red)
        hCtx.fillStyle = hp > 30 ? '#10b981' : '#f43f5e';
        const healthWidth = Math.max(0, (hp / maxHp) * 232);
        hCtx.fillRect(12, 44, healthWidth, 12);

        healthTexture.needsUpdate = true;
      };

      renderBotHealthBar(100, 100, 50, 50);
      scene.add(botGroup);

      return {
        id,
        name,
        mesh: botGroup,
        health: 100,
        maxHealth: 100,
        shield: 50,
        maxShield: 50,
        state: 'Patrol',
        waypoints,
        currentWaypoint: 0,
        nextFireTime: 0,
        healthBarCanvas: healthCanvas,
        healthBarTexture: healthTexture,
        healthBarSprite: healthSprite,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        torso,
        head,
        walkCycle: 0,
        isShooting: false
      };
    };

    // Spawn Combat Bots across the POIs on the expanded 1000m map
    const bots: HumanoidEnemy[] = [];
    
    // Add real player model to the drop dummy
    const playerCamoMat = camoMaterials[3]; // SpecOps camo for player
    const dummyParts = buildSoldierMesh(playerDropDummy, playerCamoMat);
    // Center the dummy relative to the camera
    playerDropDummy.position.y = -1.2;
    
const botRosterConfig = [
      // Central Plaza & Depot
      { id: 'b1', name: 'Ghost_Ops', x: 25, z: 20, wps: [new THREE.Vector3(25, 0, 20), new THREE.Vector3(35, 0, 10), new THREE.Vector3(15, 0, 30)] },
      { id: 'b2', name: 'Viper_Nine', x: -22, z: -15, wps: [new THREE.Vector3(-22, 0, -15), new THREE.Vector3(-30, 0, -25), new THREE.Vector3(-15, 0, -10)] },
      { id: 'b3', name: 'Recon_Alpha', x: 0, z: -35, wps: [new THREE.Vector3(0, 0, -35), new THREE.Vector3(15, 0, -25), new THREE.Vector3(-15, 0, -30)] },

      // Airfield & Hangars (West)
      { id: 'b4', name: 'Titan_Heavy', x: -280, z: -40, wps: [new THREE.Vector3(-280, 0, -40), new THREE.Vector3(-320, 0, -20), new THREE.Vector3(-240, 0, -60)] },
      { id: 'b5', name: 'Apex_Pilot', x: -320, z: 30, wps: [new THREE.Vector3(-320, 0, 30), new THREE.Vector3(-280, 0, 70), new THREE.Vector3(-340, 0, 0)] },
      { id: 'b6', name: 'Raven_Air', x: -250, z: -120, wps: [new THREE.Vector3(-250, 0, -120), new THREE.Vector3(-290, 0, -150), new THREE.Vector3(-220, 0, -100)] },

      // Citadel Fortress & Helipad (North)
      { id: 'b7', name: 'Cobra_Guard', x: 0, z: -280, wps: [new THREE.Vector3(0, 0, -280), new THREE.Vector3(40, 0, -300), new THREE.Vector3(-40, 0, -270)] },
      { id: 'b8', name: 'Echo_Sniper', x: 90, z: -310, wps: [new THREE.Vector3(90, 0, -310), new THREE.Vector3(60, 0, -280), new THREE.Vector3(110, 0, -330)] },
      { id: 'b9', name: 'Shadow_Fort', x: -80, z: -290, wps: [new THREE.Vector3(-80, 0, -290), new THREE.Vector3(-50, 0, -320), new THREE.Vector3(-100, 0, -260)] },

      // Cargo Port & Container Yard (East)
      { id: 'b10', name: 'Hunter_Dock', x: 270, z: 70, wps: [new THREE.Vector3(270, 0, 70), new THREE.Vector3(300, 0, 40), new THREE.Vector3(240, 0, 100)] },
      { id: 'b11', name: 'Slayer_Cargo', x: 310, z: -30, wps: [new THREE.Vector3(310, 0, -30), new THREE.Vector3(340, 0, 0), new THREE.Vector3(280, 0, -60)] },
      { id: 'b12', name: 'Strike_Crane', x: 250, z: 140, wps: [new THREE.Vector3(250, 0, 140), new THREE.Vector3(280, 0, 170), new THREE.Vector3(230, 0, 110)] },

      // Radio Relay Peak (North-East Mountains)
      { id: 'b13', name: 'Blaze_Relay', x: 230, z: -210, wps: [new THREE.Vector3(230, 0, -210), new THREE.Vector3(260, 0, -240), new THREE.Vector3(200, 0, -190)] },
      { id: 'b14', name: 'Frost_Scout', x: 280, z: -170, wps: [new THREE.Vector3(280, 0, -170), new THREE.Vector3(310, 0, -200), new THREE.Vector3(250, 0, -150)] },

      // Lumber Camp & Forest Outpost (South-West)
      { id: 'b15', name: 'Timber_Axe', x: -230, z: 240, wps: [new THREE.Vector3(-230, 0, 240), new THREE.Vector3(-270, 0, 270), new THREE.Vector3(-200, 0, 210)] },
      { id: 'b16', name: 'Sawmill_Wolf', x: -280, z: 200, wps: [new THREE.Vector3(-280, 0, 200), new THREE.Vector3(-310, 0, 230), new THREE.Vector3(-250, 0, 170)] },
      { id: 'b17', name: 'Pine_Tracker', x: -180, z: 280, wps: [new THREE.Vector3(-180, 0, 280), new THREE.Vector3(-210, 0, 310), new THREE.Vector3(-150, 0, 250)] },

      // River Canal & Bridges (Midlands)
      { id: 'b18', name: 'Canal_Sniper', x: -100, z: 20, wps: [new THREE.Vector3(-100, 0, 20), new THREE.Vector3(-70, 0, 40), new THREE.Vector3(-130, 0, 10)] },
      { id: 'b19', name: 'Bridge_Sentry', x: 100, z: 20, wps: [new THREE.Vector3(100, 0, 20), new THREE.Vector3(130, 0, 40), new THREE.Vector3(70, 0, 10)] },
      { id: 'b20', name: 'Delta_Ranger', x: 10, z: 130, wps: [new THREE.Vector3(10, 0, 130), new THREE.Vector3(40, 0, 160), new THREE.Vector3(-20, 0, 110)] }
    ];
    botRosterConfig.forEach((cfg) => {
      bots.push(createHumanoidSoldier(cfg.id, cfg.name, cfg.x, cfg.z, cfg.wps));
    });

    // 9. FIRST-PERSON WEAPON 3D VIEWMODEL (Detailed 3D models with optic scope & metallic sheen)
    const weaponHolder = new THREE.Group();
    weaponHolder.position.set(0.26, -0.22, -0.45);
    camera.add(weaponHolder);
    scene.add(camera);

    // Rifle Model
    const rifleMeshGroup = new THREE.Group();
    const rBodyGeo = new THREE.BoxGeometry(0.06, 0.12, 0.65);
    const rBodyMat = new THREE.MeshLambertMaterial({ color: 0x1e293b,  });
    const rBody = new THREE.Mesh(rBodyGeo, rBodyMat);
    rifleMeshGroup.add(rBody);

    const rBarrelGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.35, 8);
    const rBarrelMat = new THREE.MeshLambertMaterial({ color: 0x0f172a,  });
    const rBarrel = new THREE.Mesh(rBarrelGeo, rBarrelMat);
    rBarrel.rotation.x = Math.PI / 2;
    rBarrel.position.set(0, 0.02, -0.42);
    rifleMeshGroup.add(rBarrel);

    // Magazine
    const rMagGeo = new THREE.BoxGeometry(0.045, 0.2, 0.1);
    const rMagMat = new THREE.MeshLambertMaterial({ color: 0x334155,  });
    const rMag = new THREE.Mesh(rMagGeo, rMagMat);
    rMag.position.set(0, -0.12, -0.05);
    rifleMeshGroup.add(rMag);

    // Holographic Sight
    const rSightGeo = new THREE.BoxGeometry(0.04, 0.05, 0.08);
    const rSightMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const rSight = new THREE.Mesh(rSightGeo, rSightMat);
    rSight.position.set(0, 0.08, -0.1);
    rifleMeshGroup.add(rSight);

    // Muzzle Flash Light Source
    const muzzleLight = new THREE.PointLight(0xffedd5, 0, 15);
    muzzleLight.position.set(0, 0.02, -0.62);
    rifleMeshGroup.add(muzzleLight);

    weaponHolder.add(rifleMeshGroup);

    // 10. INPUT STATE & SMOOTH CONTROLS
    const keys: Record<string, boolean> = {};
    let yaw = 0;
    let pitch = 0;
    let targetYaw = 0;
    let targetPitch = 0;
    let verticalVelocity = 0;
    let isGrounded = false;

    // Reset keys on window blur to prevent continuous rotation / movement
    const onWindowBlur = () => {
      for (const k in keys) keys[k] = false;
      const vInput = virtualInputRef.current;
      vInput.lookLeft = false;
      vInput.lookRight = false;
      vInput.lookUp = false;
      vInput.lookDown = false;
      vInput.forward = false;
      vInput.backward = false;
      vInput.left = false;
      vInput.right = false;
    };
    window.addEventListener('blur', onWindowBlur);

    const onKeyDown = (e: KeyboardEvent) => {
      // Prevent browser accidental back navigation
      if (e.code === 'Backspace' && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
      }
      if (e.altKey && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
        e.preventDefault();
      }
      if (e.code === 'Tab') {
        e.preventDefault();
      }

      keys[e.code] = true;

      // Escape key toggles clean Pause menu instead of abrupt exit
      if (e.code === 'Escape') {
        if (stateRef.current.hasStartedPlaying && !stateRef.current.isGameOver && !stateRef.current.isVictory) {
          togglePauseMatchRef.current?.();
        }
      }

      // Number keys 1, 2, 3 for weapon switching
      if (e.code === 'Digit1') switchWeapon('rifle');
      if (e.code === 'Digit2') switchWeapon('shotgun');
      if (e.code === 'Digit3') switchWeapon('sniper');

      // Reload
      if (e.code === 'KeyR') handleReload();

      // Loot Pickup
      if (e.code === 'KeyE') handlePickupLoot();

      // Quick Help / Tutorial Guide toggle
      if (e.code === 'KeyH') {
        setShowGuideModal((prev) => !prev);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    // Smooth Mouse Look Handler
    const onMouseMove = (e: MouseEvent) => {
      if (!stateRef.current.isPointerLocked || stateRef.current.isGameOver) return;
      const sens = stateRef.current.mouseSensitivity * 0.0018;
      targetYaw -= e.movementX * sens;
      targetPitch -= e.movementY * sens;
      targetPitch = Math.max(-1.45, Math.min(1.45, targetPitch));
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!stateRef.current.isPointerLocked || stateRef.current.isGameOver) return;

      if (e.button === 0) {
        // Left click: Fire weapon
        handleShoot();
      } else if (e.button === 2) {
        // Right click: ADS (Aim Down Sights)
        setIsAimingDownSights(true);
        stateRef.current.isAimingDownSights = true;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        setIsAimingDownSights(false);
        stateRef.current.isAimingDownSights = false;
      }
    };

    // Expose camera rotation function for mobile touch look
    rotateCameraRef.current = (deltaYaw: number, deltaPitch: number) => {
      targetYaw += deltaYaw;
      targetPitch += deltaPitch;
      targetPitch = Math.max(-1.45, Math.min(1.45, targetPitch));
    };

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      setIsPointerLocked(locked);
      stateRef.current.isPointerLocked = locked;
    };

    // Switch active weapon
    const switchWeapon = (type: WeaponType) => {
      if (stateRef.current.activeWeapon.type === type) return;
      const newW = WEAPONS_CATALOG[type];
      stateRef.current.activeWeapon = newW;
      setActiveWeaponType(type);

      const ammoState = stateRef.current.ammoByWeapon[type];
      setCurrentAmmo(ammoState.current);
      setReserveAmmo(ammoState.reserve);

      // Change sight color based on weapon
      if (type === 'rifle') rSightMat.color.setHex(0x0284c7);
      if (type === 'shotgun') rSightMat.color.setHex(0xf59e0b);
      if (type === 'sniper') rSightMat.color.setHex(0xec4899);

      sounds.playDryFire();
    };

    // Helper: Spawn impact spark particles
    const spawnImpactSparks = (point: THREE.Vector3, normal: THREE.Vector3, colorHex = 0xfef08a) => {
      const particleCount = 14;
      const positions = new Float32Array(particleCount * 3);
      const velocities: THREE.Vector3[] = [];

      for (let p = 0; p < particleCount; p++) {
        positions[p * 3] = point.x;
        positions[p * 3 + 1] = point.y;
        positions[p * 3 + 2] = point.z;

        const vel = normal
          .clone()
          .add(new THREE.Vector3((Math.random() - 0.5) * 1.8, Math.random() * 1.5, (Math.random() - 0.5) * 1.8))
          .multiplyScalar(Math.random() * 4 + 2);
        velocities.push(vel);
      }

      const sparkGeo = new THREE.BufferGeometry();
      sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const sparkMat = new THREE.PointsMaterial({
        color: colorHex,
        size: 0.14,
        transparent: true,
        opacity: 0.9
      });
      const sparkMesh = new THREE.Points(sparkGeo, sparkMat);
      scene.add(sparkMesh);
      impactSparks.push({
        mesh: sparkMesh,
        velocities,
        startTime: performance.now(),
        duration: 350
      });
    };

    let lastFireTime = 0;

    // Shoot weapon
    const handleShoot = () => {
      if (!stateRef.current.hasStartedPlaying || stateRef.current.isPaused || stateRef.current.isGameOver || stateRef.current.isVictory) {
        return;
      }

      const w = stateRef.current.activeWeapon;
      const ammoState = stateRef.current.ammoByWeapon[w.type];

      if (stateRef.current.isReloading) return;

      const now = performance.now();
      const minInterval = 1000 / w.fireRate;
      if (now - lastFireTime < minInterval) return;
      lastFireTime = now;

      if (ammoState.current <= 0) {
        sounds.playDryFire();
        if (ammoState.reserve > 0) handleReload();
        return;
      }

      ammoState.current--;
      setCurrentAmmo(ammoState.current);
      stateRef.current.shotsFired++;

      if (w.type === 'sniper') sounds.playSniper();
      else if (w.type === 'shotgun') sounds.playShotgun();
      else sounds.playGunshot();

      // Muzzle flash
      muzzleLight.intensity = 4.5;
      setTimeout(() => {
        muzzleLight.intensity = 0;
      }, 45);

      // Weapon viewmodel recoil kick
      weaponHolder.position.z = -0.36;
      weaponHolder.rotation.x = 0.14;

      const raycaster = new THREE.Raycaster();
      const spread = stateRef.current.isAimingDownSights ? 0.003 : 0.035;
      const pelletCount = w.type === 'shotgun' ? 8 : 1;

      let hasHitAny = false;

      for (let p = 0; p < pelletCount; p++) {
        const spreadX = (Math.random() - 0.5) * spread;
        const spreadY = (Math.random() - 0.5) * spread;
        raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);

        const livingBots = bots.filter((b) => b.state !== 'Dead');
        const botMeshes = livingBots.map((b) => b.mesh);
        const intersects = raycaster.intersectObjects([...botMeshes, ...collidableMeshes, terrain], true);

        const tracerStart = new THREE.Vector3();
        muzzleLight.getWorldPosition(tracerStart);
        let tracerEnd = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(w.range));

        if (intersects.length > 0) {
          const hit = intersects[0];
          tracerEnd = hit.point;

          let hitBot: HumanoidEnemy | undefined;
          for (const bot of livingBots) {
            bot.mesh.traverse((child) => {
              if (child === hit.object) hitBot = bot;
            });
            if (hitBot) break;
          }

          if (hitBot) {
            hasHitAny = true;
            stateRef.current.shotsHit++;

            const dmg = w.type === 'shotgun' ? w.damage / 8 : w.damage;
            if (hitBot.shield > 0) {
              hitBot.shield -= dmg;
              sounds.playShieldHit();
              spawnImpactSparks(hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0), 0x06b6d4);
              if (hitBot.shield < 0) {
                hitBot.health += hitBot.shield;
                hitBot.shield = 0;
              }
            } else {
              hitBot.health -= dmg;
              sounds.playEnemyHit();
              spawnImpactSparks(hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0), 0xef4444);
            }

            renderBotHealth(hitBot);

            (hitBot.torso.material as THREE.MeshLambertMaterial).color.setHex(0xff2222);
            setTimeout(() => {
              (hitBot.torso.material as THREE.MeshLambertMaterial).color.setHex(0x334155);
            }, 100);

            hitBot.state = 'Chase';

            if (hitBot.health <= 0) {
              eliminateBot(hitBot, w.name);
            }
          } else {
            // Check if bullet hit an explosive barrel
            let hitBarrel: typeof interactiveBarrels[0] | undefined;
            for (const barrel of interactiveBarrels) {
              if (barrel.exploded) continue;
              if (barrel.mesh === hit.object || barrel.mesh.children.some((c) => c === hit.object)) {
                hitBarrel = barrel;
                break;
              }
            }

            if (hitBarrel) {
              hasHitAny = true;
              const dmg = w.type === 'shotgun' ? w.damage / 8 : w.damage;
              hitBarrel.health -= dmg;
              spawnImpactSparks(hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0), 0xf97316);

              if (hitBarrel.health <= 0 && !hitBarrel.exploded) {
                hitBarrel.exploded = true;
                hitBarrel.mesh.visible = false;
                sounds.playEnemyHit();

                const bx = hitBarrel.position.x;
                const by = hitBarrel.position.y;
                const bz = hitBarrel.position.z;

                // Multi-tier fiery explosion burst
                for (let ex = 0; ex < 4; ex++) {
                  spawnImpactSparks(
                    new THREE.Vector3(bx, by + 0.4 + ex * 0.3, bz),
                    new THREE.Vector3(0, 1, 0),
                    0xf97316
                  );
                }

                // Blast area damage to bots
                livingBots.forEach((bot) => {
                  const bDist = bot.mesh.position.distanceTo(new THREE.Vector3(bx, by, bz));
                  if (bDist <= 9.0) {
                    const blastDmg = Math.round(120 * (1 - bDist / 9.0));
                    bot.health -= blastDmg;
                    renderBotHealth(bot);
                    if (bot.health <= 0) {
                      eliminateBot(bot, 'Explosive Barrel');
                    }
                  }
                });

                // Blast area damage to player if within radius
                const pDist = camera.position.distanceTo(new THREE.Vector3(bx, by, bz));
                if (pDist <= 9.0) {
                  const pDmg = Math.round(80 * (1 - pDist / 9.0));
                  if (stateRef.current.playerShield > 0) {
                    stateRef.current.playerShield -= pDmg;
                    sounds.playShieldHit();
                    if (stateRef.current.playerShield < 0) {
                      stateRef.current.playerHealth += stateRef.current.playerShield;
                      stateRef.current.playerShield = 0;
                    }
                  } else {
                    stateRef.current.playerHealth -= pDmg;
                    sounds.playPlayerHurt();
                  }
                  setPlayerHealth(Math.max(0, Math.ceil(stateRef.current.playerHealth)));
                  setPlayerShield(Math.max(0, Math.ceil(stateRef.current.playerShield)));
                  setIsDamagedVignette(true);
                  setTimeout(() => setIsDamagedVignette(false), 200);
                  if (stateRef.current.playerHealth <= 0 && !stateRef.current.isGameOver) {
                    triggerGameOver('Explosive Barrel');
                  }
                }
              }
            } else {
              // Hit scenery or terrain
              spawnImpactSparks(hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0), 0xfef08a);
            }
          }
        }

        // Bullet tracer line
        const tracerGeo = new THREE.BufferGeometry().setFromPoints([tracerStart, tracerEnd]);
        const tracerMat = new THREE.LineBasicMaterial({ color: 0xfef08a, linewidth: 2 });
        const tracerLine = new THREE.Line(tracerGeo, tracerMat);
        scene.add(tracerLine);
        tracers.push({ line: tracerLine, startTime: performance.now(), duration: 80 });
      }

      if (hasHitAny) {
        setHitmarkerActive(true);
        sounds.playHitmarker();
        setTimeout(() => setHitmarkerActive(false), 90);
      }

      const hitPercent = Math.round((stateRef.current.shotsHit / stateRef.current.shotsFired) * 100);
      setAccuracy(hitPercent);
    };
    shootWeaponRef.current = handleShoot;

    // Reload active weapon
    const handleReload = () => {
      const w = stateRef.current.activeWeapon;
      const ammoState = stateRef.current.ammoByWeapon[w.type];

      if (stateRef.current.isReloading || ammoState.current >= w.magSize || ammoState.reserve <= 0) return;

      setIsReloading(true);
      stateRef.current.isReloading = true;
      sounds.playReload();

      setTimeout(() => {
        const needed = w.magSize - ammoState.current;
        const toLoad = Math.min(needed, ammoState.reserve);
        ammoState.current += toLoad;
        ammoState.reserve -= toLoad;

        setCurrentAmmo(ammoState.current);
        setReserveAmmo(ammoState.reserve);
        setIsReloading(false);
        stateRef.current.isReloading = false;
      }, w.reloadTime * 1000);
    };
    reloadWeaponRef.current = handleReload;

    // Update bot billboard health
    const renderBotHealth = (b: HumanoidEnemy) => {
      const hCtx = b.healthBarCanvas.getContext('2d')!;
      hCtx.clearRect(0, 0, 128, 32);
      hCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      hCtx.fillRect(0, 0, 128, 32);

      hCtx.fillStyle = '#06b6d4';
      hCtx.fillRect(4, 4, Math.max(0, (b.shield / b.maxShield) * 120), 10);

      hCtx.fillStyle = b.health > 30 ? '#22c55e' : '#ef4444';
      hCtx.fillRect(4, 17, Math.max(0, (b.health / b.maxHealth) * 120), 11);

      b.healthBarTexture.needsUpdate = true;
    };

    // Eliminate bot
    const eliminateBot = (bot: HumanoidEnemy, weaponName: string) => {
      bot.state = 'Dead';
      scene.remove(bot.healthBarSprite);

      bot.mesh.rotation.x = -Math.PI / 2;
      bot.mesh.position.y = getTerrainHeight(bot.mesh.position.x, bot.mesh.position.z) + 0.15;

      createLootPickup(
        `loot_death_${bot.id}`,
        Math.random() > 0.5 ? 'shield' : 'medkit',
        'Combat Spoils (+50)',
        0x06b6d4,
        bot.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0))
      );

      addKillFeedItem('You', bot.name, weaponName);

      stateRef.current.playerKills++;
      setPlayerKills(stateRef.current.playerKills);

      stateRef.current.playersAlive--;
      setPlayersAlive(stateRef.current.playersAlive);

      if (stateRef.current.playersAlive <= 1 && !stateRef.current.isVictory) {
        triggerVictoryRoyale();
      }
    };

    const addKillFeedItem = (killer: string, victim: string, weapon: string) => {
      const newItem: KillFeedItem = {
        id: Math.random().toString(36).substring(7),
        killer,
        victim,
        weapon
      };
      setKillFeed((prev) => [newItem, ...prev.slice(0, 4)]);
    };

    const triggerVictoryRoyale = () => {
      stateRef.current.isVictory = true;
      setIsVictory(true);
      document.exitPointerLock?.();
      sounds.playVictory();

      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 90,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 90,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 400);
    };

    const handlePickupLoot = () => {
      const playerPos = camera.position;
      for (let i = groundLootRoster.length - 1; i >= 0; i--) {
        const item = groundLootRoster[i];
        if (item.position.distanceTo(playerPos) <= 3.5) {
          sounds.playLootPickup();

          if (item.type === 'medkit') {
            stateRef.current.playerHealth = Math.min(100, stateRef.current.playerHealth + 50);
            setPlayerHealth(stateRef.current.playerHealth);
            setActiveObjectiveTip('Health restored (+50 HP)! Keep moving inside the safe circle.');
          } else if (item.type === 'shield') {
            stateRef.current.playerShield = Math.min(100, stateRef.current.playerShield + 50);
            setPlayerShield(stateRef.current.playerShield);
            setActiveObjectiveTip('Shield Armor equipped (+50)! Armor absorbs enemy bullets.');
          } else if (item.type === 'ammo') {
            stateRef.current.ammoByWeapon.rifle.reserve += 60;
            stateRef.current.ammoByWeapon.shotgun.reserve += 20;
            stateRef.current.ammoByWeapon.sniper.reserve += 15;
            setReserveAmmo(stateRef.current.ammoByWeapon[stateRef.current.activeWeapon.type].reserve);
          } else {
            switchWeapon(item.type as WeaponType);
            setActiveObjectiveTip(`Equipped ${item.name}! Right-Click to Aim, Left-Click to Shoot.`);
          }

          scene.remove(item.mesh);
          groundLootRoster.splice(i, 1);
          setNearbyLootPrompt(null);
          break;
        }
      }
    };
    pickupLootRef.current = handlePickupLoot;

    let botSimInterval = 0;
    let matchStartTime = performance.now();
    let lastDamageTime = performance.now();

    // --- MAIN ANIMATION & GAME LOOP ---
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const now = performance.now();

      // Tactical Shield Auto-Recharge in Cover (after 4.5s without taking damage, charges up to 50)
      if (
        stateRef.current.hasStartedPlaying &&
        !stateRef.current.isPaused &&
        !stateRef.current.isGameOver &&
        stateRef.current.playerHealth > 0 &&
        now - lastDamageTime > 4500 &&
        stateRef.current.playerShield < 50
      ) {
        stateRef.current.playerShield = Math.min(50, stateRef.current.playerShield + delta * 6);
        setPlayerShield(Math.ceil(stateRef.current.playerShield));
      }

      // Clean up bullet tracers
      for (let i = tracers.length - 1; i >= 0; i--) {
        if (now - tracers[i].startTime > tracers[i].duration) {
          const tracer = tracers[i];
          scene.remove(tracer.line);
          tracer.line.geometry.dispose();
          if (Array.isArray(tracer.line.material)) {
            tracer.line.material.forEach(m => m.dispose());
          } else {
            tracer.line.material.dispose();
          }
          tracers.splice(i, 1);
        }
      }

      // Update impact spark particles
      for (let i = impactSparks.length - 1; i >= 0; i--) {
        const spark = impactSparks[i];
        const elapsed = now - spark.startTime;
        if (elapsed > spark.duration) {
          scene.remove(spark.mesh);
          spark.mesh.geometry.dispose();
          if (Array.isArray(spark.mesh.material)) {
            spark.mesh.material.forEach(m => m.dispose());
          } else {
            spark.mesh.material.dispose();
          }
          impactSparks.splice(i, 1);
        } else {
          const pos = spark.mesh.geometry.attributes.position;
          for (let p = 0; p < spark.velocities.length; p++) {
            const v = spark.velocities[p];
            pos.setX(p, pos.getX(p) + v.x * delta);
            pos.setY(p, pos.getY(p) + v.y * delta);
            pos.setZ(p, pos.getZ(p) + v.z * delta);
            v.y -= 9.8 * delta; // gravity
          }
          pos.needsUpdate = true;
        }
      }

      // Slowly rotate clouds
      cloudsGroup.rotation.y += delta * 0.01;

      // Rotate ground loot items
      groundLootRoster.forEach((item) => {
        item.mesh.rotation.y += delta * 1.6;
      });

      // Render static if match has not started yet, or is paused, or game over / victory
      if (!stateRef.current.hasStartedPlaying || stateRef.current.isPaused || stateRef.current.isGameOver || stateRef.current.isVictory) {
        renderer.render(scene, camera);
        return;
      }

      // Continuous firing when fire button is held down (e.g. on mobile)
      if (stateRef.current.isFiringContinuous) {
        handleShoot();
      }

      // Camera Smooth Look Interpolation
      // Handle Arrow Keys / Virtual look controls as well
      const vInput = virtualInputRef.current;
      const keySens = 2.2 * delta;
      if (keys['ArrowLeft'] || vInput.lookLeft) targetYaw += keySens;
      if (keys['ArrowRight'] || vInput.lookRight) targetYaw -= keySens;
      if (keys['ArrowUp'] || vInput.lookUp) targetPitch += keySens;
      if (keys['ArrowDown'] || vInput.lookDown) targetPitch -= keySens;
      targetPitch = Math.max(-1.45, Math.min(1.45, targetPitch));

      // Lerp yaw and pitch for smooth mouse look
      yaw = THREE.MathUtils.lerp(yaw, targetYaw, delta * 25);
      pitch = THREE.MathUtils.lerp(pitch, targetPitch, delta * 25);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');

      // Compass calculation
      const deg = Math.round(((-yaw * 180) / Math.PI + 360) % 360);
      setCompassHeading(deg);
      stateRef.current.compassHeading = deg;

      // 1. PLAYER MOVEMENT & SMOOTH VELOCITY
      const isSprinting = keys['ShiftLeft'] || keys['ShiftRight'] || vInput.sprint;
      
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const inputDir = new THREE.Vector3();

      if (keys['KeyW'] || vInput.forward) inputDir.add(forward);
      if (keys['KeyS'] || vInput.backward) inputDir.sub(forward);
      if (keys['KeyD'] || vInput.right) inputDir.add(right);
      if (keys['KeyA'] || vInput.left) inputDir.sub(right);

      // Analog Touch Joystick Integration (Mobile 360-degree movement)
      const joy = stateRef.current.joystickVector;
      if (joy.x !== 0 || joy.y !== 0) {
        inputDir.add(forward.clone().multiplyScalar(-joy.y));
        inputDir.add(right.clone().multiplyScalar(joy.x));
      }

      const currentGroundY = getTerrainHeight(camera.position.x, camera.position.z);
      const eyeHeight = 1.85;
      const minCameraY = currentGroundY + eyeHeight;

      // PUBG-Style Drop Phases
      if (stateRef.current.dropPhase === 'in_plane') {
        // Move airplane
        planeZ += delta * 150;
        airplaneGroup.position.set(0, 450, planeZ);
        
        // Attach player to plane
        camera.position.set(0, 445, planeZ - 10);
        verticalVelocity = 0;
        isGrounded = false;
        parachuteGroup.visible = false;
        
        // Auto-eject if plane reaches map edge
        if (planeZ > 550) {
          stateRef.current.dropPhase = 'freefall';
          setDropPhase('freefall');
        }
      } else if (stateRef.current.dropPhase === 'freefall' || stateRef.current.dropPhase === 'parachute') {
        // Continue plane movement independently
        if (airplaneGroup.visible) {
          planeZ += delta * 150;
          airplaneGroup.position.set(0, 450, planeZ);
          if (planeZ > 800) airplaneGroup.visible = false;
        }

        // Gliding horizontal movement
        const glideSpeed = stateRef.current.dropPhase === 'freefall' ? 45 : 20;
        if (inputDir.lengthSq() > 0.01) {
          inputDir.normalize().multiplyScalar(glideSpeed);
        }
        stateRef.current.playerVelocity.lerp(inputDir, delta * (stateRef.current.dropPhase === 'freefall' ? 2 : 1));
        camera.position.add(stateRef.current.playerVelocity.clone().multiplyScalar(delta));
        
        // Gravity
        verticalVelocity -= stateRef.current.settings.gravity * delta;
        
        if (stateRef.current.dropPhase === 'freefall') {
          // Freefall terminal velocity
          if (verticalVelocity < -55) verticalVelocity = -55;
          
          // Manual deploy via jump button or auto-deploy at 100m
          if (camera.position.y < currentGroundY + 100 || keys['Space'] || vInput.jump) {
            stateRef.current.dropPhase = 'parachute';
            setDropPhase('parachute');
            parachuteGroup.scale.set(0.1, 0.1, 0.1);
            sounds.playJump();
          }
        } else {
          // Parachute terminal velocity
          if (verticalVelocity < -12) {
            verticalVelocity = THREE.MathUtils.lerp(verticalVelocity, -12, delta * 4);
          }
          
          // Render Parachute
          if (!parachuteGroup.visible) {
             parachuteGroup.scale.set(0.1, 0.1, 0.1);
             sounds.playJump();
          }
          parachuteGroup.visible = true;
          
          // Animate opening scale
          if (parachuteGroup.scale.x < 1) {
             parachuteGroup.scale.addScalar(delta * 2);
             if (parachuteGroup.scale.x > 1) parachuteGroup.scale.set(1, 1, 1);
          }
          
          parachuteGroup.position.copy(camera.position);
          parachuteGroup.rotation.y = yaw;
          parachuteGroup.rotation.z = Math.sin(now * 0.002) * 0.1;
          parachuteGroup.rotation.x = Math.cos(now * 0.0015) * 0.1;
        }
        
        camera.position.y += verticalVelocity * delta;

        // Land
        if (camera.position.y <= minCameraY) {
          camera.position.y = minCameraY;
          verticalVelocity = 0;
          isGrounded = true;
          stateRef.current.dropPhase = 'landed';
          setDropPhase('landed');
          parachuteGroup.visible = false;
          sounds.playJump();
        }
      } else {
        // NORMAL LANDED MOVEMENT
        const targetSpeed = isSprinting ? stateRef.current.settings.sprintSpeed : stateRef.current.settings.walkSpeed;
        if (inputDir.lengthSq() > 0.01) {
          inputDir.normalize().multiplyScalar(targetSpeed);
        }
        stateRef.current.playerVelocity.lerp(inputDir, delta * 12);
        camera.position.add(stateRef.current.playerVelocity.clone().multiplyScalar(delta));

        if (isGrounded) {
          if (keys['Space'] || vInput.jump) {
            verticalVelocity = Math.sqrt(2 * stateRef.current.settings.jumpHeight * stateRef.current.settings.gravity);
            isGrounded = false;
            vInput.jump = false;
            sounds.playJump();
          } else {
            camera.position.y = minCameraY;
            verticalVelocity = 0;
          }
        } else {
          verticalVelocity -= stateRef.current.settings.gravity * delta;
          camera.position.y += verticalVelocity * delta;
          if (camera.position.y <= minCameraY) {
            camera.position.y = minCameraY;
            verticalVelocity = 0;
            isGrounded = true;
            sounds.playJump();
          }
        }

        // Airplane flyover cleanup if still visible
        if (airplaneGroup.visible) {
          planeZ += delta * 150;
          airplaneGroup.position.set(0, 450, planeZ);
          if (planeZ > 800) airplaneGroup.visible = false;
        }
        parachuteGroup.visible = false;
      }
      
      // Robust 3D AABB Collision & Push-out
      if (stateRef.current.dropPhase !== 'in_plane') {
        const playerMinY = camera.position.y - 1.85 + 0.1; // eyeHeight = 1.85
        const playerMaxY = camera.position.y + 0.2;
        for (const mesh of collidableMeshes) {
          const box = new THREE.Box3().setFromObject(mesh);
          const r = 0.4; // player radius
          
          if (
            camera.position.x + r > box.min.x &&
            camera.position.x - r < box.max.x &&
            camera.position.z + r > box.min.z &&
            camera.position.z - r < box.max.z &&
            playerMinY < box.max.y &&
            playerMaxY > box.min.y
          ) {
            // Find closest face to push out
            const distLeft = (camera.position.x + r) - box.min.x;
            const distRight = box.max.x - (camera.position.x - r);
            const distFront = (camera.position.z + r) - box.min.z;
            const distBack = box.max.z - (camera.position.z - r);
            const distTop = box.max.y - playerMinY;
            
            const minDist = Math.min(distLeft, distRight, distFront, distBack, distTop);
            
            if (minDist === distTop) {
               camera.position.y = box.max.y + 1.85 - 0.1;
               verticalVelocity = 0;
               isGrounded = true;
               if (stateRef.current.dropPhase !== 'landed') {
                 stateRef.current.dropPhase = 'landed';
                 setDropPhase('landed');
                 parachuteGroup.visible = false;
               }
            } else if (minDist === distLeft) {
               camera.position.x = box.min.x - r;
            } else if (minDist === distRight) {
               camera.position.x = box.max.x + r;
            } else if (minDist === distFront) {
               camera.position.z = box.min.z - r;
            } else if (minDist === distBack) {
               camera.position.z = box.max.z + r;
            }
          }
        }
      }

      stateRef.current.playerPosition.copy(camera.position);

      // Weapon Bobbing (Only when landed)
      if (stateRef.current.dropPhase === 'landed') {
        if (stateRef.current.playerVelocity.lengthSq() > 0.5 && isGrounded) {
          const bobSpeed = isSprinting ? 14 : 9;
          const bobAmount = isSprinting ? 0.03 : 0.015;
          weaponHolder.position.y = -0.22 + Math.sin(now * 0.001 * bobSpeed) * bobAmount;
          weaponHolder.position.x = 0.26 + Math.cos(now * 0.001 * (bobSpeed / 2)) * (bobAmount * 0.6);
        } else {
          weaponHolder.position.set(0.26, -0.22, -0.45);
        }
      }

      // Restrict player inside expanded island perimeter (480m boundary)
      if (stateRef.current.dropPhase !== 'in_plane') {
        const playerDist = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
        if (playerDist > 480) {
          camera.position.x = (camera.position.x / playerDist) * 480;
          camera.position.z = (camera.position.z / playerDist) * 480;
        }
      }

      // Check for Jump Pad Trigger (Tactical Launch Pad boosts player high into the sky)
      jumpPads.forEach((pad) => {
        const dx = camera.position.x - pad.position.x;
        const dz = camera.position.z - pad.position.z;
        const nowSec = performance.now() / 1000;
        if (
          dx * dx + dz * dz < 2.5 * 2.5 &&
          Math.abs(camera.position.y - (pad.position.y + eyeHeight)) < 2.5 &&
          nowSec - pad.lastUsedTime > 1.2
        ) {
          pad.lastUsedTime = nowSec;
          verticalVelocity = pad.force;
          isGrounded = false;
          sounds.playJump();
          spawnImpactSparks(new THREE.Vector3(pad.position.x, pad.position.y + 0.3, pad.position.z), new THREE.Vector3(0, 1, 0), 0x06b6d4);
          setActiveObjectiveTip('🚀 Launch Pad activated! Soar over enemy positions.');
        }
      });

      // ADS Camera FOV Zoom
      const targetFov = stateRef.current.isAimingDownSights
        ? stateRef.current.activeWeapon.type === 'sniper'
          ? 20
          : 46
        : 75;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, delta * 14);
      camera.updateProjectionMatrix();

      // Return weapon recoil
      weaponHolder.position.z = THREE.MathUtils.lerp(weaponHolder.position.z, -0.45, delta * 14);
      weaponHolder.rotation.x = THREE.MathUtils.lerp(weaponHolder.rotation.x, 0, delta * 14);

      // Check nearby loot proximity
      let foundNearbyPrompt: string | null = null;
      for (const item of groundLootRoster) {
        if (item.position.distanceTo(camera.position) <= 3.2) {
          foundNearbyPrompt = `[E] Pick up ${item.name}`;
          break;
        }
      }
      setNearbyLootPrompt(foundNearbyPrompt);

      // 2. BATTLE ROYALE STORM LOGIC
      stormPhaseTime -= delta;
      if (stormPhaseTime <= 0) {
        if (!isShrinkActive) {
          isShrinkActive = true;
          stormPhaseTime = 30;
          setIsStormShrinking(true);
          setActiveObjectiveTip('⚠ The Safe Zone is shrinking! Follow the radar into the blue circle.');
        } else {
          isShrinkActive = false;
          currentPhase++;
          setStormPhase(currentPhase);
          stormPhaseTime = 45;
          setIsStormShrinking(false);
        }
      }
      setStormTimer(Math.max(0, Math.ceil(stormPhaseTime)));

      if (isShrinkActive) {
        const targetRadius = Math.max(30, 480 - currentPhase * 80);
        stateRef.current.stormRadius = THREE.MathUtils.lerp(stateRef.current.stormRadius, targetRadius, delta * 0.15);
        stormCylinder.scale.set(stateRef.current.stormRadius / 480, 1, stateRef.current.stormRadius / 480);
        stormRing.scale.set(stateRef.current.stormRadius / 480, 1, stateRef.current.stormRadius / 480);
      }

      // Distance from center & safe zone check
      const playerDistFromCenter = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
      setDistanceToSafeCenter(Math.round(playerDistFromCenter));
      const isSafe = (playerDistFromCenter <= stateRef.current.stormRadius) || stateRef.current.dropPhase !== 'landed';
      setIsInsideSafeZone(isSafe);
      stateRef.current.isInsideSafeZone = isSafe;

      if (!isSafe) {
        stormDamageTimer += delta;
        if (stormDamageTimer >= 1.0) {
          stormDamageTimer = 0;
          sounds.playStormTick();
          stateRef.current.playerHealth = Math.max(0, stateRef.current.playerHealth - 4);
          setPlayerHealth(stateRef.current.playerHealth);
          setIsDamagedVignette(true);
          setTimeout(() => setIsDamagedVignette(false), 200);

          if (stateRef.current.playerHealth <= 0 && !stateRef.current.isGameOver) {
            triggerGameOver('The Storm');
          }
        }
      }

      // 3. HUMANOID ENEMY AI BEHAVIOR
      bots.forEach((bot) => {
        if (bot.state === 'Dead') return;

        bot.healthBarSprite.lookAt(camera.position);
        const botPos = bot.mesh.position;
        const distToPlayer = botPos.distanceTo(camera.position);

        const canSeePlayer = stateRef.current.dropPhase === 'landed' && distToPlayer <= stateRef.current.settings.detectionRadius;
        if (canSeePlayer) {
          bot.state = distToPlayer <= stateRef.current.settings.attackRange ? 'Attack' : 'Chase';
        } else if (distToPlayer > stateRef.current.settings.detectionRadius * 1.5 || stateRef.current.dropPhase !== 'landed') {
          bot.state = 'Patrol';
        }

        // Leg animation
        bot.walkCycle += delta * (bot.state === 'Chase' ? 14 : 7);
        bot.leftLeg.rotation.x = Math.sin(bot.walkCycle) * 0.6;
        bot.rightLeg.rotation.x = -Math.sin(bot.walkCycle) * 0.6;

        if (bot.state === 'Patrol') {
          const targetWp = bot.waypoints[bot.currentWaypoint];
          const distToWp = botPos.distanceTo(targetWp);
          if (distToWp < 0.8) {
            bot.currentWaypoint = (bot.currentWaypoint + 1) % bot.waypoints.length;
          } else {
            const dir = targetWp.clone().sub(botPos);
            dir.y = 0;
            dir.normalize();
            bot.mesh.position.add(dir.multiplyScalar(stateRef.current.settings.enemyPatrolSpeed * delta));
            bot.mesh.position.y = getTerrainHeight(bot.mesh.position.x, bot.mesh.position.z);
            bot.mesh.lookAt(targetWp.x, bot.mesh.position.y, targetWp.z);
          }
        } else if (bot.state === 'Chase') {
          const dir = camera.position.clone().sub(botPos);
          dir.y = 0;
          dir.normalize();
          bot.mesh.position.add(dir.multiplyScalar(stateRef.current.settings.enemySpeed * delta));
          bot.mesh.position.y = getTerrainHeight(bot.mesh.position.x, bot.mesh.position.z);
          bot.mesh.lookAt(camera.position.x, bot.mesh.position.y, camera.position.z);
        } else if (bot.state === 'Attack') {
          bot.mesh.position.y = getTerrainHeight(bot.mesh.position.x, bot.mesh.position.z);
          bot.mesh.lookAt(camera.position.x, bot.mesh.position.y, camera.position.z);

          if (now >= bot.nextFireTime) {
            bot.nextFireTime = now + 950;
            sounds.playEnemyRifleShot();

            const botMuzzle = botPos.clone().add(new THREE.Vector3(0.2, 1.2, 0.4));
            const hitOffset = new THREE.Vector3((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7, 0);
            const targetPos = camera.position.clone().add(hitOffset);

            const tracerGeo = new THREE.BufferGeometry().setFromPoints([botMuzzle, targetPos]);
            const tracerMat = new THREE.LineBasicMaterial({ color: 0xf87171, linewidth: 2 });
            const tracerLine = new THREE.Line(tracerGeo, tracerMat);
            scene.add(tracerLine);
            tracers.push({ line: tracerLine, startTime: now, duration: 60 });

            // Check if player has line of sight cover (e.g. behind buildings or rocks)
            const rayToPlayer = new THREE.Raycaster(
              botMuzzle,
              camera.position.clone().sub(botMuzzle).normalize(),
              0.5,
              botMuzzle.distanceTo(camera.position) - 0.5
            );
            const coverHits = rayToPlayer.intersectObjects(collidableMeshes, false);
            const hasCover = coverHits.length > 0;

            // Combat fairness: moving player is harder to hit, standing still is vulnerable
            const isMoving =
              keys['KeyW'] ||
              keys['KeyS'] ||
              keys['KeyA'] ||
              keys['KeyD'] ||
              Math.abs(stateRef.current.joystickVector.x) > 0.2 ||
              Math.abs(stateRef.current.joystickVector.y) > 0.2;
            const hitChance = isMoving ? 0.35 : 0.48;
            const isHit = !hasCover && Math.random() < hitChance;

            // Initial 4s match spawn protection prevents immediate death upon drop
            const isSpawnProtected = now - matchStartTime < 4000;

            if (isHit && !isSpawnProtected) {
              lastDamageTime = now;
              const dmg = stateRef.current.settings.enemyDamage;
              if (stateRef.current.playerShield > 0) {
                stateRef.current.playerShield -= dmg;
                sounds.playShieldHit();
                if (stateRef.current.playerShield < 0) {
                  stateRef.current.playerHealth += stateRef.current.playerShield;
                  stateRef.current.playerShield = 0;
                }
              } else {
                stateRef.current.playerHealth -= dmg;
                sounds.playPlayerHurt();
              }

              setPlayerHealth(Math.max(0, Math.ceil(stateRef.current.playerHealth)));
              setPlayerShield(Math.max(0, Math.ceil(stateRef.current.playerShield)));
              setIsDamagedVignette(true);
              setTimeout(() => setIsDamagedVignette(false), 160);

              if (stateRef.current.playerHealth <= 0 && !stateRef.current.isGameOver) {
                triggerGameOver(bot.name);
              }
            }
          }
        }
      });

      // 4. DISTANT BOT-VS-BOT COMBAT SIMULATION
      botSimInterval += delta;
      if (botSimInterval >= 8.5 && stateRef.current.playersAlive > 2) {
        botSimInterval = 0;
        const livingBots = bots.filter((b) => b.state !== 'Dead');
        if (livingBots.length > 1) {
          const victimIndex = Math.floor(Math.random() * livingBots.length);
          const victim = livingBots[victimIndex];
          victim.state = 'Dead';
          scene.remove(victim.healthBarSprite);
          victim.mesh.rotation.x = -Math.PI / 2;
          victim.mesh.position.y = getTerrainHeight(victim.mesh.position.x, victim.mesh.position.z) + 0.15;

          stateRef.current.playersAlive--;
          setPlayersAlive(stateRef.current.playersAlive);

          const randomKiller = ['Bot_Apex', 'Bot_Viper', 'Bot_Titan', 'Bot_Ghost', 'The Storm'][Math.floor(Math.random() * 5)];
          addKillFeedItem(randomKiller, victim.name, 'M4A1 Rifle');
        }
      }

      // 5. UPDATE TACTICAL RADAR MINI-MAP CANVAS
      const radar = radarCanvasRef.current;
      if (radar) {
        const rCtx = radar.getContext('2d');
        if (rCtx) {
          const w = radar.width;
          const h = radar.height;
          const cx = w / 2;
          const cy = h / 2;
          const radarScale = 0.35; // Calibrated for expanded 480m island

          rCtx.clearRect(0, 0, w, h);

          // Radar base circle
          rCtx.save();
          rCtx.beginPath();
          rCtx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
          rCtx.clip();

          rCtx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          rCtx.fillRect(0, 0, w, h);

          // Radar grid rings & sweep line
          rCtx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
          rCtx.lineWidth = 1;
          rCtx.beginPath();
          rCtx.arc(cx, cy, 25, 0, Math.PI * 2);
          rCtx.arc(cx, cy, 50, 0, Math.PI * 2);
          rCtx.stroke();

          // Safe Zone Circle (Cyan)
          const safeCenterX = cx - camera.position.x * radarScale;
          const safeCenterY = cy - camera.position.z * radarScale;
          rCtx.strokeStyle = '#06b6d4';
          rCtx.lineWidth = 2;
          rCtx.beginPath();
          rCtx.arc(safeCenterX, safeCenterY, stateRef.current.stormRadius * radarScale, 0, Math.PI * 2);
          rCtx.stroke();

          // Draw Major POIs with icons/labels on Radar
          pois.forEach((poi) => {
            const px = cx + (poi.x - camera.position.x) * radarScale;
            const py = cy + (poi.z - camera.position.z) * radarScale;
            if (px >= 5 && px <= w - 5 && py >= 5 && py <= h - 5) {
              rCtx.fillStyle = 'rgba(245, 158, 11, 0.9)';
              rCtx.beginPath();
              rCtx.arc(px, py, 3.5, 0, Math.PI * 2);
              rCtx.fill();

              rCtx.fillStyle = '#fef08a';
              rCtx.font = 'bold 8px sans-serif';
              rCtx.textAlign = 'center';
              rCtx.fillText(poi.name.split(' ')[0], px, py - 5);
            }
          });

          // Draw Jump Pads (Cyan diamonds)
          jumpPads.forEach((pad) => {
            const jx = cx + (pad.position.x - camera.position.x) * radarScale;
            const jy = cy + (pad.position.z - camera.position.z) * radarScale;
            rCtx.fillStyle = '#06b6d4';
            rCtx.beginPath();
            rCtx.moveTo(jx, jy - 3);
            rCtx.lineTo(jx + 3, jy);
            rCtx.lineTo(jx, jy + 3);
            rCtx.lineTo(jx - 3, jy);
            rCtx.closePath();
            rCtx.fill();
          });

          // Draw Loot Crates (Gold/Yellow dots)
          groundLootRoster.forEach((item) => {
            const lx = cx + (item.position.x - camera.position.x) * radarScale;
            const ly = cy + (item.position.z - camera.position.z) * radarScale;
            rCtx.fillStyle = item.color;
            rCtx.beginPath();
            rCtx.arc(lx, ly, 2.5, 0, Math.PI * 2);
            rCtx.fill();
          });

          // Draw Enemy Bots (Red Blips)
          bots.forEach((b) => {
            if (b.state === 'Dead') return;
            const bx = cx + (b.mesh.position.x - camera.position.x) * radarScale;
            const by = cy + (b.mesh.position.z - camera.position.z) * radarScale;
            rCtx.fillStyle = b.state === 'Attack' ? '#ef4444' : '#f87171';
            rCtx.beginPath();
            rCtx.arc(bx, by, 3, 0, Math.PI * 2);
            rCtx.fill();
          });

          // Draw Player Arrow at Center
          rCtx.save();
          rCtx.translate(cx, cy);
          rCtx.rotate(yaw);
          rCtx.fillStyle = '#10b981';
          rCtx.beginPath();
          rCtx.moveTo(0, -7);
          rCtx.lineTo(5, 6);
          rCtx.lineTo(0, 3);
          rCtx.lineTo(-5, 6);
          rCtx.closePath();
          rCtx.fill();
          rCtx.restore();

          rCtx.restore();

          // Outer border ring
          rCtx.strokeStyle = isSafe ? '#38bdf8' : '#ef4444';
          rCtx.lineWidth = 2.5;
          rCtx.beginPath();
          rCtx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
          rCtx.stroke();
        }
      }

      // --- SKYDIVE THIRD-PERSON VIEW OVERRIDE ---
      let isSkydiving = stateRef.current.dropPhase === 'freefall' || stateRef.current.dropPhase === 'parachute';
      let isInPlane = stateRef.current.dropPhase === 'in_plane';
      let realCamPos = camera.position.clone();
      let realCamRot = camera.rotation.clone();

      if (isSkydiving || isInPlane) {
        weaponHolder.visible = false;
      } else {
        weaponHolder.visible = true;
      }

      if (isSkydiving) {
        // Sync dummy position and rotate dummy to face the direction we are falling/looking
        playerDropDummy.visible = true;
        // The camera is at eye height (approx 1.85). The soldier mesh is built relative to the ground.
        // Subtract eyeHeight so the model lines up correctly.
        const modelPos = realCamPos.clone();
        modelPos.y -= 1.85; 
        playerDropDummy.position.copy(modelPos);
        playerDropDummy.rotation.y = yaw;
        // Pitch dummy down slightly in freefall
        playerDropDummy.rotation.x = stateRef.current.dropPhase === 'freefall' ? -Math.PI / 4 : 0;
        
        // Offset the camera back and slightly up
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
      } else {
        playerDropDummy.visible = false;
      }

      renderer.render(scene, camera);

      if (isSkydiving) {
        // Restore real FPS camera transform so physics and next-frame logic work perfectly
        camera.position.copy(realCamPos);
        camera.rotation.copy(realCamRot);
      }
    };

    const triggerGameOver = (killerName: string) => {
      stateRef.current.isGameOver = true;
      setIsGameOver(true);
      document.exitPointerLock?.();
    };

    // Match Reset Function
    const resetMatch = () => {
      camera.position.set(0, 445, -560);
      yaw = 0;
      pitch = 0;
      targetYaw = 0;
      targetPitch = 0;
      camera.rotation.set(0, 0, 0, 'YXZ');
      verticalVelocity = 0;
      isGrounded = false;
      planeZ = -550;
      airplaneGroup.visible = true;
      airplaneGroup.position.set(0, 450, planeZ);
      stateRef.current.dropPhase = 'in_plane';
      setDropPhase('in_plane');

      stateRef.current.playerHealth = 100;
      stateRef.current.playerShield = 50;
      stateRef.current.playerKills = 0;
      stateRef.current.playersAlive = 15;
      stateRef.current.isGameOver = false;
      stateRef.current.isVictory = false;
      stateRef.current.shotsFired = 0;
      stateRef.current.shotsHit = 0;
      stateRef.current.stormRadius = 130;
      stormCylinder.scale.set(1, 1, 1);
      stormRing.scale.set(1, 1, 1);

      setPlayerHealth(100);
      setPlayerShield(50);
      setPlayerKills(0);
      setPlayersAlive(15);
      setIsGameOver(false);
      setIsVictory(false);
      setStormPhase(1);
      setStormTimer(45);
      setIsStormShrinking(false);
      setIsInsideSafeZone(true);
      setAccuracy(100);
      setActiveObjectiveTip('Eliminate bots and stay inside the safe zone!');

      bots.forEach((b) => scene.remove(b.mesh));
      bots.length = 0;
      botRosterConfig.forEach((cfg) => {
        bots.push(createHumanoidSoldier(cfg.id, cfg.name, cfg.x, cfg.z, cfg.wps));
      });

      stateRef.current.hasStartedPlaying = true;
      stateRef.current.isPaused = false;
      matchStartTime = performance.now();
      lastDamageTime = performance.now();
      setHasStartedPlaying(true);
      setIsMatchPaused(false);

      if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        try {
          canvas.requestPointerLock();
        } catch {
          // safe fallback
        }
      }
    };
    resetMatchRef.current = resetMatch;

    // Quick Revive Function (Restores HP & Shield so player continues fight without restart)
    const revivePlayer = () => {
      stateRef.current.playerHealth = 100;
      stateRef.current.playerShield = 50;
      stateRef.current.isGameOver = false;
      setPlayerHealth(100);
      setPlayerShield(50);
      setIsGameOver(false);

      // Reposition to safe central high ground
      const groundY = getTerrainHeight(0, 20);
      camera.position.set(0, groundY + 1.85, 20);
      verticalVelocity = 0;
      isGrounded = true;

      // 4-second invulnerability spawn grace period
      matchStartTime = performance.now();
      lastDamageTime = performance.now();
      sounds.playShieldHit();

      if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        try {
          canvas.requestPointerLock();
        } catch {
          // safe fallback
        }
      }
    };
    revivePlayerRef.current = revivePlayer;

    animId = requestAnimationFrame(animate);

    // Event Listeners
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // Trap touchmove on game viewport so mobile browsers don't trigger edge-swipe back navigation
    const preventNativeTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };
    if (container) {
      container.addEventListener('touchmove', preventNativeTouchMove, { passive: false });
    }

    // Push state trap so if user triggers browser back button or edge swipe, game pauses instead of exiting
    try {
      window.history.pushState({ inGame: true }, '');
    } catch {
      // safe fallback
    }
    const handlePopState = () => {
      try {
        window.history.pushState({ inGame: true }, '');
      } catch {
        // safe fallback
      }
      if (stateRef.current.hasStartedPlaying && !stateRef.current.isGameOver && !stateRef.current.isVictory) {
        togglePauseMatchRef.current?.();
      }
    };
    window.addEventListener('popstate', handlePopState);

    // Guard against accidental page close/refresh while match is active
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stateRef.current.hasStartedPlaying && !stateRef.current.isGameOver) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('blur', onWindowBlur);
      resizeObserver.disconnect();
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (container) {
        container.removeEventListener('touchmove', preventNativeTouchMove);
      }
      renderer.dispose();
    };
  }, [settings]);

  const handleStartMatch = useCallback(() => {
    stateRef.current.hasStartedPlaying = true;
    stateRef.current.isPaused = false;
    setHasStartedPlaying(true);
    setIsMatchPaused(false);
    sounds.playReload();

    const isTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (typeof window !== 'undefined' && window.innerWidth < 1024);
    if (!isTouch && canvasRef.current) {
      try {
        canvasRef.current.requestPointerLock();
      } catch {
        // safe fallback
      }
    } else if (isTouch) {
      // Auto-trigger full screen and landscape mode on mobile
      try {
        const docEl = document.documentElement as any;
        if (!document.fullscreenElement) {
          if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
          else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen().catch(() => {});
        }
        if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch {
        // safe fallback
      }
    }
  }, []);

  const handleRestart = useCallback(() => {
    if (resetMatchRef.current) resetMatchRef.current();
  }, []);

  const handleRevive = useCallback(() => {
    if (revivePlayerRef.current) revivePlayerRef.current();
  }, []);

  const togglePauseMatch = useCallback(() => {
    if (!stateRef.current.hasStartedPlaying || stateRef.current.isGameOver || stateRef.current.isVictory) return;
    setIsMatchPaused((prev) => {
      const next = !prev;
      stateRef.current.isPaused = next;
      if (next) {
        document.exitPointerLock?.();
      } else {
        const isTouch =
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          (typeof window !== 'undefined' && window.innerWidth < 1024);
        if (!isTouch && canvasRef.current) {
          try {
            canvasRef.current.requestPointerLock();
          } catch {
            // safe fallback
          }
        }
      }
      return next;
    });
  }, []);
  togglePauseMatchRef.current = togglePauseMatch;

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Mobile Touch Joystick Event Handlers
  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (joystickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    joystickCenterRef.current = { x: centerX, y: centerY };
    joystickTouchIdRef.current = touch.identifier;
    setIsJoystickActive(true);

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 38;
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setJoystickKnobPos({ x: clampedX, y: clampedY });
    stateRef.current.joystickVector = {
      x: clampedX / maxRadius,
      y: clampedY / maxRadius
    };
  }, []);

  const handleJoystickMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const centerX = joystickCenterRef.current.x;
        const centerY = joystickCenterRef.current.y;
        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 38;
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);
        const clampedX = Math.cos(angle) * clampedDist;
        const clampedY = Math.sin(angle) * clampedDist;

        setJoystickKnobPos({ x: clampedX, y: clampedY });
        stateRef.current.joystickVector = {
          x: clampedX / maxRadius,
          y: clampedY / maxRadius
        };
        break;
      }
    }
  }, []);

  const handleJoystickEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setIsJoystickActive(false);
        setJoystickKnobPos({ x: 0, y: 0 });
        stateRef.current.joystickVector = { x: 0, y: 0 };
        break;
      }
    }
  }, []);

  // Mobile Touch Look & Aim Drag Event Handlers
  const handleTouchLookStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stateRef.current.hasStartedPlaying || stateRef.current.isPaused) return;
    if (lookTouchIdRef.current === null) {
      const touch = e.changedTouches[0];
      lookTouchIdRef.current = touch.identifier;
      lastLookTouchRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const handleTouchLookMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stateRef.current.hasStartedPlaying || stateRef.current.isPaused || stateRef.current.isGameOver) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const dx = touch.clientX - lastLookTouchRef.current.x;
        const dy = touch.clientY - lastLookTouchRef.current.y;
        const sens = stateRef.current.mouseSensitivity * 0.0035;
        rotateCameraRef.current(-dx * sens, -dy * sens);
        lastLookTouchRef.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  }, []);

  const handleTouchLookEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  }, []);

  return (
    <div
      id="fps-game-container"
      className="fixed inset-0 w-screen h-screen h-[100dvh] bg-slate-950 overflow-hidden select-none font-sans game-viewport m-0 p-0 border-none rounded-none"
      style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
      ref={containerRef}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" style={{ touchAction: 'none' }} />

      {/* Auto-Rotate to Landscape Guidance Banner for Mobile */}
      {isPortrait && (
        <div className="absolute top-2 inset-x-2 sm:inset-x-6 z-40 bg-slate-950/95 border border-indigo-500/50 backdrop-blur-md px-3.5 py-2.5 rounded-2xl flex items-center justify-between shadow-2xl text-white pointer-events-auto">
          <div className="flex items-center gap-2.5 text-xs">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-cyan-400 shrink-0">
              <RotateCw className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <div className="font-bold font-mono text-[11px] text-cyan-300 tracking-wide">AUTO-ROTATE TO LANDSCAPE</div>
              <div className="text-[10px] text-slate-300">Turn phone sideways for optimal dual-stick controls</div>
            </div>
          </div>
          <button
            id="btn-banner-auto-rotate"
            onClick={handleAutoRotateLandscape}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:brightness-110 text-white font-bold font-mono text-[11px] shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>ROTATE</span>
          </button>
        </div>
      )}

      {/* Mobile Touch Look & Aim Drag Zone (Right side of screen) */}
      {hasStartedPlaying && !isMatchPaused && !isGameOver && !isVictory && (
        <div
          id="touch-look-aim-zone"
          className="absolute top-16 bottom-24 right-0 left-[35%] z-12 touch-none pointer-events-auto"
          onTouchStart={handleTouchLookStart}
          onTouchMove={handleTouchLookMove}
          onTouchEnd={handleTouchLookEnd}
          onTouchCancel={handleTouchLookEnd}
        />
      )}

      {/* Storm Danger Vignette */}
      {!isInsideSafeZone && (
        <div className="absolute inset-0 pointer-events-none border-[12px] border-blue-600/70 bg-blue-900/20 animate-pulse z-10" />
      )}

      {/* Damage Flash Red Vignette */}
      {isDamagedVignette && (
        <div className="absolute inset-0 pointer-events-none bg-rose-600/35 transition-opacity z-10" />
      )}

      {/* Sniper ADS Scope Overlay */}
      {isAimingDownSights && activeWeaponType === 'sniper' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-15">
          <div className="w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] rounded-full border-2 border-black/95 shadow-[0_0_0_9999px_rgba(0,0,0,0.88)] relative flex items-center justify-center">
            <div className="w-full h-[1px] bg-black" />
            <div className="h-full w-[1px] bg-black absolute" />
            <div className="w-20 sm:w-28 h-20 sm:h-28 rounded-full border border-black/70 absolute" />
            <div className="w-2.5 h-2.5 rounded-full bg-red-600/90 absolute" />
          </div>
        </div>
      )}

      {/* HUD OVERLAY CONTAINER */}
      <div className="absolute inset-0 pointer-events-none z-20 text-white select-none">
        {/* TOP HUD BAR: Radar + Telemetry + Essential Game Controls */}
        <div className="absolute top-0 inset-x-0 p-2 sm:p-3 flex items-start justify-between gap-2 pointer-events-none">
          {/* Top-Left: Mini-Map Radar & Safe Zone Indicator */}
          <div className="flex items-start gap-2 pointer-events-auto">
            <div className="relative bg-slate-950/85 backdrop-blur-md p-1 rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center">
              <canvas ref={radarCanvasRef} width={100} height={100} className="w-[64px] h-[64px] sm:w-[96px] sm:h-[96px] rounded-xl block" />
              <div className="mt-0.5 text-[8px] sm:text-[10px] font-mono font-bold flex items-center gap-1 text-slate-300">
                <Navigation className="w-2.5 h-2.5 text-emerald-400" />
                <span>{isInsideSafeZone ? `SAFE (${distanceToSafeCenter}m)` : `ZONE!`}</span>
              </div>
            </div>
          </div>

          {/* Top-Center: Tactical Telemetry (Compass • Storm Clock • Alive • Kills) */}
          <div className="flex flex-col items-center gap-1 pointer-events-auto">
            <div className="bg-slate-950/85 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-xl border border-slate-800 shadow-lg flex items-center gap-2 text-xs font-mono font-bold">
              {/* Compass Heading */}
              <div className="flex items-center gap-1 text-amber-400">
                <Compass className="w-3.5 h-3.5" />
                <span>{compassHeading}°</span>
                <span className="text-white">
                  {compassHeading >= 338 || compassHeading < 23 ? 'N' :
                   compassHeading < 68 ? 'NE' :
                   compassHeading < 113 ? 'E' :
                   compassHeading < 158 ? 'SE' :
                   compassHeading < 203 ? 'S' :
                   compassHeading < 248 ? 'SW' :
                   compassHeading < 293 ? 'W' : 'NW'}
                </span>
              </div>

              <div className="w-[1px] h-3 bg-slate-700" />

              {/* Storm Clock */}
              <div className={`flex items-center gap-1 ${isInsideSafeZone ? 'text-cyan-300' : 'text-rose-400 animate-pulse'}`}>
                <Clock className="w-3 h-3" />
                <span>
                  {isStormShrinking ? 'STORM: ' : 'ZONE: '}
                  {Math.floor(stormTimer / 60)}:{(stormTimer % 60).toString().padStart(2, '0')}
                </span>
              </div>

              <div className="w-[1px] h-3 bg-slate-700" />

              {/* Alive & Kills */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">ALIVE</span>
                <span className="text-emerald-400 font-black">{playersAlive}</span>
                <span className="text-slate-600 font-normal">|</span>
                <Skull className="w-3 h-3 text-rose-400" />
                <span className="text-white font-black">{playerKills}</span>
              </div>
            </div>

            {/* Tactical Health & Shield Dual Gauge */}
            <div className="bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-3.5 py-1 rounded-xl border border-slate-800 shadow-xl flex items-center gap-2 sm:gap-3">
              {/* Shield */}
              <div className="flex items-center gap-1.5 w-20 sm:w-28">
                <Shield className="w-3 h-3 text-cyan-400 shrink-0" />
                <div className="w-full">
                  <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono font-bold leading-none mb-0.5">
                    <span className="text-cyan-400">SHIELD</span>
                    <span className="text-slate-200">{playerShield}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-150"
                      style={{ width: `${Math.max(0, playerShield)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="w-[1px] h-4 bg-slate-800" />

              {/* Health */}
              <div className="flex items-center gap-1.5 w-20 sm:w-28">
                <Heart className="w-3 h-3 text-emerald-400 shrink-0" />
                <div className="w-full">
                  <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono font-bold leading-none mb-0.5">
                    <span className="text-emerald-400">HEALTH</span>
                    <span className="text-slate-200">{playerHealth}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-150 ${
                        playerHealth > 30 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                      }`}
                      style={{ width: `${Math.max(0, playerHealth)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tactical Tip Line (Compact, subtle) */}
            {activeObjectiveTip && (
              <div className="hidden sm:inline-flex bg-slate-950/80 backdrop-blur-sm border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-300 items-center gap-1.5 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                <span>{activeObjectiveTip}</span>
              </div>
            )}
          </div>

          {/* Top-Right: Clean In-Game Utility Controls Only */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Toggle On-Screen Virtual Controls */}
            <button
              id="btn-toggle-controls"
              onClick={() => setShowOnScreenControls(!showOnScreenControls)}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors shadow-lg cursor-pointer ${
                showOnScreenControls
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/30'
                  : 'bg-slate-900/85 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title={showOnScreenControls ? 'Hide Virtual Buttons' : 'Show Virtual Buttons'}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
            </button>

            {/* Pause / Resume Button */}
            {hasStartedPlaying && !isGameOver && !isVictory && (
              <button
                id="btn-toggle-pause"
                onClick={togglePauseMatch}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-900/85 border border-slate-800 hover:bg-slate-800 text-slate-200 transition-colors shadow-lg cursor-pointer"
                title={isMatchPaused ? 'Resume Match' : 'Pause Match'}
              >
                {isMatchPaused ? <Play className="w-3.5 h-3.5 fill-current text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            )}

            {/* Sound Mute Toggle */}
            <button
              id="btn-toggle-sound"
              onClick={() => setIsSoundMuted(!isSoundMuted)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900/85 border border-slate-800 hover:bg-slate-800 text-slate-200 transition-colors shadow-lg cursor-pointer"
              title={isSoundMuted ? 'Unmute SFX' : 'Mute SFX'}
            >
              {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              id="btn-toggle-fullscreen"
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900/85 border border-slate-800 hover:bg-slate-800 text-slate-200 transition-colors shadow-lg cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Dynamic Kill Feed (Top right beneath utility buttons) */}
        <div className="absolute top-12 sm:top-14 right-2 sm:right-3 flex flex-col gap-1 z-15 pointer-events-none max-w-[190px] sm:max-w-xs">
          {killFeed.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="bg-slate-950/80 border border-slate-800 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-mono flex items-center gap-1 shadow-md"
            >
              <span className={`font-bold ${item.killer === 'You' ? 'text-emerald-400' : 'text-slate-200'}`}>
                {item.killer}
              </span>
              <span className="text-slate-500">[{item.weapon}]</span>
              <span className="text-rose-400 font-semibold">{item.victim}</span>
            </div>
          ))}
        </div>

        {/* Skydiving JUMP Button */}
        {dropPhase === 'in_plane' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                stateRef.current.dropPhase = 'freefall';
                setDropPhase('freefall');
              }}
              className="pointer-events-auto px-14 py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-3xl tracking-widest uppercase rounded-sm border-b-4 border-yellow-700 active:border-b-0 active:mt-1 transition-all shadow-[0_0_20px_rgba(234,179,8,0.5)]"
            >
              JUMP
            </button>
          </div>
        )}
        {dropPhase === 'freefall' && (
          <div className="absolute inset-0 flex flex-col justify-end items-center pointer-events-none z-30 pb-32">
            <button
              onClick={(e) => {
                e.stopPropagation();
                stateRef.current.dropPhase = 'parachute';
                setDropPhase('parachute');
                // The parachute model doesn't exist in React state directly, but logic loop will animate it.
              }}
              className="pointer-events-auto px-8 py-3 bg-blue-500 hover:bg-blue-400 text-white font-black text-xl tracking-widest uppercase rounded-sm border-b-4 border-blue-700 active:border-b-0 active:mt-1 transition-all shadow-lg"
            >
              OPEN PARACHUTE
            </button>
          </div>
        )}

        {/* Center Crosshair & High-Clarity Hitmarker */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {dropPhase === 'landed' && (!isAimingDownSights || activeWeaponType !== 'sniper') && (
            <div className="relative w-7 h-7 flex items-center justify-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 border border-black/80" />
              <div className="absolute top-0 w-0.5 h-2 bg-white border-x border-black/80" />
              <div className="absolute bottom-0 w-0.5 h-2 bg-white border-x border-black/80" />
              <div className="absolute left-0 h-0.5 w-2 bg-white border-y border-black/80" />
              <div className="absolute right-0 h-0.5 w-2 bg-white border-y border-black/80" />
            </div>
          )}

          {/* Full Military Precision Sniper Scope Overlay */}
          {isAimingDownSights && activeWeaponType === 'sniper' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[min(88vw,460px)] h-[min(88vw,460px)] rounded-full border-[3px] border-emerald-500/90 shadow-[0_0_0_9999px_rgba(3,7,18,0.92)] flex items-center justify-center">
                <div className="absolute w-full h-[1.5px] bg-emerald-400/90 shadow-sm" />
                <div className="absolute h-full w-[1.5px] bg-emerald-400/90 shadow-sm" />
                <div className="w-2.5 h-2.5 rounded-full border-2 border-rose-500 bg-rose-500/80 shadow-lg" />
                {[-100, -60, -30, 30, 60, 100].map((m) => (
                  <div key={m} className="absolute w-4 h-[1px] bg-emerald-400/80" style={{ transform: `translateY(${m}px)` }} />
                ))}
                {[-100, -60, -30, 30, 60, 100].map((m) => (
                  <div key={`x-${m}`} className="absolute h-4 w-[1px] bg-emerald-400/80" style={{ transform: `translateX(${m}px)` }} />
                ))}
                <span className="absolute bottom-6 text-[10px] font-mono text-emerald-400/80 tracking-widest font-bold">
                  MIL-DOT // 8X RANGE
                </span>
              </div>
            </div>
          )}

          {hitmarkerActive && (
            <div className="absolute text-red-500 font-black text-2xl animate-ping select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              ✕
            </div>
          )}
        </div>

        {/* Nearby Loot Interaction Prompt */}
        {nearbyLootPrompt && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 border border-indigo-500 px-3.5 py-1.5 rounded-xl shadow-2xl text-xs font-mono font-bold text-white flex items-center gap-2 animate-bounce pointer-events-auto">
            <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[11px] font-black">E</span>
            <span>{nearbyLootPrompt}</span>
          </div>
        )}

        {/* Desktop Pointer Lock Prompt (Only shown on non-touch devices) */}
        {hasStartedPlaying && !isPointerLocked && !isMatchPaused && !isGameOver && !isVictory && !isTouchDevice && (
          <div
            onClick={() => canvasRef.current?.requestPointerLock()}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-indigo-600/90 hover:bg-indigo-600 text-white font-mono text-xs font-bold px-4 py-1.5 rounded-xl shadow-xl border border-indigo-400 cursor-pointer pointer-events-auto flex items-center gap-2 animate-pulse"
          >
            <Crosshair className="w-4 h-4" />
            <span>Click screen to lock mouse & aim</span>
          </div>
        )}

        {/* BOTTOM-LEFT: Virtual Movement Joystick & Sprint */}
        {showOnScreenControls && hasStartedPlaying && !isMatchPaused && !isGameOver && !isVictory && (
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 flex items-end gap-2 pointer-events-auto z-25 select-none">
            <div
              id="mobile-virtual-joystick"
              className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 transition-colors flex items-center justify-center backdrop-blur-md shadow-2xl touch-none ${
                isJoystickActive
                  ? 'border-indigo-500 bg-slate-950/85'
                  : 'border-slate-700/80 bg-slate-950/70'
              }`}
              onTouchStart={handleJoystickStart}
              onTouchMove={handleJoystickMove}
              onTouchEnd={handleJoystickEnd}
              onTouchCancel={handleJoystickEnd}
            >
              {/* Direction indicators */}
              <span className="absolute top-1 text-[8px] text-slate-500 font-mono">▲</span>
              <span className="absolute bottom-1 text-[8px] text-slate-500 font-mono">▼</span>
              <span className="absolute left-1 text-[8px] text-slate-500 font-mono">◀</span>
              <span className="absolute right-1 text-[8px] text-slate-500 font-mono">▶</span>

              {/* Joystick Knob */}
              <div
                className={`w-10 h-10 rounded-full shadow-xl flex items-center justify-center text-[10px] font-bold transition-transform duration-75 border border-white/40 ${
                  isJoystickActive
                    ? 'bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white shadow-indigo-500/50 scale-105'
                    : 'bg-slate-800 text-slate-400'
                }`}
                style={{
                  transform: `translate(${joystickKnobPos.x}px, ${joystickKnobPos.y}px)`
                }}
              >
                <Move className="w-3.5 h-3.5 text-white/90" />
              </div>
            </div>

            {/* Sprint Toggle Button */}
            <button
              id="btn-mobile-sprint"
              onTouchStart={(e) => {
                e.stopPropagation();
                virtualInputRef.current.sprint = !virtualInputRef.current.sprint;
              }}
              onClick={() => {
                virtualInputRef.current.sprint = !virtualInputRef.current.sprint;
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-[9px] sm:text-[10px] font-mono font-bold flex flex-col items-center justify-center gap-0.5 border shadow-lg transition-all cursor-pointer ${
                virtualInputRef.current.sprint
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
                  : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
              title="Sprint [Shift]"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>SPRINT</span>
            </button>
          </div>
        )}

        {/* BOTTOM-CENTER: COMPLETE WEAPON DOCK (Elevated on mobile to prevent thumb overlap) */}
        <div className="absolute bottom-24 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center pointer-events-auto z-25">
          <div className="bg-slate-950/90 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl border border-slate-800 shadow-2xl flex items-center gap-1 sm:gap-1.5">
            {(['rifle', 'shotgun', 'sniper'] as WeaponType[]).map((wType, idx) => {
              const w = WEAPONS_CATALOG[wType];
              const isActive = activeWeaponType === wType;
              const ammo = stateRef.current?.ammoByWeapon?.[wType] || { current: w.magSize, reserve: 60 };
              return (
                <button
                  key={wType}
                  id={`btn-weapon-slot-${wType}`}
                  onClick={() => {
                    const newW = WEAPONS_CATALOG[wType];
                    stateRef.current.activeWeapon = newW;
                    setActiveWeaponType(wType);
                    const ammoState = stateRef.current.ammoByWeapon[wType];
                    setCurrentAmmo(ammoState.current);
                    setReserveAmmo(ammoState.reserve);
                  }}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer border font-mono ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 border-cyan-400 text-white font-bold shadow-lg shadow-indigo-600/40 scale-105'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="text-[9px] sm:text-[10px] font-bold opacity-75">[{idx + 1}]</span>
                  <div className="text-left">
                    <div className="text-[10px] sm:text-xs font-bold leading-tight flex items-center gap-1">
                      <span>{w.iconName}</span>
                      <span className="hidden sm:inline">{w.name.split(' ')[0]}</span>
                    </div>
                    <div className="text-[8px] sm:text-[10px] leading-tight text-cyan-300 font-semibold">
                      {isActive && isReloading ? 'RELOAD...' : `${isActive ? currentAmmo : ammo.current}/${isActive ? reserveAmmo : ammo.reserve}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM-RIGHT: ACTION BUTTONS CLUSTER (Fire, Zoom, Jump, Reload, Loot) */}
        {showOnScreenControls && hasStartedPlaying && !isMatchPaused && !isGameOver && !isVictory && (
          <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 flex items-end gap-2 pointer-events-auto z-25 select-none">
            {/* 2x2 Grid of Actions */}
            <div className="grid grid-cols-2 gap-1.5">
              {/* Loot */}
              <button
                id="btn-mobile-loot"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  pickupLootRef.current?.();
                }}
                onClick={() => pickupLootRef.current?.()}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center font-bold text-[9px] sm:text-[10px] shadow-lg border transition-all cursor-pointer ${
                  nearbyLootPrompt
                    ? 'bg-indigo-600 text-white border-indigo-400 animate-bounce shadow-indigo-500/50'
                    : 'bg-slate-900/85 text-slate-300 border-slate-700 active:bg-indigo-600'
                }`}
                title="Loot [E]"
              >
                <Target className="w-4 h-4 mb-0.5 text-indigo-400" />
                <span>LOOT</span>
              </button>

              {/* Reload */}
              <button
                id="btn-mobile-reload"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  reloadWeaponRef.current?.();
                }}
                onClick={() => reloadWeaponRef.current?.()}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900/85 hover:bg-slate-800 active:bg-amber-600 text-slate-200 font-bold text-[9px] sm:text-[10px] flex flex-col items-center justify-center border border-slate-700 shadow-lg cursor-pointer"
                title="Reload [R]"
              >
                <RotateCcw className="w-4 h-4 mb-0.5 text-amber-400" />
                <span>RELOAD</span>
              </button>

              {/* Jump */}
              <button
                id="btn-mobile-jump"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  virtualInputRef.current.jump = true;
                }}
                onMouseDown={() => (virtualInputRef.current.jump = true)}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900/85 hover:bg-slate-800 active:bg-emerald-600 text-slate-200 font-bold text-[9px] sm:text-[10px] flex flex-col items-center justify-center border border-slate-700 shadow-lg cursor-pointer"
                title="Jump [Space]"
              >
                <span className="text-emerald-400 font-black text-xs leading-none">▲</span>
                <span>JUMP</span>
              </button>

              {/* ADS Zoom */}
              <button
                id="btn-mobile-ads"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  const next = !isAimingDownSights;
                  setIsAimingDownSights(next);
                  stateRef.current.isAimingDownSights = next;
                }}
                onClick={() => {
                  const next = !isAimingDownSights;
                  setIsAimingDownSights(next);
                  stateRef.current.isAimingDownSights = next;
                }}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center font-bold text-[9px] sm:text-[10px] border shadow-lg transition-all cursor-pointer ${
                  isAimingDownSights
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black'
                    : 'bg-slate-900/85 text-slate-200 border-slate-700 active:bg-cyan-600'
                }`}
                title="Aim Down Sights (Zoom)"
              >
                <Crosshair className="w-4 h-4 mb-0.5 text-cyan-400" />
                <span>ZOOM</span>
              </button>
            </div>

            {/* Primary FIRE Button */}
            <button
              id="btn-mobile-fire"
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                stateRef.current.isFiringContinuous = true;
                shootWeaponRef.current?.();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                stateRef.current.isFiringContinuous = false;
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
                e.stopPropagation();
                stateRef.current.isFiringContinuous = false;
              }}
              onMouseDown={() => {
                stateRef.current.isFiringContinuous = true;
                shootWeaponRef.current?.();
              }}
              onMouseUp={() => {
                stateRef.current.isFiringContinuous = false;
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 active:from-rose-700 active:to-red-600 text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center border-2 border-red-300 shadow-2xl shadow-rose-600/50 active:scale-95 transition-transform select-none touch-none cursor-pointer shrink-0"
              title="Fire Weapon"
            >
              <span className="text-lg sm:text-xl leading-none">🔥</span>
              <span className="tracking-tight text-[11px] sm:text-xs">FIRE</span>
            </button>
          </div>
        )}
      </div>

      {/* START OVERLAY: Enter Battle Royale Arena */}
      {!hasStartedPlaying && !isGameOver && !isVictory && (
        <div
          id="click-to-play-overlay"
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 sm:p-6 z-30 overflow-hidden select-none"
        >
          {/* Background Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-40 -z-10"
            src="https://cdn.pixabay.com/video/2021/08/04/83866-584705193_large.mp4"
          />

          {/* Background Audio (Will try to autoplay, but usually requires interaction, we'll keep it loop and set it to play on first click if blocked) */}
          <audio id="bg-music" autoPlay loop src="https://cdn.pixabay.com/audio/2022/10/25/audio_2069ed0cb4.mp3"></audio>

          <div className="z-10 flex flex-col items-center flex-1 justify-center">
            <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-8 tracking-widest font-mono drop-shadow-2xl">
              WARZONE BATTLE ROYALE
            </h1>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
              <button
                id="btn-enter-battle-royale"
                onClick={(e) => {
                  const audio = document.getElementById('bg-music') as HTMLAudioElement;
                  if (audio) audio.pause();
                  handleStartMatch(e as any);
                }}
                className="px-10 py-4 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-lg transition-transform shadow-xl shadow-rose-600/40 flex items-center gap-3 active:scale-95 cursor-pointer border border-rose-400/50"
              >
                <Play className="w-6 h-6 fill-white" />
                <span>DEPLOY TO ARENA</span>
              </button>

              <button
                id="btn-open-guide-from-start"
                onClick={() => setShowGuideModal(true)}
                className="px-8 py-4 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white font-mono text-sm font-bold transition-transform border border-slate-700/50 flex items-center gap-2 cursor-pointer backdrop-blur-md active:scale-95"
              >
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <span>HOW TO PLAY</span>
              </button>
            </div>
          </div>

          <div className="mt-auto pt-8 pb-4 text-slate-400 font-mono text-xs z-10 font-bold tracking-widest">
            DEVELOPED BY ANIKET
          </div>
        </div>
      )}

      {/* MATCH PAUSED OVERLAY */}
      {isMatchPaused && hasStartedPlaying && !isGameOver && !isVictory && (
        <div
          id="pause-match-overlay"
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-35 animate-in fade-in duration-200 select-none"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-xl shadow-amber-500/10">
            <Pause className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-black text-white mb-1 font-mono">MATCH PAUSED</h2>
          <p className="text-xs text-slate-300 mb-6 font-mono">
            Combat simulation paused • All bots and storm freeze in place
          </p>

          <div className="flex flex-col gap-2.5 w-full max-w-xs font-mono">
            <button
              id="btn-resume-match"
              onClick={togglePauseMatch}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>RESUME MATCH</span>
            </button>

            <button
              id="btn-restart-from-pause"
              onClick={handleRestart}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>RESTART MATCH</span>
            </button>

            {/* Sensitivity Slider */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Aim Sens: {mouseSensitivity}x</span>
              </span>
              <input
                type="range"
                min="0.8"
                max="4.0"
                step="0.2"
                value={mouseSensitivity}
                onChange={(e) => setMouseSensitivity(parseFloat(e.target.value))}
                className="w-24 sm:w-28 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Sound SFX Toggle */}
            <button
              id="btn-sound-from-pause"
              onClick={() => setIsSoundMuted(!isSoundMuted)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{isSoundMuted ? 'UNMUTE SOUND' : 'MUTE SOUND'}</span>
            </button>

            <button
              id="btn-guide-from-pause"
              onClick={() => setShowGuideModal(true)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>HOW TO PLAY GUIDE</span>
            </button>
          </div>
        </div>
      )}

      {/* VICTORY ROYALE #1 CELEBRATION SCREEN */}
      {isVictory && (
        <div
          id="victory-royale-overlay"
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-40 animate-in fade-in zoom-in duration-300"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 mb-4 shadow-2xl shadow-amber-500/40 animate-bounce">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="text-xs font-mono font-black text-amber-400 tracking-widest uppercase mb-1">
            CHAMPION SQUAD • #1 SURVIVOR
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-500 mb-3 tracking-tight">
            #1 VICTORY ROYALE
          </h2>
          <p className="text-sm text-slate-300 max-w-md mb-6">
            You eliminated all enemy combatants and conquered the Warzone!
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md w-full bg-slate-900/80 border border-slate-800 p-4 rounded-2xl mb-6 text-xs font-mono">
            <div>
              <div className="text-slate-400 mb-0.5">TOTAL KILLS</div>
              <div className="text-lg font-bold text-emerald-400">{playerKills}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-0.5">ACCURACY</div>
              <div className="text-lg font-bold text-cyan-400">{accuracy}%</div>
            </div>
            <div>
              <div className="text-slate-400 mb-0.5">PLACEMENT</div>
              <div className="text-lg font-bold text-amber-400">#1 of 15</div>
            </div>
          </div>

          <button
            id="btn-play-again-victory"
            onClick={handleRestart}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/30 flex items-center gap-2 hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      )}

      {/* GAME OVER / DEFEAT SCREEN */}
      {isGameOver && (
        <div
          id="game-over-overlay"
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-40 animate-in fade-in"
        >
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4 shadow-xl shadow-rose-500/20">
            <Skull className="w-8 h-8" />
          </div>

          <div className="text-xs font-mono font-bold text-rose-400 tracking-widest uppercase mb-1">
            ELIMINATED IN ACTION
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-wide font-mono">
            RANK #{playersAlive} OF 15
          </h2>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            You were eliminated in the combat zone. Redeploy and fight for #1 Victory Royale!
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-xs w-full bg-slate-900/80 border border-slate-800 p-4 rounded-2xl mb-6 text-xs font-mono">
            <div>
              <div className="text-slate-400 mb-0.5">KILLS</div>
              <div className="text-base font-bold text-emerald-400">{playerKills}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-0.5">ACCURACY</div>
              <div className="text-base font-bold text-cyan-400">{accuracy}%</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              id="btn-quick-revive"
              onClick={handleRevive}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              <span>REVIVE & CONTINUE (Keep Kills)</span>
            </button>

            <button
              id="btn-redeploy-defeat"
              onClick={handleRestart}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>START FRESH MATCH</span>
            </button>
          </div>
        </div>
      )}

      {/* Bilingual How-to-Play Guide Modal */}
      <GameGuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />
    </div>
  );
};
