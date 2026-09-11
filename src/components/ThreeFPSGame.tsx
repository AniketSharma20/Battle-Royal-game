import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameSettings, WeaponType, WeaponData, LootItem, KillFeedItem } from '../types';
import { sounds } from '../utils/soundEffects';
import { TextureGenerator } from '../utils/textureGenerator';
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
  RotateCw,
  Code2
} from 'lucide-react';

interface ThreeFPSGameProps {
  settings: GameSettings;
  onOpenStudio?: () => void;
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

export const ThreeFPSGame: React.FC<ThreeFPSGameProps> = ({ settings, onOpenStudio }) => {
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
  const [playersAlive, setPlayersAlive] = useState(15);
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

  // Control Enhancements
  const [mouseSensitivity, setMouseSensitivity] = useState(2.0);
  const [showOnScreenControls, setShowOnScreenControls] = useState(false);
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
    playersAlive: 15,
    playerKills: 0,
    shotsFired: 0,
    shotsHit: 0,
    hasStartedPlaying: false,
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    isPointerLocked: false,
    joystickVector: { x: 0, y: 0 },
    isFiringContinuous: false,
    settings,
    mouseSensitivity: 2.0,
    stormRadius: 130,
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
    scene.fog = new THREE.Fog(0x93c5fd, 180, 520);

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
      1200
    );
    camera.position.set(0, 1.85, 20);

    // 3. RENDERER with Antialiasing, Tone Mapping & Soft Shadows for ultra-crisp graphics
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobileDevice,
      powerPreference: 'high-performance'
    });
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(isMobileDevice ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
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
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = isMobileDevice ? 1024 : 2048;
    sunLight.shadow.mapSize.height = isMobileDevice ? 1024 : 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    const d = 160;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0003;
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
    for (let c = 0; c < 20; c++) {
      const cloudGeo = new THREE.DodecahedronGeometry(Math.random() * 15 + 20, 1);
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

    // Perimeter Mountain Silhouettes (Ring of jagged peaks around the 260m island)
    const mountainGroup = new THREE.Group();
    const mountainMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    for (let m = 0; m < 32; m++) {
      const angle = (m / 32) * Math.PI * 2;
      const dist = 240 + (m % 3) * 20;
      const mx = Math.cos(angle) * dist;
      const mz = Math.sin(angle) * dist;
      const mHeight = 45 + Math.sin(m * 1.5) * 25 + Math.random() * 15;
      const mGeo = new THREE.ConeGeometry(28 + Math.random() * 15, mHeight, 5);
      const mMesh = new THREE.Mesh(mGeo, mountainMat);
      mMesh.position.set(mx, mHeight / 2 - 5, mz);
      mountainGroup.add(mMesh);
    }
    scene.add(mountainGroup);

    // 5. BATTLE ROYALE MAP & HIGH-QUALITY PROCEDURAL TEXTURES
    const mapSize = 280;

    // Rock-solid analytical terrain height function:
    // Guarantees central combat arena (radius <= 85m) is flat at y = 0
    // Eliminates all ground clipping, sinking into the ground, or buried roads/props!
    const getTerrainHeight = (x: number, z: number): number => {
      const dist = Math.sqrt(x * x + z * z);
      if (dist <= 85) {
        return 0;
      }
      if (dist <= 115) {
        const t = (dist - 85) / 30;
        const smoothT = t * t * (3 - 2 * t);
        const hillH = (Math.sin(x * 0.06) + Math.cos(z * 0.06)) * 1.6;
        return Math.max(0, hillH * smoothT);
      }
      const rim = dist - 115;
      return 2.5 + Math.pow(rim * 0.14, 1.9) + (Math.sin(x * 0.08) + Math.cos(z * 0.08)) * 1.8;
    };

    // Terrain with procedural grass/dirt canvas texture & vertex height mapping
    const grassTexture = TextureGenerator.createGrassTexture();
    const terrainGeo = new THREE.PlaneGeometry(mapSize, mapSize, 64, 64);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      posAttr.setY(i, getTerrainHeight(x, z));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshLambertMaterial({
      map: grassTexture
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Thick solid bedrock foundation under the entire island (so ground has real thickness and zero void show-through)
    const bedrockGeo = new THREE.BoxGeometry(mapSize + 2, 20, mapSize + 2);
    const bedrockMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
    const bedrock = new THREE.Mesh(bedrockGeo, bedrockMat);
    bedrock.position.set(0, -10.01, 0);
    scene.add(bedrock);

    // Asphalt Highways with realistic road markings (elevated cleanly at y = 0.06 over level ground)
    const roadTexture = TextureGenerator.createRoadTexture();
    const roadGeo = new THREE.PlaneGeometry(12, 170);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0.06, 0);
    road.receiveShadow = true;
    scene.add(road);

    const roadCross = new THREE.Mesh(roadGeo, roadMat);
    roadCross.rotation.y = Math.PI / 2;
    roadCross.position.set(0, 0.08, 0);
    roadCross.receiveShadow = true;
    scene.add(roadCross);

    // Shared procedural textures and materials for structures
    const concreteTex = TextureGenerator.createConcreteWallTexture('#64748b');
    const containerRedTex = TextureGenerator.createContainerTexture('#991b1b');
    const containerBlueTex = TextureGenerator.createContainerTexture('#1e40af');
    const containerGreenTex = TextureGenerator.createContainerTexture('#166534');
    const containerRedMat = new THREE.MeshLambertMaterial({ map: containerRedTex });
    const containerBlueMat = new THREE.MeshLambertMaterial({ map: containerBlueTex });
    const containerGreenMat = new THREE.MeshLambertMaterial({ map: containerGreenTex });
    const woodTex = TextureGenerator.createWoodPlankTexture();
    const hazardTex = TextureGenerator.createHazardStripeTexture();

    // Arrays for collision and bullet impact targets
    const collidableMeshes: THREE.Object3D[] = [];
    const tracers: BulletTracer[] = [];
    const impactSparks: ImpactSpark[] = [];

    // Helper: Build detailed military watchtower
    const buildWatchtower = (x: number, z: number) => {
      const towerGroup = new THREE.Group();
      towerGroup.position.set(x, getTerrainHeight(x, z), z);

      const stiltGeo = new THREE.CylinderGeometry(0.3, 0.35, 10, 8);
      const stiltMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      const offsets = [
        [-3, -3],
        [3, -3],
        [-3, 3],
        [3, 3]
      ];
      offsets.forEach(([ox, oz]) => {
        const stilt = new THREE.Mesh(stiltGeo, stiltMat);
        stilt.position.set(ox, 5, oz);
        stilt.castShadow = true;
        towerGroup.add(stilt);
      });

      // Platform
      const platGeo = new THREE.BoxGeometry(8, 0.6, 8);
      const platMat = new THREE.MeshLambertMaterial({ map: woodTex });
      const platform = new THREE.Mesh(platGeo, platMat);
      platform.position.set(0, 10, 0);
      platform.castShadow = true;
      platform.receiveShadow = true;
      towerGroup.add(platform);
      collidableMeshes.push(platform);

      // Guard Rails
      const railGeo = new THREE.BoxGeometry(8, 1.2, 0.3);
      const railMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
      const rails = [
        [0, 10.6, -3.8],
        [0, 10.6, 3.8]
      ];
      rails.forEach(([rx, ry, rz]) => {
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(rx, ry, rz);
        towerGroup.add(rail);
      });

      // Roof
      const roofGeo = new THREE.ConeGeometry(6.5, 2.5, 4);
      const roofMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 13.5, 0);
      towerGroup.add(roof);

      scene.add(towerGroup);
    };

    // Helper: Build compound concrete building
    const buildCompoundBuilding = (
      x: number,
      z: number,
      w: number,
      h: number,
      d: number,
      label?: string
    ) => {
      const bldgGroup = new THREE.Group();
      bldgGroup.position.set(x, getTerrainHeight(x, z) + h / 2, z);

      const bldgGeo = new THREE.BoxGeometry(w, h, d);
      const bldgMat = new THREE.MeshLambertMaterial({ map: concreteTex });
      const bldgMesh = new THREE.Mesh(bldgGeo, bldgMat);
      bldgMesh.castShadow = true;
      bldgMesh.receiveShadow = true;
      bldgGroup.add(bldgMesh);
      collidableMeshes.push(bldgMesh);

      // Roof rim
      const rimGeo = new THREE.BoxGeometry(w + 0.6, 0.4, d + 0.6);
      const rimMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.position.set(0, h / 2 + 0.2, 0);
      bldgGroup.add(rimMesh);

      // Hazard stripe foundation base
      const baseGeo = new THREE.BoxGeometry(w + 0.2, 0.8, d + 0.2);
      const baseMat = new THREE.MeshLambertMaterial({ map: hazardTex });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.set(0, -h / 2 + 0.4, 0);
      bldgGroup.add(baseMesh);

      scene.add(bldgGroup);
    };

    // Helper: Build military pine tree
    const buildPineTree = (x: number, z: number) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(x, getTerrainHeight(x, z), z);

      const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 3.5, 6);
      const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2817 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.75;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      collidableMeshes.push(trunk);

      const foliageMat = new THREE.MeshLambertMaterial({ color: 0x14532d });
      const layers = [
        { r: 3.0, h: 3.8, y: 4.2 },
        { r: 2.4, h: 3.2, y: 6.5 },
        { r: 1.6, h: 2.6, y: 8.5 }
      ];
      layers.forEach(({ r, h, y }) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), foliageMat);
        cone.position.y = y;
        cone.castShadow = true;
        treeGroup.add(cone);
      });

      scene.add(treeGroup);
    };

    // Helper: Build shipping container
    const buildContainer = (x: number, z: number, rotY: number, mat: THREE.Material) => {
      const cGeo = new THREE.BoxGeometry(3.5, 3.2, 8);
      const cMesh = new THREE.Mesh(cGeo, mat);
      cMesh.position.set(x, getTerrainHeight(x, z) + 1.6, z);
      cMesh.rotation.y = rotY;
      cMesh.castShadow = true;
      cMesh.receiveShadow = true;
      scene.add(cMesh);
      collidableMeshes.push(cMesh);
    };

    // Helper: Build concrete barricade
    const buildBarrier = (x: number, z: number, rotY: number) => {
      const bGeo = new THREE.BoxGeometry(4.0, 1.4, 0.8);
      const bMat = new THREE.MeshLambertMaterial({ map: concreteTex });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(x, getTerrainHeight(x, z) + 0.7, z);
      bMesh.rotation.y = rotY;
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      scene.add(bMesh);
      collidableMeshes.push(bMesh);
    };

    // Helper: Build military sandbag fortification
    const sandbagTex = TextureGenerator.createWoodPlankTexture();
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x856845, roughness: 0.9 });
    const buildSandbagFortification = (x: number, z: number, rotY: number) => {
      const sbGroup = new THREE.Group();
      sbGroup.position.set(x, getTerrainHeight(x, z), z);
      sbGroup.rotation.y = rotY;

      const bagGeo = new THREE.BoxGeometry(1.2, 0.35, 0.55);
      // Stack 3 layers of sandbags
      for (let layer = 0; layer < 3; layer++) {
        const count = 3;
        for (let b = 0; b < count; b++) {
          const bag = new THREE.Mesh(bagGeo, sandbagMat);
          const offsetX = (b - 1) * 1.15 + (layer % 2 === 1 ? 0.5 : 0);
          bag.position.set(offsetX, 0.2 + layer * 0.32, 0);
          bag.castShadow = true;
          bag.receiveShadow = true;
          sbGroup.add(bag);
          collidableMeshes.push(bag);
        }
      }
      scene.add(sbGroup);
    };

    // Helper: Build military supply crates
    const buildSupplyCrateStack = (x: number, z: number) => {
      const crateGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
      const crateMat = new THREE.MeshLambertMaterial({ map: woodTex });
      const baseHeight = getTerrainHeight(x, z);
      const c1 = new THREE.Mesh(crateGeo, crateMat);
      c1.position.set(x, baseHeight + 0.8, z);
      c1.castShadow = true;
      scene.add(c1);
      collidableMeshes.push(c1);

      const c2 = new THREE.Mesh(crateGeo, crateMat);
      c2.position.set(x + 1.2, baseHeight + 0.8, z + 0.5);
      c2.rotation.y = 0.2;
      c2.castShadow = true;
      scene.add(c2);
      collidableMeshes.push(c2);
    };

    // Populate Key Landmarks:
    // Compound A: Military Base (North-East)
    buildCompoundBuilding(50, -50, 24, 8, 16, 'BASE-A');
    buildCompoundBuilding(80, -50, 16, 7, 20, 'HANGAR-1');
    buildContainer(40, -35, 0.3, containerRedMat);
    buildContainer(46, -35, 0.3, containerBlueMat);
    buildWatchtower(65, -30);
    buildSandbagFortification(61, -30, 0);
    buildSandbagFortification(69, -30, 0);
    buildBarrier(48, -25, 0);
    buildBarrier(54, -25, 0);
    buildSupplyCrateStack(58, -40);

    // Compound B: Industrial Outpost (South-West)
    buildCompoundBuilding(-55, 55, 26, 9, 18, 'FACTORY-B');
    buildCompoundBuilding(-85, 45, 18, 6, 14, 'DEPOT-2');
    buildContainer(-42, 45, -0.4, containerGreenMat);
    buildContainer(-42, 53, -0.4, containerRedMat);
    buildWatchtower(-68, 70);
    buildSandbagFortification(-68, 65, Math.PI / 2);
    buildBarrier(-50, 38, 0.5);
    buildSupplyCrateStack(-60, 48);

    // Compound C: Central Crossroads Depot
    buildCompoundBuilding(-22, -15, 14, 5, 12, 'DEPOT-C');
    buildCompoundBuilding(25, 20, 16, 6, 14, 'ARMORY');
    buildWatchtower(0, 0);
    buildSandbagFortification(0, -4, 0);
    buildSandbagFortification(0, 4, 0);
    buildBarrier(-8, 8, 0.7);
    buildBarrier(8, -8, 0.7);

    // Scatter Pine Trees across forests
    const treeCoords = [
      [-15, -45],
      [-25, -55],
      [-38, -48],
      [-50, -30],
      [-65, -15],
      [-75, -60],
      [15, -75],
      [30, -85],
      [-10, 45],
      [-20, 65],
      [-35, 80],
      [-75, 25],
      [45, 15],
      [60, 30],
      [75, -15],
      [-5, -10],
      [10, -25],
      [-40, 0]
    ];
    treeCoords.forEach(([tx, tz]) => buildPineTree(tx, tz));

    // Atmospheric Battlefield Dust / Wind Drift Particles
    const particleCount = 180;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount * 3; p += 3) {
      pPositions[p] = (Math.random() - 0.5) * 260;
      pPositions[p + 1] = Math.random() * 22 + 0.5;
      pPositions[p + 2] = (Math.random() - 0.5) * 260;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.28,
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

    const stormCylinderGeo = new THREE.CylinderGeometry(130, 130, 60, 48, 1, true);
    const stormMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });
    const stormCylinder = new THREE.Mesh(stormCylinderGeo, stormMat);
    stormCylinder.position.set(0, 30, 0);
    scene.add(stormCylinder);

    // Storm glowing edge ring on the ground
    const ringGeo = new THREE.RingGeometry(129, 131, 48);
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

    // Strategic Loot Points
    const lootSpawnPoints = [
      { id: 'l1', type: 'rifle' as const, name: 'M4A1 Assault Rifle', hex: 0x3b82f6, pos: new THREE.Vector3(0, 0, 12) },
      { id: 'l2', type: 'shield' as const, name: 'Shield Potion (+50)', hex: 0x06b6d4, pos: new THREE.Vector3(-5, 0, 15) },
      { id: 'l3', type: 'medkit' as const, name: 'Medkit (+50 HP)', hex: 0x22c55e, pos: new THREE.Vector3(5, 0, 15) },
      { id: 'l4', type: 'shotgun' as const, name: 'SPAS-12 Shotgun', hex: 0xf59e0b, pos: new THREE.Vector3(42, 0, -28) },
      { id: 'l5', type: 'shield' as const, name: 'Shield Potion (+50)', hex: 0x06b6d4, pos: new THREE.Vector3(56, 0, -22) },
      { id: 'l6', type: 'sniper' as const, name: 'AWM Sniper Rifle', hex: 0xec4899, pos: new THREE.Vector3(0, 10.3, 0) }, // In center watchtower!
      { id: 'l7', type: 'ammo' as const, name: 'Heavy Ammo Pack', hex: 0xf59e0b, pos: new THREE.Vector3(-45, 0, 48) },
      { id: 'l8', type: 'medkit' as const, name: 'Medkit (+50 HP)', hex: 0x22c55e, pos: new THREE.Vector3(-55, 0, 40) },
      { id: 'l9', type: 'sniper' as const, name: 'AWM Sniper Rifle', hex: 0xec4899, pos: new THREE.Vector3(65, 10.3, -30) },
      { id: 'l10', type: 'shield' as const, name: 'Shield Potion (+50)', hex: 0x06b6d4, pos: new THREE.Vector3(-68, 10.3, 70) }
    ];
    lootSpawnPoints.forEach((lp) => createLootPickup(lp.id, lp.type, lp.name, lp.hex, lp.pos));

    // Shared tactical materials and camo skins for high-fidelity soldiers
    const camoWoodlandTex = TextureGenerator.createCamoTexture('woodland');
    const camoUrbanTex = TextureGenerator.createCamoTexture('urban');
    const camoDesertTex = TextureGenerator.createCamoTexture('desert');
    const camoSpecOpsTex = TextureGenerator.createCamoTexture('specops');

    const camoMaterials = [
      new THREE.MeshStandardMaterial({ map: camoWoodlandTex, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: camoUrbanTex, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: camoDesertTex, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: camoSpecOpsTex, roughness: 0.7 })
    ];

    // Shared military gear materials
    const tacticalArmorVestMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.5, metalness: 0.3 });
    const tacticalHelmetMat = new THREE.MeshStandardMaterial({ color: 0x181e29, roughness: 0.4, metalness: 0.4 });
    const tacticalBootMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.8 });
    const tacticalGunMat = new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.3, metalness: 0.8 });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xcca076 });
    const visorCyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const pouchMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
    const backpackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });

    // 8. HEAVY TACTICAL HUMANOID SOLDIER BOTS (Thick Armor, Modular Helmet, Backpack, and Assault Rifle)
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

      // 1. Torso: Heavy Camo Fatigues BDU
      const torsoGeo = new THREE.BoxGeometry(0.62, 0.78, 0.36);
      const torso = new THREE.Mesh(torsoGeo, uniformMat);
      torso.position.y = 1.18;
      torso.castShadow = true;
      botGroup.add(torso);

      // 2. Thick Tactical Plate Carrier Vest (Heavy ceramic front/back plates)
      const vestGeo = new THREE.BoxGeometry(0.68, 0.60, 0.42);
      const vest = new THREE.Mesh(vestGeo, tacticalArmorVestMat);
      vest.position.y = 1.22;
      vest.castShadow = true;
      botGroup.add(vest);

      // Triple MOLLE Ammo Pouches on chest
      for (let p = -1; p <= 1; p++) {
        const pouchGeo = new THREE.BoxGeometry(0.14, 0.18, 0.08);
        const pouch = new THREE.Mesh(pouchGeo, pouchMat);
        pouch.position.set(p * 0.17, 1.16, 0.24);
        pouch.castShadow = true;
        botGroup.add(pouch);
      }

      // Tactical Radio Communicator on shoulder with antenna
      const radioGeo = new THREE.BoxGeometry(0.10, 0.15, 0.08);
      const radio = new THREE.Mesh(radioGeo, tacticalArmorVestMat);
      radio.position.set(-0.24, 1.42, 0.16);
      botGroup.add(radio);

      const antennaGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.28, 4);
      const antenna = new THREE.Mesh(antennaGeo, tacticalGunMat);
      antenna.position.set(-0.24, 1.58, 0.16);
      botGroup.add(antenna);

      // Heavy Military Tactical Backpack / Rucksack on back
      const packGeo = new THREE.BoxGeometry(0.50, 0.54, 0.32);
      const backpack = new THREE.Mesh(packGeo, backpackMat);
      backpack.position.set(0, 1.22, -0.32);
      backpack.castShadow = true;
      botGroup.add(backpack);

      // Bedroll cylinder on top of backpack
      const rollGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.48, 8);
      rollGeo.rotateZ(Math.PI / 2);
      const bedroll = new THREE.Mesh(rollGeo, pouchMat);
      bedroll.position.set(0, 1.52, -0.32);
      botGroup.add(bedroll);

      // 3. Head & FAST Ballistic Helmet
      const headGeo = new THREE.SphereGeometry(0.20, 12, 12);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.74;
      head.castShadow = true;
      botGroup.add(head);

      // Ballistic Combat Helmet Shell
      const helmetGeo = new THREE.SphereGeometry(0.24, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.68);
      const helmet = new THREE.Mesh(helmetGeo, tacticalHelmetMat);
      helmet.position.set(0, 1.78, 0);
      helmet.castShadow = true;
      botGroup.add(helmet);

      // Helmet Ear-Guards / Comms Ear-cups
      const earGeo = new THREE.BoxGeometry(0.08, 0.12, 0.10);
      const leftEar = new THREE.Mesh(earGeo, tacticalArmorVestMat);
      leftEar.position.set(-0.22, 1.74, 0);
      botGroup.add(leftEar);

      const rightEar = new THREE.Mesh(earGeo, tacticalArmorVestMat);
      rightEar.position.set(0.22, 1.74, 0);
      botGroup.add(rightEar);

      // Glowing Tactical Visor / Ballistic Goggles
      const visorGeo = new THREE.BoxGeometry(0.26, 0.08, 0.14);
      const visor = new THREE.Mesh(visorGeo, visorCyanMat);
      visor.position.set(0, 1.75, 0.19);
      botGroup.add(visor);

      // NVG Forehead Mount Bracket
      const nvgMountGeo = new THREE.BoxGeometry(0.08, 0.07, 0.06);
      const nvgMount = new THREE.Mesh(nvgMountGeo, tacticalGunMat);
      nvgMount.position.set(0, 1.86, 0.20);
      botGroup.add(nvgMount);

      // 4. Arms & Thick Tactical Shoulder Pauldrons
      const armGeo = new THREE.CylinderGeometry(0.11, 0.10, 0.68, 8);

      const leftArm = new THREE.Mesh(armGeo, uniformMat);
      leftArm.position.set(-0.40, 1.25, 0.15);
      leftArm.rotation.x = Math.PI / 4;
      leftArm.castShadow = true;
      botGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, uniformMat);
      rightArm.position.set(0.40, 1.25, 0.15);
      rightArm.rotation.x = Math.PI / 4;
      rightArm.castShadow = true;
      botGroup.add(rightArm);

      // Thick Ballistic Shoulder Armor Plates (Left & Right Pauldrons)
      const pauldronGeo = new THREE.BoxGeometry(0.24, 0.20, 0.24);
      const leftPauldron = new THREE.Mesh(pauldronGeo, tacticalArmorVestMat);
      leftPauldron.position.set(-0.42, 1.44, 0.02);
      leftPauldron.castShadow = true;
      botGroup.add(leftPauldron);

      const rightPauldron = new THREE.Mesh(pauldronGeo, tacticalArmorVestMat);
      rightPauldron.position.set(0.42, 1.44, 0.02);
      rightPauldron.castShadow = true;
      botGroup.add(rightPauldron);

      // Ballistic Elbow Armor Pads
      const elbowGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 6);
      const lElbow = new THREE.Mesh(elbowGeo, tacticalArmorVestMat);
      lElbow.position.set(-0.40, 1.18, 0.15);
      botGroup.add(lElbow);

      const rElbow = new THREE.Mesh(elbowGeo, tacticalArmorVestMat);
      rElbow.position.set(0.40, 1.18, 0.15);
      botGroup.add(rElbow);

      // Tactical Gloves Gripping the Weapon
      const gloveGeo = new THREE.BoxGeometry(0.15, 0.15, 0.16);
      const lGlove = new THREE.Mesh(gloveGeo, tacticalArmorVestMat);
      lGlove.position.set(-0.28, 1.05, 0.40);
      botGroup.add(lGlove);

      const rGlove = new THREE.Mesh(gloveGeo, tacticalArmorVestMat);
      rGlove.position.set(0.25, 1.08, 0.38);
      botGroup.add(rGlove);

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

      botGroup.add(rifleGroup);

      // 6. Legs & Reinforced Knee Armor Guards
      const legGeo = new THREE.CylinderGeometry(0.14, 0.13, 0.75, 8);
      const leftLeg = new THREE.Mesh(legGeo, uniformMat);
      leftLeg.position.set(-0.20, 0.45, 0);
      leftLeg.castShadow = true;
      botGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, uniformMat);
      rightLeg.position.set(0.20, 0.45, 0);
      rightLeg.castShadow = true;
      botGroup.add(rightLeg);

      // Heavy Ballistic Knee Armor Plates
      const kneeGeo = new THREE.BoxGeometry(0.22, 0.18, 0.14);
      const lKnee = new THREE.Mesh(kneeGeo, tacticalArmorVestMat);
      lKnee.position.set(-0.20, 0.42, 0.10);
      botGroup.add(lKnee);

      const rKnee = new THREE.Mesh(kneeGeo, tacticalArmorVestMat);
      rKnee.position.set(0.20, 0.42, 0.10);
      botGroup.add(rKnee);

      // Tactical Drop-Leg Pistol Holster on right thigh
      const holsterGeo = new THREE.BoxGeometry(0.12, 0.20, 0.14);
      const holster = new THREE.Mesh(holsterGeo, tacticalArmorVestMat);
      holster.position.set(0.32, 0.52, 0.02);
      botGroup.add(holster);

      // Utility Canteen Pouch on left hip
      const canteenGeo = new THREE.BoxGeometry(0.14, 0.16, 0.12);
      const canteen = new THREE.Mesh(canteenGeo, pouchMat);
      canteen.position.set(-0.32, 0.78, 0.02);
      botGroup.add(canteen);

      // 7. Thick Military Combat Assault Boots
      const bootGeo = new THREE.BoxGeometry(0.24, 0.22, 0.34);
      const lBoot = new THREE.Mesh(bootGeo, tacticalBootMat);
      lBoot.position.set(-0.20, 0.11, 0.06);
      lBoot.castShadow = true;
      botGroup.add(lBoot);

      const rBoot = new THREE.Mesh(bootGeo, tacticalBootMat);
      rBoot.position.set(0.20, 0.11, 0.06);
      rBoot.castShadow = true;
      botGroup.add(rBoot);

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

    // Spawn 14 Combat Bots across the map (Positioned safely away from player drop zone at 0, 20)
    const bots: HumanoidEnemy[] = [];
    const botRosterConfig = [
      { id: 'b1', name: 'Bot_Ghost', x: 55, z: -45, wps: [new THREE.Vector3(55, 0, -45), new THREE.Vector3(75, 0, -45), new THREE.Vector3(65, 0, -30)] },
      { id: 'b2', name: 'Bot_Viper', x: 42, z: -25, wps: [new THREE.Vector3(42, 0, -25), new THREE.Vector3(50, 0, -15), new THREE.Vector3(35, 0, -25)] },
      { id: 'b3', name: 'Bot_Recon', x: -50, z: 50, wps: [new THREE.Vector3(-50, 0, 50), new THREE.Vector3(-70, 0, 50), new THREE.Vector3(-60, 0, 65)] },
      { id: 'b4', name: 'Bot_Titan', x: -40, z: 35, wps: [new THREE.Vector3(-40, 0, 35), new THREE.Vector3(-55, 0, 35), new THREE.Vector3(-45, 0, 45)] },
      { id: 'b5', name: 'Bot_Apex', x: 38, z: 48, wps: [new THREE.Vector3(38, 0, 48), new THREE.Vector3(48, 0, 38), new THREE.Vector3(35, 0, 58)] },
      { id: 'b6', name: 'Bot_Raven', x: -30, z: -25, wps: [new THREE.Vector3(-30, 0, -25), new THREE.Vector3(-20, 0, -35), new THREE.Vector3(-40, 0, -25)] },
      { id: 'b7', name: 'Bot_Cobra', x: 80, z: 45, wps: [new THREE.Vector3(80, 0, 45), new THREE.Vector3(70, 0, 60), new THREE.Vector3(60, 0, 35)] },
      { id: 'b8', name: 'Bot_Echo', x: -75, z: -55, wps: [new THREE.Vector3(-75, 0, -55), new THREE.Vector3(-60, 0, -45), new THREE.Vector3(-80, 0, -35)] },
      { id: 'b9', name: 'Bot_Shadow', x: 30, z: -75, wps: [new THREE.Vector3(30, 0, -75), new THREE.Vector3(15, 0, -65), new THREE.Vector3(45, 0, -60)] },
      { id: 'b10', name: 'Bot_Hunter', x: -25, z: 75, wps: [new THREE.Vector3(-25, 0, 75), new THREE.Vector3(-10, 0, 65), new THREE.Vector3(-40, 0, 70)] },
      { id: 'b11', name: 'Bot_Slayer', x: -65, z: 5, wps: [new THREE.Vector3(-65, 0, 5), new THREE.Vector3(-55, 0, -10), new THREE.Vector3(-75, 0, 15)] },
      { id: 'b12', name: 'Bot_Strike', x: 65, z: 5, wps: [new THREE.Vector3(65, 0, 5), new THREE.Vector3(75, 0, 15), new THREE.Vector3(55, 0, -10)] },
      { id: 'b13', name: 'Bot_Blaze', x: 18, z: -48, wps: [new THREE.Vector3(18, 0, -48), new THREE.Vector3(28, 0, -58), new THREE.Vector3(8, 0, -42)] },
      { id: 'b14', name: 'Bot_Frost', x: -38, z: -20, wps: [new THREE.Vector3(-38, 0, -20), new THREE.Vector3(-28, 0, -30), new THREE.Vector3(-48, 0, -15)] }
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
    const rBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });
    const rBody = new THREE.Mesh(rBodyGeo, rBodyMat);
    rifleMeshGroup.add(rBody);

    const rBarrelGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.35, 8);
    const rBarrelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
    const rBarrel = new THREE.Mesh(rBarrelGeo, rBarrelMat);
    rBarrel.rotation.x = Math.PI / 2;
    rBarrel.position.set(0, 0.02, -0.42);
    rifleMeshGroup.add(rBarrel);

    // Magazine
    const rMagGeo = new THREE.BoxGeometry(0.045, 0.2, 0.1);
    const rMagMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
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
    let isGrounded = true;

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
            // Hit scenery or terrain
            spawnImpactSparks(hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0), 0xfef08a);
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
          scene.remove(tracers[i].line);
          tracers.splice(i, 1);
        }
      }

      // Update impact spark particles
      for (let i = impactSparks.length - 1; i >= 0; i--) {
        const spark = impactSparks[i];
        const elapsed = now - spark.startTime;
        if (elapsed > spark.duration) {
          scene.remove(spark.mesh);
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
      const targetSpeed = isSprinting ? stateRef.current.settings.sprintSpeed : stateRef.current.settings.walkSpeed;

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

      if (inputDir.lengthSq() > 0.01) {
        inputDir.normalize().multiplyScalar(targetSpeed);
      }

      // Smooth velocity interpolation (acceleration & damping)
      stateRef.current.playerVelocity.lerp(inputDir, delta * 12);
      camera.position.add(stateRef.current.playerVelocity.clone().multiplyScalar(delta));
      stateRef.current.playerPosition.copy(camera.position);

      // Weapon Bobbing
      if (stateRef.current.playerVelocity.lengthSq() > 0.5) {
        const bobSpeed = isSprinting ? 14 : 9;
        const bobAmount = isSprinting ? 0.03 : 0.015;
        weaponHolder.position.y = -0.22 + Math.sin(now * 0.001 * bobSpeed) * bobAmount;
        weaponHolder.position.x = 0.26 + Math.cos(now * 0.001 * (bobSpeed / 2)) * (bobAmount * 0.6);
      } else {
        weaponHolder.position.set(0.26, -0.22, -0.45);
      }

      // Jump & Gravity with strict terrain height clamping (prevents player sinking into ground)
      const currentGroundY = getTerrainHeight(camera.position.x, camera.position.z);
      const eyeHeight = 1.85;
      const minCameraY = currentGroundY + eyeHeight;

      if (isGrounded) {
        if (keys['Space'] || vInput.jump) {
          verticalVelocity = Math.sqrt(2 * stateRef.current.settings.jumpHeight * stateRef.current.settings.gravity);
          isGrounded = false;
          vInput.jump = false;
          sounds.playJump();
        } else {
          // Firmly clamp camera to eye height on ground surface
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
        }
      }

      // Restrict player inside battlefield island boundaries
      const playerDist = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
      if (playerDist > 125) {
        camera.position.x = (camera.position.x / playerDist) * 125;
        camera.position.z = (camera.position.z / playerDist) * 125;
      }

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
        const targetRadius = Math.max(18, 130 - currentPhase * 28);
        stateRef.current.stormRadius = THREE.MathUtils.lerp(stateRef.current.stormRadius, targetRadius, delta * 0.15);
        stormCylinder.scale.set(stateRef.current.stormRadius / 130, 1, stateRef.current.stormRadius / 130);
        stormRing.scale.set(stateRef.current.stormRadius / 130, 1, stateRef.current.stormRadius / 130);
      }

      // Distance from center & safe zone check
      const playerDistFromCenter = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
      setDistanceToSafeCenter(Math.round(playerDistFromCenter));
      const isSafe = playerDistFromCenter <= stateRef.current.stormRadius;
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

        if (distToPlayer <= stateRef.current.settings.detectionRadius) {
          bot.state = distToPlayer <= stateRef.current.settings.attackRange ? 'Attack' : 'Chase';
        } else if (distToPlayer > stateRef.current.settings.detectionRadius * 1.5) {
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
          const radarScale = 0.55; // 1 world meter = 0.55 radar pixels

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

      renderer.render(scene, camera);
    };

    const triggerGameOver = (killerName: string) => {
      stateRef.current.isGameOver = true;
      setIsGameOver(true);
      document.exitPointerLock?.();
    };

    // Match Reset Function
    const resetMatch = () => {
      camera.position.set(0, getTerrainHeight(0, 20) + 1.85, 20);
      yaw = 0;
      pitch = 0;
      targetYaw = 0;
      targetPitch = 0;
      camera.rotation.set(0, 0, 0, 'YXZ');
      verticalVelocity = 0;
      isGrounded = true;

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
      ref={containerRef}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

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

      {/* HUD OVERLAY */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 z-20 text-white">
        {/* TOP BAR: Radar + Objective Guidance + Match Status + Controls */}
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          {/* Top-Left: Tactical Radar Mini-Map */}
          <div className="flex items-start gap-2 pointer-events-auto">
            <div className="relative bg-slate-950/80 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center">
              <canvas ref={radarCanvasRef} width={100} height={100} className="w-[80px] h-[80px] sm:w-[120px] sm:h-[120px] rounded-xl block" />
              <div className="mt-0.5 text-[9px] sm:text-[10px] font-mono font-bold flex items-center gap-1 text-slate-300">
                <Navigation className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />
                <span>{isInsideSafeZone ? `SAFE (${distanceToSafeCenter}m)` : `ZONE!`}</span>
              </div>
            </div>
          </div>

          {/* Top-Center: Active Objective & Dynamic Tips Banner */}
          <div className="hidden sm:flex flex-1 max-w-xl flex-col items-center gap-1.5">
            {/* Compass Ribbon */}
            <div className="bg-slate-950/80 backdrop-blur-md px-3.5 py-1 rounded-xl border border-slate-800 shadow-lg flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
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

              {/* Storm Safe Zone Phase Clock */}
              <div className={`px-2 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-mono font-bold flex items-center gap-1.5 ${
                isInsideSafeZone
                  ? 'bg-slate-900 border-slate-700 text-slate-300'
                  : 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
              }`}>
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>
                  {isStormShrinking ? 'STORM: ' : `PHASE ${stormPhase}: `}
                  {Math.floor(stormTimer / 60)}:{(stormTimer % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Contextual Tactical Tip / Goal */}
            <div className="bg-slate-950/90 backdrop-blur-md border border-indigo-500/40 px-3 py-0.5 rounded-full text-[11px] font-mono font-medium text-slate-200 shadow-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>{activeObjectiveTip}</span>
            </div>
          </div>

          {/* Top-Right: Telemetry + Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            {/* Alive & Kills */}
            <div className="bg-slate-950/80 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2 shadow-lg">
              <div className="text-xs font-mono font-bold">
                <span className="text-slate-400 mr-1 text-[10px] sm:text-[11px]">ALIVE</span>
                <span className="text-emerald-400 text-xs sm:text-sm font-black">{playersAlive}</span>
              </div>
              <div className="w-[1px] h-3 bg-slate-700" />
              <div className="text-xs font-mono font-bold flex items-center gap-1">
                <Skull className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-white text-xs sm:text-sm font-black">{playerKills}</span>
              </div>
            </div>

            {/* Pause / Resume Button */}
            {hasStartedPlaying && !isGameOver && !isVictory && (
              <button
                id="btn-toggle-pause"
                onClick={togglePauseMatch}
                className={`p-1.5 sm:p-2 rounded-xl border text-xs font-mono transition-all shadow-lg flex items-center gap-1 cursor-pointer ${
                  isMatchPaused
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
                title={isMatchPaused ? 'Resume Match' : 'Pause Match'}
              >
                {isMatchPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              id="btn-toggle-fullscreen"
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors shadow-lg cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            {/* Auto-Rotate / Landscape Orientation Lock */}
            <button
              id="btn-toggle-auto-rotate"
              onClick={handleAutoRotateLandscape}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors shadow-lg cursor-pointer flex items-center gap-1 active:scale-95"
              title="Auto-Rotate to Fullscreen Landscape"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline text-[10px] font-mono">ROTATE</span>
            </button>

            {/* C# Unity Scripts & Setup Guide Modal Toggle */}
            {onOpenStudio && (
              <button
                id="btn-open-studio-header"
                onClick={onOpenStudio}
                className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono transition-colors shadow-lg items-center gap-1 cursor-pointer"
                title="View Unity C# Scripts & Documentation"
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>SCRIPTS</span>
              </button>
            )}

            {/* Guide Button */}
            <button
              id="btn-open-game-guide"
              onClick={() => setShowGuideModal(true)}
              className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold font-mono transition-all items-center gap-1 shadow-lg border border-indigo-500 cursor-pointer"
              title="How to Play"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>GUIDE</span>
            </button>

            {/* On-Screen Controls Toggle */}
            <button
              id="btn-toggle-touch-controls"
              onClick={() => setShowOnScreenControls(!showOnScreenControls)}
              className={`p-1.5 sm:p-2 rounded-xl border text-xs font-mono transition-all shadow-lg flex items-center gap-1 cursor-pointer ${
                showOnScreenControls
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
              title="Toggle Mobile Controls"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
            </button>

            {/* Sound Mute Toggle */}
            <button
              id="btn-toggle-sound"
              onClick={() => setIsSoundMuted(!isSoundMuted)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors shadow-lg cursor-pointer"
              title={isSoundMuted ? 'Unmute SFX' : 'Mute SFX'}
            >
              {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Dynamic Kill Feed */}
        <div className="absolute top-16 sm:top-20 right-2.5 sm:right-4 flex flex-col gap-1 z-15 pointer-events-none max-w-[200px] sm:max-w-xs">
          {killFeed.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="bg-slate-950/80 border border-slate-800 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-mono flex items-center gap-1 shadow-md"
            >
              <span className={`font-bold ${item.killer === 'You' ? 'text-emerald-400' : 'text-slate-200'}`}>
                {item.killer}
              </span>
              <span className="text-slate-500">[{item.weapon}]</span>
              <span className="text-rose-400 font-semibold">{item.victim}</span>
            </div>
          ))}
        </div>

        {/* Center Crosshair & High-Clarity Hitmarker */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {(!isAimingDownSights || activeWeaponType !== 'sniper') && (
            <div className="relative w-7 h-7 flex items-center justify-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 border border-black/80" />
              <div className="absolute top-0 w-0.5 h-2 bg-white border-x border-black/80" />
              <div className="absolute bottom-0 w-0.5 h-2 bg-white border-x border-black/80" />
              <div className="absolute left-0 h-0.5 w-2 bg-white border-y border-black/80" />
              <div className="absolute right-0 h-0.5 w-2 bg-white border-y border-black/80" />
            </div>
          )}

          {/* Full Military Precision Sniper Scope Overlay (Active when ADS with Sniper) */}
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
          <div className="self-center bg-slate-900/95 border border-indigo-500 px-4 py-1.5 rounded-xl shadow-2xl text-xs font-mono font-bold text-white flex items-center gap-2 animate-bounce">
            <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[11px] font-black">E</span>
            <span>{nearbyLootPrompt}</span>
          </div>
        )}

        {/* Desktop Pointer Lock Prompt (Only shown on non-touch devices) */}
        {hasStartedPlaying && !isPointerLocked && !isMatchPaused && !isGameOver && !isVictory && !isTouchDevice && (
          <div
            onClick={() => canvasRef.current?.requestPointerLock()}
            className="self-center bg-indigo-600/90 hover:bg-indigo-600 text-white font-mono text-xs font-bold px-4 py-1.5 rounded-xl shadow-xl border border-indigo-400 cursor-pointer pointer-events-auto flex items-center gap-2 animate-pulse"
          >
            <Crosshair className="w-4 h-4" />
            <span>Click screen to lock mouse & aim</span>
          </div>
        )}

        {/* MOBILE & VIRTUAL CONTROLS OVERLAY (When enabled) */}
        {showOnScreenControls && hasStartedPlaying && !isMatchPaused && !isGameOver && !isVictory && (
          <div className="w-full flex items-end justify-between pointer-events-auto pb-1 select-none z-20">
            {/* Left: Virtual Analog Joystick with Sprint */}
            <div className="flex flex-col items-center select-none pointer-events-auto">
              <div
                id="mobile-virtual-joystick"
                className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 transition-colors flex items-center justify-center backdrop-blur-md shadow-2xl touch-none ${
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
                <span className="absolute top-1 text-[9px] text-slate-500 font-mono">▲</span>
                <span className="absolute bottom-1 text-[9px] text-slate-500 font-mono">▼</span>
                <span className="absolute left-1.5 text-[9px] text-slate-500 font-mono">◀</span>
                <span className="absolute right-1.5 text-[9px] text-slate-500 font-mono">▶</span>

                {/* Joystick Knob */}
                <div
                  className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-[10px] font-bold transition-transform duration-75 border border-white/40 ${
                    isJoystickActive
                      ? 'bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white shadow-indigo-500/50 scale-105'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                  style={{
                    transform: `translate(${joystickKnobPos.x}px, ${joystickKnobPos.y}px)`
                  }}
                >
                  <Move className="w-4 h-4 text-white/90" />
                </div>
              </div>

              {/* Sprint Toggle */}
              <button
                id="btn-mobile-sprint"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  virtualInputRef.current.sprint = !virtualInputRef.current.sprint;
                }}
                onClick={() => {
                  virtualInputRef.current.sprint = !virtualInputRef.current.sprint;
                }}
                className={`mt-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                  virtualInputRef.current.sprint
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                    : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>SPRINT</span>
              </button>
            </div>

            {/* Right: Mobile Action Buttons Cluster */}
            <div className="flex items-end gap-2 sm:gap-3 pointer-events-auto select-none">
              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {/* Loot */}
                <button
                  id="btn-mobile-loot"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    pickupLootRef.current?.();
                  }}
                  onClick={() => pickupLootRef.current?.()}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex flex-col items-center justify-center font-bold text-[10px] shadow-lg border transition-all cursor-pointer ${
                    nearbyLootPrompt
                      ? 'bg-indigo-600 text-white border-indigo-400 animate-bounce'
                      : 'bg-slate-900/85 text-slate-300 border-slate-700 active:bg-indigo-600'
                  }`}
                  title="Loot [E]"
                >
                  <Target className="w-3.5 h-3.5 mb-0.5 text-indigo-400" />
                  <span>LOOT [E]</span>
                </button>

                {/* Reload */}
                <button
                  id="btn-mobile-reload"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    reloadWeaponRef.current?.();
                  }}
                  onClick={() => reloadWeaponRef.current?.()}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-900/85 hover:bg-slate-800 active:bg-amber-600 text-slate-200 font-bold text-[10px] flex flex-col items-center justify-center border border-slate-700 shadow-lg cursor-pointer"
                  title="Reload [R]"
                >
                  <RotateCcw className="w-3.5 h-3.5 mb-0.5 text-amber-400" />
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
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-900/85 hover:bg-slate-800 active:bg-emerald-600 text-slate-200 font-bold text-[10px] flex flex-col items-center justify-center border border-slate-700 shadow-lg cursor-pointer"
                  title="Jump"
                >
                  <span className="text-emerald-400 font-black text-xs">▲</span>
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
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex flex-col items-center justify-center font-bold text-[10px] border shadow-lg transition-all cursor-pointer ${
                    isAimingDownSights
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black'
                      : 'bg-slate-900/85 text-slate-200 border-slate-700 active:bg-cyan-600'
                  }`}
                  title="Aim Down Sights (Zoom)"
                >
                  <Crosshair className="w-3.5 h-3.5 mb-0.5 text-cyan-400" />
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
                onMouseDown={() => {
                  stateRef.current.isFiringContinuous = true;
                  shootWeaponRef.current?.();
                }}
                onMouseUp={() => {
                  stateRef.current.isFiringContinuous = false;
                }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 active:from-rose-700 active:to-red-600 text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center border-2 border-red-300 shadow-2xl shadow-rose-600/50 active:scale-95 transition-transform select-none touch-none cursor-pointer"
                title="Fire Weapon"
              >
                <span className="text-base sm:text-lg">🔥</span>
                <span className="tracking-tight text-[11px] sm:text-xs">FIRE</span>
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM HUD: Vitality Bars + Mouse Sens + Weapon Slots + Ammo */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-2 sm:gap-4">
          {/* Health & Shield Vitality Bars */}
          <div className="bg-slate-950/85 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-slate-800 shadow-xl max-w-full sm:max-w-xs w-full space-y-1.5 pointer-events-auto">
            {/* Shield Bar (Cyan) */}
            <div>
              <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-mono font-bold mb-0.5">
                <span className="text-cyan-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> SHIELD
                </span>
                <span className="text-slate-300">{playerShield} / 100</span>
              </div>
              <div className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-150"
                  style={{ width: `${Math.max(0, playerShield)}%` }}
                />
              </div>
            </div>

            {/* Health Bar (Green) */}
            <div>
              <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-mono font-bold mb-0.5">
                <span className="text-emerald-400 flex items-center gap-1">
                  <Heart className="w-3 h-3" /> HEALTH
                </span>
                <span className="text-slate-300">{playerHealth} / 100</span>
              </div>
              <div className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    playerHealth > 30 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                  }`}
                  style={{ width: `${Math.max(0, playerHealth)}%` }}
                />
              </div>
            </div>

            {/* Quick Sensitivity Control */}
            <div className="pt-1 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-400 border-t border-slate-800/80">
              <span className="flex items-center gap-1">
                <Sliders className="w-2.5 h-2.5" /> Sens: {mouseSensitivity}x
              </span>
              <input
                type="range"
                min="0.8"
                max="4.0"
                step="0.2"
                value={mouseSensitivity}
                onChange={(e) => setMouseSensitivity(parseFloat(e.target.value))}
                className="w-20 sm:w-24 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Weapon Slots & Active Ammunition */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pointer-events-auto">
            {/* Weapon Slots Selector */}
            <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border border-slate-800 shadow-xl font-mono text-xs">
              {(['rifle', 'shotgun', 'sniper'] as WeaponType[]).map((wType, idx) => {
                const w = WEAPONS_CATALOG[wType];
                const isActive = activeWeaponType === wType;
                return (
                  <button
                    key={wType}
                    onClick={() => {
                      const newW = WEAPONS_CATALOG[wType];
                      stateRef.current.activeWeapon = newW;
                      setActiveWeaponType(wType);
                      const ammoState = stateRef.current.ammoByWeapon[wType];
                      setCurrentAmmo(ammoState.current);
                      setReserveAmmo(ammoState.reserve);
                    }}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-[10px] opacity-75">[{idx + 1}]</span>
                    <span className="text-xs">{w.iconName}</span>
                  </button>
                );
              })}
            </div>

            {/* Ammo Counter Box */}
            <div className="bg-slate-950/85 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-slate-800 shadow-xl min-w-[100px] sm:min-w-[130px] text-right font-mono">
              <div className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5 truncate">
                {WEAPONS_CATALOG[activeWeaponType].name}
              </div>
              <div className="text-xl sm:text-2xl font-black text-white flex items-baseline justify-end gap-1">
                <span className={currentAmmo <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'}>
                  {isReloading ? 'RELOAD' : currentAmmo}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500">/ {reserveAmmo}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* START OVERLAY: Enter Battle Royale Arena (Explicit button start, NO auto-start) */}
      {!hasStartedPlaying && !isGameOver && !isVictory && (
        <div
          id="click-to-play-overlay"
          className="absolute inset-0 bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 sm:p-6 z-30 overflow-y-auto select-none"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white mb-3 shadow-xl shadow-indigo-600/30">
            <Radio className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-[11px] font-mono font-bold text-cyan-300 mb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>BATTLE ROYALE • 3D ACTION</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-black text-white mb-2 tracking-wide font-mono">
            WARZONE BATTLE ROYALE
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-4 sm:mb-6 leading-relaxed">
            15 combatants deployed to the island. Scavenge high-tier weapons, outrun the shrinking storm, and fight to be the last survivor standing!
          </p>

          {/* Controls Instructions Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full text-xs font-mono mb-5 text-left">
            <div className="bg-slate-900/90 border border-indigo-500/30 p-2.5 rounded-xl">
              <span className="text-indigo-400 font-bold flex items-center gap-1 mb-1">
                <Smartphone className="w-3.5 h-3.5" /> Mobile Controls
              </span>
              <p className="text-[11px] text-slate-300 leading-tight">
                Use left-hand <span className="text-white font-bold">Virtual Joystick</span> to move • <span className="text-white font-bold">Swipe</span> screen right to aim • Press <span className="text-rose-400 font-bold">🔥 FIRE</span> to shoot.
              </p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-amber-400 font-bold flex items-center gap-1 mb-1">
                <Gamepad2 className="w-3.5 h-3.5" /> Desktop Controls (PC)
              </span>
              <p className="text-[11px] text-slate-300 leading-tight">
                <span className="text-white font-bold">WASD</span> to walk • <span className="text-white font-bold">Mouse</span> to aim • <span className="text-amber-400 font-bold">Left Click</span> shoot • <span className="text-cyan-400 font-bold">Right Click</span> zoom • <span className="text-indigo-400 font-bold">E</span> loot.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              id="btn-enter-battle-royale"
              onClick={handleStartMatch}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:brightness-110 text-white font-black text-sm sm:text-base transition-all shadow-xl shadow-indigo-600/40 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>DEPLOY TO ARENA</span>
            </button>

            {isPortrait && (
              <button
                id="btn-start-auto-rotate"
                onClick={handleAutoRotateLandscape}
                className="px-5 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-xs font-bold transition-all border border-amber-500/40 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <RotateCw className="w-4 h-4 text-amber-400" />
                <span>ROTATE TO LANDSCAPE</span>
              </button>
            )}

            <button
              id="btn-open-guide-from-start"
              onClick={() => setShowGuideModal(true)}
              className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>HOW TO PLAY GUIDE</span>
            </button>
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

            <button
              id="btn-guide-from-pause"
              onClick={() => setShowGuideModal(true)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>HOW TO PLAY GUIDE</span>
            </button>

            {onOpenStudio && (
              <button
                id="btn-studio-from-pause"
                onClick={onOpenStudio}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>UNITY C# SCRIPTS & ASSETS</span>
              </button>
            )}
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
