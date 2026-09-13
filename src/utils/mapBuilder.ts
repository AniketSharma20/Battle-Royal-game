import * as THREE from 'three';
import { TextureGenerator } from './textureGenerator';
import { POILocation } from '../types';

export interface ExplosiveBarrelInstance {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  exploded: boolean;
}

export interface JumpPadInstance {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  force: number;
  lastUsedTime: number;
}

export interface MapBuildResult {
  terrain: THREE.Mesh;
  collidableMeshes: THREE.Object3D[];
  interactiveBarrels: ExplosiveBarrelInstance[];
  jumpPads: JumpPadInstance[];
  pois: POILocation[];
  getTerrainHeight: (x: number, z: number) => number;
}

export class MapBuilder {
  static readonly MAP_SIZE = 1000;

  // Analytical terrain height mapping
  static getTerrainHeight(x: number, z: number): number {
    const dist = Math.sqrt(x * x + z * z);

    // River canal cutting roughly from (-110, -400) to (-90, 400)
    const riverCenterX = -100 + Math.sin(z * 0.01) * 24;
    const distToRiver = Math.abs(x - riverCenterX);

    // River bed depression (unless near the bridge at z ~ 0)
    if (distToRiver < 28 && Math.abs(z) > 36) {
      const riverDepth = Math.cos((distToRiver / 28) * (Math.PI / 2)) * 5;
      return -riverDepth;
    }

    // Sniper peak elevated plateau at (240, -240)
    const distToPeak = Math.sqrt((x - 240) ** 2 + (z + 240) ** 2);
    if (distToPeak < 90) {
      const t = 1 - distToPeak / 90;
      return t * t * (3 - 2 * t) * 22;
    }

    // Central Town (radius <= 180) is perfectly flat level ground for high-speed combat
    if (dist <= 180) {
      return 0;
    }

    // Rolling tactical hills transition
    if (dist <= 340) {
      const t = (dist - 180) / 160;
      const smoothT = t * t * (3 - 2 * t);
      const hillH = (Math.sin(x * 0.02) * Math.cos(z * 0.02)) * 7.0 + Math.sin(x * 0.01) * 4.0;
      return Math.max(0, hillH * smoothT);
    }

    // Outer Mountain Foothills
    const rim = dist - 340;
    return 6.0 + Math.pow(rim * 0.06, 1.9) + (Math.sin(x * 0.03) + Math.cos(z * 0.03)) * 5.0;
  }

  static buildMap(scene: THREE.Scene, isMobileDevice: boolean): MapBuildResult {
    const collidableMeshes: THREE.Object3D[] = [];
    const interactiveBarrels: ExplosiveBarrelInstance[] = [];
    const jumpPads: JumpPadInstance[] = [];

    const pois: POILocation[] = [
      { name: 'CENTRAL PLAZA', x: 0, z: 0, color: '#38bdf8', description: 'Urban ruins with 2-story buildings and high-tier ground loot' },
      { name: 'AIRFIELD RUNWAY', x: -280, z: -80, color: '#f59e0b', description: 'Long airstrip, aircraft hangars, and radar tower' },
      { name: 'CITADEL BARRACKS', x: 60, z: -280, color: '#ef4444', description: 'Fortified command bunker with rooftop helipad' },
      { name: 'CARGO TERMINAL', x: 280, z: 80, color: '#10b981', description: 'Industrial container shipping yard with gantry crane' },
      { name: 'RADIO RELAY', x: 240, z: -240, color: '#ec4899', description: 'High-altitude sniper ridge overlooking the valley' },
      { name: 'LUMBER OUTPOST', x: -240, z: 240, color: '#84cc16', description: 'Dense pine forest outpost with log cabins' }
    ];

    // 1. TERRAIN MESH WITH PROCEDURAL DETAIL TEXTURE
    const grassTex = TextureGenerator.createGrassTexture();
    const terrainGeo = new THREE.PlaneGeometry(this.MAP_SIZE, this.MAP_SIZE, isMobileDevice ? 64 : 96, isMobileDevice ? 64 : 96);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      posAttr.setY(i, this.getTerrainHeight(x, z));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshLambertMaterial({ map: grassTex });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Bedrock slab foundation
    const bedrockGeo = new THREE.BoxGeometry(this.MAP_SIZE + 4, 25, this.MAP_SIZE + 4);
    const bedrockMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
    const bedrock = new THREE.Mesh(bedrockGeo, bedrockMat);
    bedrock.position.set(0, -12.51, 0);
    scene.add(bedrock);

    // 2. FLOWING WATER CANAL / RIVER
    const waterGeo = new THREE.PlaneGeometry(56, 800);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.78
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(-100, -0.6, 0);
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);

    // 3. RIVER MILITARY TRUSS BRIDGE at (-100, 0)
    const buildRiverBridge = () => {
      const bridgeGroup = new THREE.Group();
      bridgeGroup.position.set(-100, 0.1, 0);

      // Road deck
      const deckGeo = new THREE.BoxGeometry(14, 0.6, 32);
      const deckMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      const deck = new THREE.Mesh(deckGeo, deckMat);
      deck.castShadow = true;
      deck.receiveShadow = true;
      bridgeGroup.add(deck);
      collidableMeshes.push(deck);

      // Steel arch trusses on both sides
      const trussMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
      [-6.5, 6.5].forEach((tx) => {
        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 32), trussMat);
        topBeam.position.set(tx, 4.5, 0);
        bridgeGroup.add(topBeam);

        // Vertical and diagonal struts
        for (let sz = -14; sz <= 14; sz += 7) {
          const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.5, 6), trussMat);
          strut.position.set(tx, 2.25, sz);
          bridgeGroup.add(strut);
        }
      });

      scene.add(bridgeGroup);
    };
    buildRiverBridge();

    // 4. COMMON TEXTURES & MATERIALS
    const concreteTex = TextureGenerator.createConcreteWallTexture('#64748b');
    const containerRedTex = TextureGenerator.createContainerTexture('#991b1b', 'SECTOR 01');
    const containerBlueTex = TextureGenerator.createContainerTexture('#1e40af', 'SUPPLY // A');
    const containerGreenTex = TextureGenerator.createContainerTexture('#166534', 'CARGO // 09');
    const woodTex = TextureGenerator.createWoodPlankTexture();
    const hazardTex = TextureGenerator.createHazardStripeTexture();
    const barrelTex = TextureGenerator.createExplosiveBarrelTexture();
    const jumpPadTex = TextureGenerator.createJumpPadTexture();
    const runwayTex = TextureGenerator.createRunwayTexture();
    const roadTex = TextureGenerator.createRoadTexture();

    const concreteMat = new THREE.MeshLambertMaterial({ map: concreteTex });
    const containerRedMat = new THREE.MeshLambertMaterial({ map: containerRedTex });
    const containerBlueMat = new THREE.MeshLambertMaterial({ map: containerBlueTex });
    const containerGreenMat = new THREE.MeshLambertMaterial({ map: containerGreenTex });
    const barrelMat = new THREE.MeshLambertMaterial({ map: barrelTex });
    const jumpPadMat = new THREE.MeshBasicMaterial({ map: jumpPadTex });
    const darkSteelMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const yellowCraneMat = new THREE.MeshLambertMaterial({ color: 0xeab308 });

    // Helper: Build Explosive Fuel Barrel
    const buildExplosiveBarrel = (id: string, x: number, z: number) => {
      const bGroup = new THREE.Group();
      const groundY = this.getTerrainHeight(x, z);
      bGroup.position.set(x, groundY, z);

      const bGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 12);
      const bMesh = new THREE.Mesh(bGeo, barrelMat);
      bMesh.position.y = 0.7;
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      bGroup.add(bMesh);

      // Glowing Danger Light on Top
      const lightGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
      const lightMesh = new THREE.Mesh(lightGeo, lightMat);
      lightMesh.position.y = 1.45;
      bGroup.add(lightMesh);

      scene.add(bGroup);
      collidableMeshes.push(bMesh);

      interactiveBarrels.push({
        id,
        mesh: bGroup,
        position: new THREE.Vector3(x, groundY + 0.7, z),
        health: 40,
        maxHealth: 40,
        exploded: false
      });
    };

    // Helper: Build Interactive Sci-Fi Jump Pad
    const buildJumpPad = (id: string, x: number, z: number, force = 22) => {
      const padGroup = new THREE.Group();
      const groundY = this.getTerrainHeight(x, z);
      padGroup.position.set(x, groundY, z);

      // Octagonal Base Platform
      const baseGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.4, 8);
      const baseMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.2;
      padGroup.add(baseMesh);

      // Glowing Cyan Jump Surface Disc
      const padGeo = new THREE.CylinderGeometry(2.0, 2.0, 0.1, 16);
      const padMesh = new THREE.Mesh(padGeo, jumpPadMat);
      padMesh.position.y = 0.41;
      padGroup.add(padMesh);

      // Ambient Cyan Point Light
      const pLight = new THREE.PointLight(0x06b6d4, 1.5, 8);
      pLight.position.set(0, 1.0, 0);
      padGroup.add(pLight);

      scene.add(padGroup);
      jumpPads.push({
        id,
        mesh: padGroup,
        position: new THREE.Vector3(x, groundY + 0.4, z),
        force,
        lastUsedTime: 0
      });
    };

    // Helper: Build Pine Tree with castShadow
    const buildPineTree = (x: number, z: number, scale = 1.0) => {
      const treeGroup = new THREE.Group();
      const groundY = this.getTerrainHeight(x, z);
      treeGroup.position.set(x, groundY, z);
      treeGroup.scale.set(scale, scale, scale);

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

    // Helper: Build Shipping Container
    const buildContainer = (x: number, z: number, rotY: number, mat: THREE.Material, level = 0) => {
      const cGeo = new THREE.BoxGeometry(3.5, 3.2, 8);
      const cMesh = new THREE.Mesh(cGeo, mat);
      const groundY = this.getTerrainHeight(x, z);
      cMesh.position.set(x, groundY + 1.6 + level * 3.2, z);
      cMesh.rotation.y = rotY;
      cMesh.castShadow = true;
      cMesh.receiveShadow = true;
      scene.add(cMesh);
      collidableMeshes.push(cMesh);
    };

    // Helper: Build Military Watchtower
    const buildWatchtower = (x: number, z: number) => {
      const towerGroup = new THREE.Group();
      const groundY = this.getTerrainHeight(x, z);
      towerGroup.position.set(x, groundY, z);

      const stiltGeo = new THREE.CylinderGeometry(0.3, 0.35, 11, 8);
      const stiltMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      const offsets = [[-3, -3], [3, -3], [-3, 3], [3, 3]];
      offsets.forEach(([ox, oz]) => {
        const stilt = new THREE.Mesh(stiltGeo, stiltMat);
        stilt.position.set(ox, 5.5, oz);
        stilt.castShadow = true;
        towerGroup.add(stilt);
      });

      const platGeo = new THREE.BoxGeometry(8, 0.6, 8);
      const platMat = new THREE.MeshLambertMaterial({ map: woodTex });
      const platform = new THREE.Mesh(platGeo, platMat);
      platform.position.set(0, 11, 0);
      platform.castShadow = true;
      platform.receiveShadow = true;
      towerGroup.add(platform);
      collidableMeshes.push(platform);

      const railGeo = new THREE.BoxGeometry(8, 1.2, 0.3);
      const railMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
      const rails = [[0, 11.6, -3.8], [0, 11.6, 3.8]];
      rails.forEach(([rx, ry, rz]) => {
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(rx, ry, rz);
        towerGroup.add(rail);
      });

      const roofGeo = new THREE.ConeGeometry(6.5, 2.5, 4);
      const roofMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 14.5, 0);
      towerGroup.add(roof);

      scene.add(towerGroup);
    };

    // Helper: Concrete Barrier
    const buildBarrier = (x: number, z: number, rotY: number) => {
      const bGeo = new THREE.BoxGeometry(4.2, 1.4, 0.8);
      const bMesh = new THREE.Mesh(bGeo, concreteMat);
      const groundY = this.getTerrainHeight(x, z);
      bMesh.position.set(x, groundY + 0.7, z);
      bMesh.rotation.y = rotY;
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      scene.add(bMesh);
      collidableMeshes.push(bMesh);
    };

    // ==========================================
    // POI 1: AIRFIELD & FLIGHTLINE (West: -140, -40)
    // ==========================================
    const buildAirfieldPOI = () => {
      // 180m Runway
      const rGeo = new THREE.PlaneGeometry(24, 180);
      rGeo.rotateX(-Math.PI / 2);
      const rMat = new THREE.MeshLambertMaterial({ map: runwayTex });
      const runway = new THREE.Mesh(rGeo, rMat);
      runway.position.set(-140, 0.06, -40);
      runway.receiveShadow = true;
      scene.add(runway);

      // Airplane Hangars with arched roof
      const buildHangar = (hx: number, hz: number) => {
        const hGroup = new THREE.Group();
        hGroup.position.set(hx, 0, hz);

        const wallGeo = new THREE.BoxGeometry(26, 8, 28);
        const wallMesh = new THREE.Mesh(wallGeo, concreteMat);
        wallMesh.position.y = 4;
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        hGroup.add(wallMesh);
        collidableMeshes.push(wallMesh);

        // Arched roof cylinder
        const roofGeo = new THREE.CylinderGeometry(13.2, 13.2, 28.2, 16, 1, false, 0, Math.PI);
        roofGeo.rotateZ(Math.PI / 2);
        const roofMesh = new THREE.Mesh(roofGeo, darkSteelMat);
        roofMesh.position.y = 8;
        roofMesh.castShadow = true;
        hGroup.add(roofMesh);

        scene.add(hGroup);
      };
      buildHangar(-170, -10);
      buildHangar(-170, -70);

      // Air Traffic Control Tower with rotating radar
      const atcGroup = new THREE.Group();
      atcGroup.position.set(-110, 0, -20);
      const atcColumn = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 22, 12), concreteMat);
      atcColumn.position.y = 11;
      atcColumn.castShadow = true;
      atcGroup.add(atcColumn);
      collidableMeshes.push(atcColumn);

      // Glass Observation Deck
      const deckMesh = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 4, 12), new THREE.MeshLambertMaterial({ color: 0x0284c7, roughness: 0.1, transparent: true, opacity: 0.85 }));
      deckMesh.position.y = 24;
      atcGroup.add(deckMesh);

      // Dome and Radar Dish
      const domeMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), darkSteelMat);
      domeMesh.position.y = 27;
      atcGroup.add(domeMesh);
      scene.add(atcGroup);

      // Fuel Tanks
      [-115, -125].forEach((fx) => {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 6, 12), darkSteelMat);
        tank.position.set(fx, 3, -80);
        tank.castShadow = true;
        scene.add(tank);
        collidableMeshes.push(tank);
      });

      // Airfield Jump Pad & Explosive Barrels
      buildJumpPad('jp-airfield', -140, 25, 24);
      buildExplosiveBarrel('b-air-1', -118, -75);
      buildExplosiveBarrel('b-air-2', -122, -75);
      buildExplosiveBarrel('b-air-3', -165, -35);
      buildBarrier(-132, 15, 0);
      buildBarrier(-148, 15, 0);
    };
    buildAirfieldPOI();

    // ==========================================
    // POI 2: CITADEL & COMMAND BARRACKS (North: 30, -140)
    // ==========================================
    const buildCitadelPOI = () => {
      const cGroup = new THREE.Group();
      cGroup.position.set(30, 0, -140);

      // Main Bastion Fortress (2-story)
      const bastionGeo = new THREE.BoxGeometry(32, 12, 32);
      const bastion = new THREE.Mesh(bastionGeo, concreteMat);
      bastion.position.y = 6;
      bastion.castShadow = true;
      bastion.receiveShadow = true;
      cGroup.add(bastion);
      collidableMeshes.push(bastion);

      // Helipad on top
      const heliGeo = new THREE.CylinderGeometry(10, 10, 0.4, 24);
      const heliMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
      const helipad = new THREE.Mesh(heliGeo, heliMat);
      helipad.position.y = 12.2;
      cGroup.add(helipad);

      // Yellow Helipad 'H'
      const hBarGeo = new THREE.BoxGeometry(1.2, 0.05, 8);
      const hMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const hL = new THREE.Mesh(hBarGeo, hMat);
      hL.position.set(-2.5, 12.45, 0);
      const hR = new THREE.Mesh(hBarGeo, hMat);
      hR.position.set(2.5, 12.45, 0);
      const hM = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 1.2), hMat);
      hM.position.set(0, 12.45, 0);
      cGroup.add(hL);
      cGroup.add(hR);
      cGroup.add(hM);

      // Blast Security Walls
      const wallMat = new THREE.MeshLambertMaterial({ map: hazardTex });
      const wallFront = new THREE.Mesh(new THREE.BoxGeometry(46, 4, 1.5), wallMat);
      wallFront.position.set(0, 2, 22);
      wallFront.castShadow = true;
      cGroup.add(wallFront);
      collidableMeshes.push(wallFront);

      scene.add(cGroup);

      // Flanking Watchtowers
      buildWatchtower(6, -115);
      buildWatchtower(54, -115);

      // Jump Pad into Citadel Roof & Explosive Barrels
      buildJumpPad('jp-citadel', 30, -110, 26);
      buildExplosiveBarrel('b-cit-1', 12, -125);
      buildExplosiveBarrel('b-cit-2', 48, -125);
      buildExplosiveBarrel('b-cit-3', 30, -162);
    };
    buildCitadelPOI();

    // ==========================================
    // POI 3: CARGO TERMINAL & CONTAINER PORT (East: 140, 40)
    // ==========================================
    const buildCargoPortPOI = () => {
      // Concrete Port Apron
      const apronGeo = new THREE.PlaneGeometry(90, 110);
      apronGeo.rotateX(-Math.PI / 2);
      const apron = new THREE.Mesh(apronGeo, concreteMat);
      apron.position.set(140, 0.04, 40);
      apron.receiveShadow = true;
      scene.add(apron);

      // Giant Gantry Shipping Crane
      const craneGroup = new THREE.Group();
      craneGroup.position.set(140, 0, -5);

      // Vertical A-frame legs
      [-12, 12].forEach((cx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 28, 1.4), yellowCraneMat);
        leg.position.set(cx, 14, 0);
        leg.castShadow = true;
        craneGroup.add(leg);
        collidableMeshes.push(leg);
      });

      // Horizontal Gantry Arm
      const boom = new THREE.Mesh(new THREE.BoxGeometry(44, 2.5, 3), yellowCraneMat);
      boom.position.set(0, 27, 0);
      boom.castShadow = true;
      craneGroup.add(boom);

      // Crane operator cabin
      const cab = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 4), darkSteelMat);
      cab.position.set(0, 24, 0);
      craneGroup.add(cab);

      scene.add(craneGroup);

      // Container Stacks (Multi-level layout creating intense CQB alleys)
      const containerLayout = [
        { x: 120, z: 20, rot: 0, mat: containerRedMat, lv: 0 },
        { x: 120, z: 20, rot: 0, mat: containerBlueMat, lv: 1 },
        { x: 125, z: 20, rot: 0, mat: containerGreenMat, lv: 0 },
        { x: 115, z: 45, rot: Math.PI / 2, mat: containerBlueMat, lv: 0 },
        { x: 115, z: 55, rot: Math.PI / 2, mat: containerRedMat, lv: 0 },
        { x: 115, z: 55, rot: Math.PI / 2, mat: containerGreenMat, lv: 1 },
        { x: 145, z: 30, rot: 0, mat: containerGreenMat, lv: 0 },
        { x: 150, z: 30, rot: 0, mat: containerRedMat, lv: 0 },
        { x: 150, z: 30, rot: 0, mat: containerBlueMat, lv: 1 },
        { x: 140, z: 65, rot: Math.PI / 2, mat: containerRedMat, lv: 0 },
        { x: 160, z: 55, rot: 0, mat: containerBlueMat, lv: 0 },
        { x: 160, z: 55, rot: 0, mat: containerGreenMat, lv: 1 }
      ];
      containerLayout.forEach((c) => buildContainer(c.x, c.z, c.rot, c.mat, c.lv));

      // Explosive Fuel Barrels nestled in containers
      buildExplosiveBarrel('b-cargo-1', 133, 20);
      buildExplosiveBarrel('b-cargo-2', 122, 50);
      buildExplosiveBarrel('b-cargo-3', 152, 45);
      buildJumpPad('jp-cargo', 140, 85, 23);
    };
    buildCargoPortPOI();

    // ==========================================
    // POI 4: CENTRAL TOWN & HEADQUARTERS (Center: 0, 0)
    // ==========================================
    const buildCentralTownPOI = () => {
      // Main Highway crossroad
      const mainRoadGeo = new THREE.PlaneGeometry(14, 260);
      mainRoadGeo.rotateX(-Math.PI / 2);
      const mainRoad = new THREE.Mesh(mainRoadGeo, new THREE.MeshLambertMaterial({ map: roadTex }));
      mainRoad.position.set(0, 0.06, 0);
      mainRoad.receiveShadow = true;
      scene.add(mainRoad);

      const crossRoad = new THREE.Mesh(mainRoadGeo, new THREE.MeshLambertMaterial({ map: roadTex }));
      crossRoad.rotation.y = Math.PI / 2;
      crossRoad.position.set(0, 0.08, 0);
      crossRoad.receiveShadow = true;
      scene.add(crossRoad);

      // Two-story Military HQ Building (with outdoor ramp/stairs to rooftop!)
      const buildHQBuilding = (x: number, z: number) => {
        const hqGroup = new THREE.Group();
        hqGroup.position.set(x, 0, z);

        // Ground floor
        const floor1 = new THREE.Mesh(new THREE.BoxGeometry(22, 5, 18), concreteMat);
        floor1.position.y = 2.5;
        floor1.castShadow = true;
        floor1.receiveShadow = true;
        hqGroup.add(floor1);
        collidableMeshes.push(floor1);

        // Second floor (setback terrace)
        const floor2 = new THREE.Mesh(new THREE.BoxGeometry(16, 4.5, 14), concreteMat);
        floor2.position.set(-1, 7.25, -1);
        floor2.castShadow = true;
        floor2.receiveShadow = true;
        hqGroup.add(floor2);
        collidableMeshes.push(floor2);

        // Outdoor access ramp to second floor
        const rampGeo = new THREE.BoxGeometry(3.5, 0.5, 12);
        rampGeo.rotateX(-0.4);
        const ramp = new THREE.Mesh(rampGeo, darkSteelMat);
        ramp.position.set(10.5, 3.2, 0);
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        hqGroup.add(ramp);
        collidableMeshes.push(ramp);

        scene.add(hqGroup);
      };
      buildHQBuilding(-30, -35);
      buildHQBuilding(35, 35);

      // Central Obelisk Monument Plaza
      const obeliskBase = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 6), concreteMat);
      obeliskBase.position.set(0, 0.6, 0);
      scene.add(obeliskBase);
      collidableMeshes.push(obeliskBase);

      const obeliskPillar = new THREE.Mesh(new THREE.ConeGeometry(1.6, 10, 4), darkSteelMat);
      obeliskPillar.rotation.y = Math.PI / 4;
      obeliskPillar.position.set(0, 6.2, 0);
      obeliskPillar.castShadow = true;
      scene.add(obeliskPillar);

      // Central Jump Pad right at the crossroads!
      buildJumpPad('jp-center', 0, 12, 24);

      // Barricades and explosive traps around center
      buildBarrier(-10, -10, 0.7);
      buildBarrier(10, 10, 0.7);
      buildBarrier(-10, 10, -0.7);
      buildBarrier(10, -10, -0.7);
      buildExplosiveBarrel('b-town-1', -16, -16);
      buildExplosiveBarrel('b-town-2', 16, 16);
      buildExplosiveBarrel('b-town-3', -16, 16);
      buildExplosiveBarrel('b-town-4', 16, -16);
    };
    buildCentralTownPOI();

    // ==========================================
    // POI 5: RADIO RELAY & SNIPER RIDGE (South-East: 120, -120)
    // ==========================================
    const buildRadioRelayPOI = () => {
      const peakGroundY = this.getTerrainHeight(120, -120);
      const relayGroup = new THREE.Group();
      relayGroup.position.set(120, peakGroundY, -120);

      // Tall Red & White Transmission Mast (36m high!)
      const mastGeo = new THREE.CylinderGeometry(0.4, 1.2, 36, 6);
      const mastMat = new THREE.MeshLambertMaterial({ color: 0xef4444, metalness: 0.8 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.y = 18;
      mast.castShadow = true;
      relayGroup.add(mast);
      collidableMeshes.push(mast);

      // Blinking Red Warning Beacon at mast top
      const beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      beaconMesh.position.y = 36.2;
      relayGroup.add(beaconMesh);

      // Communications Hut
      const hutGeo = new THREE.BoxGeometry(10, 4, 8);
      const hut = new THREE.Mesh(hutGeo, concreteMat);
      hut.position.set(0, 2, 8);
      hut.castShadow = true;
      hut.receiveShadow = true;
      relayGroup.add(hut);
      collidableMeshes.push(hut);

      scene.add(relayGroup);

      buildWatchtower(135, -105);
      buildJumpPad('jp-relay', 110, -105, 25);
      buildExplosiveBarrel('b-relay-1', 128, -112);
      buildExplosiveBarrel('b-relay-2', 114, -130);
    };
    buildRadioRelayPOI();

    // ==========================================
    // POI 6: LUMBER CAMP & FOREST OUTPOST (South-West: -120, 120)
    // ==========================================
    const buildLumberCampPOI = () => {
      // Wood Log Cabins
      const buildCabin = (cx: number, cz: number) => {
        const cGroup = new THREE.Group();
        const gy = this.getTerrainHeight(cx, cz);
        cGroup.position.set(cx, gy, cz);

        const body = new THREE.Mesh(new THREE.BoxGeometry(12, 4.5, 10), new THREE.MeshLambertMaterial({ map: woodTex }));
        body.position.y = 2.25;
        body.castShadow = true;
        body.receiveShadow = true;
        cGroup.add(body);
        collidableMeshes.push(body);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 3, 4), new THREE.MeshLambertMaterial({ color: 0x27272a }));
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 5.8;
        cGroup.add(roof);

        scene.add(cGroup);
      };
      buildCabin(-110, 110);
      buildCabin(-135, 130);

      // Stacked Log Piles
      for (let p = 0; p < 4; p++) {
        const logStack = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 8, 8), new THREE.MeshLambertMaterial({ color: 0x5c432d }));
        logStack.rotation.z = Math.PI / 2;
        const gy = this.getTerrainHeight(-120 + p * 4, 100);
        logStack.position.set(-120 + p * 4, gy + 0.6, 100);
        logStack.castShadow = true;
        scene.add(logStack);
        collidableMeshes.push(logStack);
      }

      buildWatchtower(-100, 135);
      buildJumpPad('jp-lumber', -120, 140, 24);
      buildExplosiveBarrel('b-lum-1', -118, 118);
      buildExplosiveBarrel('b-lum-2', -130, 112);
    };
    buildLumberCampPOI();

    // ==========================================
    // 7. FOREST CANOPY: Scatter 70+ Pine Trees across the expanded map
    // ==========================================
    const forestScatterZones = [
      // Lumber valley
      { cx: -120, cz: 120, count: 20, spread: 45 },
      // Sniper ridge slope
      { cx: 90, cz: -90, count: 14, spread: 35 },
      // River banks
      { cx: -40, cz: 60, count: 12, spread: 30 },
      { cx: -65, cz: -60, count: 12, spread: 30 },
      // General wilderness
      { cx: 70, cz: -30, count: 8, spread: 25 },
      { cx: -70, cz: 20, count: 8, spread: 25 }
    ];

    forestScatterZones.forEach(({ cx, cz, count, spread }) => {
      for (let i = 0; i < count; i++) {
        const tx = cx + (Math.random() - 0.5) * spread;
        const tz = cz + (Math.random() - 0.5) * spread;
        // Avoid roads & buildings
        if (Math.sqrt(tx * tx + tz * tz) > 22) {
          const scale = 0.8 + Math.random() * 0.5;
          buildPineTree(tx, tz, scale);
        }
      }
    });

    // 8. PERIMETER MOUNTAIN SILHOUETTES (Expanded ring around the 1000m island)
    const mountainGroup = new THREE.Group();
    const mountainMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    for (let m = 0; m < 96; m++) {
      const angle = (m / 96) * Math.PI * 2;
      const dist = 480 + (m % 4) * 15;
      const mx = Math.cos(angle) * dist;
      const mz = Math.sin(angle) * dist;
      const mHeight = 85 + Math.sin(m * 1.4) * 45 + Math.random() * 20;
      const mGeo = new THREE.ConeGeometry(45 + Math.random() * 18, mHeight, 6);
      const mMesh = new THREE.Mesh(mGeo, mountainMat);
      mMesh.position.set(mx, mHeight / 2 - 12, mz);
      mountainGroup.add(mMesh);
    }
    scene.add(mountainGroup);

    return {
      terrain,
      collidableMeshes,
      interactiveBarrels,
      jumpPads,
      pois,
      getTerrainHeight: this.getTerrainHeight.bind(this)
    };
  }
}
