export interface HierarchyNode {
  name: string;
  type: string;
  tag?: string;
  layer?: string;
  components: string[];
  notes?: string;
  children?: HierarchyNode[];
}

export const unityHierarchyData: HierarchyNode = {
  name: "BattleRoyale_Scene_Root",
  type: "Scene",
  components: [],
  children: [
    {
      name: "Directional Light (Sun)",
      type: "Light",
      components: ["Light (Type: Directional, Color: Warm Sunlight, Shadows: Soft)"]
    },
    {
      name: "Environment_OpenWorld",
      type: "GameObject (Static)",
      components: ["Static Flag: Navigation Static checked"],
      children: [
        {
          name: "Terrain_Island",
          type: "Terrain / Mesh (250m x 250m)",
          layer: "Ground",
          components: ["TerrainCollider", "Terrain", "NavMeshSurface (Agent: Humanoid)"],
          notes: "Large open world battlefield with rolling hills, asphalt roads, and beach perimeter."
        },
        {
          name: "Compound_Buildings",
          type: "Prefabs / Modular Houses",
          layer: "Obstacle",
          components: ["MeshCollider", "Static Flag: Checked"],
          notes: "2-story military barracks and warehouses with doors, stairs, and rooftop vantage points."
        },
        {
          name: "Foliage_Trees_Rocks",
          type: "Environment Scatter",
          layer: "Obstacle",
          components: ["CapsuleCollider (Tree Trunks)", "Static Flag: Checked"],
          notes: "Natural bullet cover scattered across fields for tactical combat."
        }
      ]
    },
    {
      name: "Player",
      type: "Humanoid / Capsule Rig",
      tag: "Player",
      layer: "Player",
      components: [
        "CharacterController (Height: 1.85, Radius: 0.45, Center: Y=0.92)",
        "PlayerController.cs",
        "WeaponSystem.cs",
        "PlayerHealth.cs (100 HP + 100 Shield)",
        "AudioSource (Footsteps / Glider Wind)"
      ],
      notes: "Remove default CapsuleCollider to prevent collision deadlocks with CharacterController.",
      children: [
        {
          name: "Main Camera",
          type: "Camera",
          tag: "MainCamera",
          components: [
            "Camera (Default FOV: 75, ADS FOV: 45)",
            "AudioListener"
          ],
          notes: "Position at (0, 1.68, 0) relative to Player for true human eye-level perspective.",
          children: [
            {
              name: "WeaponHolder (Socket)",
              type: "Transform",
              components: [],
              notes: "Position at (0.28, -0.22, 0.45). Holds Assault Rifle, Shotgun, and Sniper models.",
              children: [
                {
                  name: "AssaultRifle_Model",
                  type: "3D Mesh",
                  components: ["MuzzleFlash (ParticleSystem)", "MuzzleLight"]
                },
                {
                  name: "Shotgun_Model",
                  type: "3D Mesh",
                  components: ["MuzzleFlash (ParticleSystem)"]
                },
                {
                  name: "SniperRifle_Model",
                  type: "3D Mesh",
                  components: ["ScopeLens", "MuzzleFlash (ParticleSystem)"]
                }
              ]
            },
            {
              name: "Parachute_Glider_Model",
              type: "3D Mesh",
              components: [],
              notes: "Activates during skydiving and dropship descent."
            }
          ]
        },
        {
          name: "GroundCheck",
          type: "Empty Transform",
          components: [],
          notes: "Position at (0, 0.05, 0). Used by PlayerController sphere check."
        }
      ]
    },
    {
      name: "StormZone_System",
      type: "GameObject",
      components: ["StormZone.cs"],
      notes: "Manages shrinking holographic cylinder, safe zone circle, and electrical storm tick damage.",
      children: [
        {
          name: "StormCylinder_Visual",
          type: "3D Cylinder (Inverted Normals / Transparent Shader)",
          components: ["MeshRenderer (Material: Electric Blue Hologram)"]
        }
      ]
    },
    {
      name: "Bots_Roster",
      type: "Empty Parent Transform",
      components: [],
      children: [
        {
          name: "Bot_Humanoid_01",
          type: "Human 3D Model / NavMesh Agent",
          tag: "Enemy",
          layer: "Enemy",
          components: [
            "NavMeshAgent (Speed: 5.5, StoppingDistance: 2.0)",
            "HumanoidEnemyAI.cs",
            "Animator (Controller: Humanoid_Soldier_Controller)",
            "CapsuleCollider (Hitbox)",
            "AudioSource"
          ],
          notes: "Equipped with tactical uniform, military helmet, and rifle in right hand socket."
        },
        {
          name: "Bot_Humanoid_02",
          type: "Human 3D Model / NavMesh Agent",
          tag: "Enemy",
          layer: "Enemy",
          components: ["NavMeshAgent", "HumanoidEnemyAI.cs", "Animator", "CapsuleCollider"]
        }
      ]
    },
    {
      name: "Loot_Spawners",
      type: "Empty Parent Transform",
      components: [],
      children: [
        {
          name: "Loot_AssaultRifle",
          type: "Prefab",
          components: ["LootItem.cs (Type: AssaultRifle)", "SphereCollider (Trigger)", "BeaconLight"]
        },
        {
          name: "Loot_ShieldPotion",
          type: "Prefab",
          components: ["LootItem.cs (Type: ShieldPotion)", "SphereCollider (Trigger)", "BeaconLight (Cyan)"]
        },
        {
          name: "Loot_Medkit",
          type: "Prefab",
          components: ["LootItem.cs (Type: Medkit)", "SphereCollider (Trigger)", "BeaconLight (Green)"]
        }
      ]
    },
    {
      name: "HUD_Canvas",
      type: "UI Canvas",
      components: ["Canvas (Screen Space Overlay)", "CanvasScaler (1920x1080)", "HUDController.cs"],
      children: [
        {
          name: "CompassRibbon",
          type: "UI Panel (Top Center)",
          components: ["Compass Bar (N, NE, E, SE, S, SW, W, NW)"]
        },
        {
          name: "MatchStats_Panel",
          type: "UI Panel (Top Right)",
          components: ["AliveCounterText ('ALIVE: 15')", "KillCounterText ('KILLS: 3')"]
        },
        {
          name: "StormWarning_Panel",
          type: "UI Panel (Top Center)",
          components: ["StormTimerText ('SAFE ZONE SHRINKING IN 0:45')"]
        },
        {
          name: "VitalityBars",
          type: "UI Panel (Bottom Left)",
          components: ["HealthSlider (Green)", "ShieldSlider (Cyan)", "HPText"]
        },
        {
          name: "WeaponInventory_Panel",
          type: "UI Panel (Bottom Right)",
          components: ["Slot1_Rifle", "Slot2_Shotgun", "Slot3_Sniper", "AmmoCounterText"]
        },
        {
          name: "DynamicCrosshair",
          type: "UI RectTransform (Center Screen)",
          components: ["ReticleBloom (Expands during sprint/hipfire)", "Hitmarker ('X' Flash)"]
        },
        {
          name: "VictoryRoyale_Banner",
          type: "UI Modal (Screen Center)",
          components: ["ChampionText ('#1 VICTORY ROYALE')", "MatchSummaryStats"]
        }
      ]
    },
    {
      name: "GameManager",
      type: "Empty GameObject",
      components: ["GameManager.cs"],
      notes: "Coordinates dropship deployment, alive roster counting, and match results."
    }
  ]
};

export const stepByStepInstructions = [
  {
    id: "step-1",
    title: "1. Battlefield Map & Terrain Setup",
    category: "Map & Environment",
    summary: "Create a large, realistic Battle Royale open-world island with varied topography, compounds, and baked NavMesh.",
    steps: [
      "In Hierarchy: Right click > 3D Object > Terrain. Set terrain size to 250 x 250 or 500 x 500 meters.",
      "Use the Terrain Sculpt tool to paint gentle rolling hills, sniper ridges, and low-lying riverbeds.",
      "Import or place modular buildings (military hangars, 2-story residences, shipping containers) to form named drop zones (e.g. 'Military Base', 'Harbor', 'Outpost').",
      "Scatter trees and stone boulders across open fields so players and bots have tactical bullet cover while rotating.",
      "Select all terrain and building meshes, check 'Navigation Static' in the Inspector top-right.",
      "Open Window > AI > Navigation, set Agent Radius to 0.4 and Max Slope to 45°, then click 'Bake'. You will see a walkable blue NavMesh covering the entire terrain and building interiors."
    ],
    inspectorNotes: {
      "Terrain Size": "250m x 250m minimum for Battle Royale",
      "NavMesh Agent Type": "Humanoid (Height: 2.0, Radius: 0.5)",
      "Layer Assignments": "Terrain = 'Ground', Buildings/Trees = 'Obstacle'"
    }
  },
  {
    id: "step-2",
    title: "2. First-Person Character with Parachute Glider",
    category: "Player Setup",
    summary: "Construct the Battle Royale First-Person Player with smooth locomotion, mouse look, jump, and skydiving glide mechanics.",
    steps: [
      "In Hierarchy: Create a 3D Capsule named 'Player'. Remove its default CapsuleCollider component.",
      "Add a CharacterController component. Set Height = 1.85, Radius = 0.45, Center Y = 0.92.",
      "Make Main Camera a child of 'Player' at local position (0, 1.68, 0) so eyes align with standard human proportions.",
      "Create an empty GameObject child named 'GroundCheck' at (0, 0.05, 0).",
      "Attach PlayerController.cs to 'Player'. Drag 'Main Camera' into Camera Transform, 'GroundCheck' into Ground Check, and select 'Ground' for Ground Mask.",
      "Attach PlayerHealth.cs to 'Player' (manages 100 Health + 100 Shield Armor)."
    ],
    inspectorNotes: {
      "Walk Speed": "5.0 m/s",
      "Sprint Speed": "9.5 m/s",
      "Glide Fall Speed": "4.5 m/s (deployable canopy)",
      "Gravity": "20.0 (fast, crisp military game feel)"
    }
  },
  {
    id: "step-3",
    title: "3. Weapon Arsenal System (Rifle, Shotgun, Sniper)",
    category: "Combat & Arsenal",
    summary: "Implement multi-slot weapon switching, Aim Down Sights (ADS) camera zoom, and raycast ballistics.",
    steps: [
      "Inside 'Main Camera', create an empty GameObject named 'WeaponHolder' at position (0.28, -0.22, 0.45).",
      "Add 3 child weapon models: Slot 0 (Assault Rifle), Slot 1 (Pump Shotgun), Slot 2 (Bolt Sniper).",
      "Attach WeaponSystem.cs to 'Player'. Wire the 3 weapon slots with their respective models, damages, and magazine sizes.",
      "Create a ParticleSystem at each weapon muzzle for MuzzleFlash, and link an AudioSource for gunfire SFX.",
      "The WeaponSystem casts raycasts forward from Camera.main, eliminating parallax inaccuracy at close range."
    ],
    commonMistakes: [
      "Neglecting ADS field of view interpolation: Smooth lerp between 75° and 45° gives realistic weapon handling and zoom control."
    ]
  },
  {
    id: "step-4",
    title: "4. Humanoid Bot AI with Realistic Character Rigs",
    category: "Humanoid AI Bots",
    summary: "Configure human-looking soldier bots with NavMesh pathfinding, cover taking, rifle burst firing, and death loot drops.",
    steps: [
      "Import a humanoid 3D soldier character model (with head, tactical vest, limbs, combat boots, and rifle socket).",
      "Set Rig Animation Type to 'Humanoid' in model import settings.",
      "Add a NavMeshAgent component (Speed: 5.2, Stopping Distance: 2.0).",
      "Attach HumanoidEnemyAI.cs. Wire eyeTransform to the soldier's head bone for realistic line-of-sight sightlines.",
      "Add an Animator controller with 'Speed' float, 'Shoot' trigger, and 'Die' trigger.",
      "In the 'Loot Prefabs' array, assign Medkit, Shield Potion, and Weapon drop prefabs so defeated bots drop gear upon death."
    ],
    inspectorNotes: {
      "Stopping Distance": "2.0 (matches combat attack range)",
      "Field Of View Angle": "110° (realistic human peripheral vision)",
      "Detection Radius": "16.0 meters"
    }
  },
  {
    id: "step-5",
    title: "5. Shrinking Storm Zone (Battle Royale Circle)",
    category: "Battle Royale Mechanics",
    summary: "Setup the shrinking safe zone circle with multiple phases, visual perimeter boundary, and storm damage ticks.",
    steps: [
      "Create an empty GameObject in the scene center named 'StormZone'.",
      "Attach StormZone.cs. Add 3 to 5 StormPhases in the Inspector with decreasing target radii (e.g., 180m -> 110m -> 55m -> 20m).",
      "Create a visual inverted cylinder mesh with an electric blue transparent shader to visualize the storm perimeter in 3D.",
      "StormZone.cs continuously checks distance between the player and the safe zone center, inflicting damage per second if outside."
    ]
  },
  {
    id: "step-6",
    title: "6. Ground Loot & Supply Drops",
    category: "Loot System",
    summary: "Scatter glowing weapons, medkits, shield potions, and ammo crates across buildings and open areas.",
    steps: [
      "Create a prefab for each loot type (Assault Rifle, Shotgun, Sniper, Medkit, Shield Potion, Ammo Box).",
      "Attach LootItem.cs and a SphereCollider set to 'Is Trigger' (Radius: 2.0).",
      "Add a small PointLight and ParticleSystem for a vertical rarity beacon beam (Green for Medkit, Cyan for Shield, Gold for Weapons).",
      "LootItem.cs handles rotating hover animations and triggers pick-up when the player presses 'E'."
    ]
  },
  {
    id: "step-7",
    title: "7. Battle Royale HUD & Victory Royale Flow",
    category: "UI HUD & Game Loop",
    summary: "Assemble the top compass bar, Alive counter, Kill feed, dynamic crosshair, and Victory Royale celebration screen.",
    steps: [
      "Create a Screen Space - Overlay UI Canvas named 'HUD_Canvas' with CanvasScaler set to 1920x1080.",
      "Add a Compass Ribbon at top-center rotating with player yaw orientation.",
      "Add an 'ALIVE: 15' and 'KILLS: 0' text badge in top-right.",
      "Add Health (Green) and Shield (Cyan) sliders in bottom-left.",
      "Add Weapon inventory slots in bottom-right.",
      "Add a full-screen '#1 VICTORY ROYALE - CHAMPION' celebration panel activated by GameManager when 1 player remains."
    ]
  }
];
