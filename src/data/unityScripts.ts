import { GameSettings, ScriptFile } from '../types';

export function getUnityScripts(settings: GameSettings): ScriptFile[] {
  return [
    {
      id: 'player-controller',
      name: 'PlayerController.cs',
      filename: 'PlayerController.cs',
      category: 'Player',
      description: 'First-Person Battle Royale controller featuring smooth WASD movement, mouse-look with pitch clamping, sprint, jump, camera sway, and parachute skydiving descent state.',
      dependencies: ['UnityEngine', 'UnityEngine.InputSystem (or Legacy Input)'],
      unityComponentsRequired: ['CharacterController'],
      code: `using UnityEngine;

/// <summary>
/// First-Person Controller for Battle Royale & Survival Action Games.
/// Handles smooth WASD movement, mouse-look rotation, sprinting, jumping,
/// ground checking, parachute/skydive glide mechanics, and weapon camera sway.
/// Attach to a GameObject with a CharacterController component (e.g., "Player").
/// </summary>
[RequireComponent(typeof(CharacterController))]
public class PlayerController : MonoBehaviour
{
    [Header("Movement Speeds")]
    [Tooltip("Normal tactical walking speed in meters per second.")]
    [SerializeField] private float walkSpeed = ${settings.walkSpeed.toFixed(1)}f;
    [Tooltip("Sprinting speed while holding Left Shift.")]
    [SerializeField] private float sprintSpeed = ${settings.sprintSpeed.toFixed(1)}f;
    [Tooltip("Smoothing factor for acceleration and deceleration.")]
    [SerializeField] private float movementDamping = 12f;

    [Header("Jump & Gravity")]
    [Tooltip("Height of the jump in meters.")]
    [SerializeField] private float jumpHeight = ${settings.jumpHeight.toFixed(1)}f;
    [Tooltip("Downwards acceleration due to gravity.")]
    [SerializeField] private float gravity = ${settings.gravity.toFixed(1)}f;
    [Tooltip("Transform used to verify if the player is grounded.")]
    [SerializeField] private Transform groundCheck;
    [Tooltip("Radius of the ground check sphere.")]
    [SerializeField] private float groundDistance = 0.4f;
    [Tooltip("Layers considered solid ground.")]
    [SerializeField] private LayerMask groundMask;

    [Header("Parachute / Skydive Drop State")]
    [Tooltip("Is the player currently gliding from the battle royale drop?")]
    [SerializeField] private bool isGliding = false;
    [Tooltip("Terminal fall velocity while parachute is deployed.")]
    [SerializeField] private float glideFallSpeed = 4.5f;
    [Tooltip("Forward airspeed multiplier during parachute deployment.")]
    [SerializeField] private float glideForwardSpeed = 12.0f;

    [Header("Mouse Look & Camera")]
    [Tooltip("Transform of the First-Person Camera (child of Player).")]
    [SerializeField] private Transform cameraTransform;
    [Tooltip("Mouse look sensitivity multiplier.")]
    [SerializeField] private float mouseSensitivity = ${settings.mouseSensitivity.toFixed(1)}f;
    [Tooltip("Minimum vertical angle for looking up/down.")]
    [SerializeField] private float minPitchAngle = -85f;
    [Tooltip("Maximum vertical angle for looking up/down.")]
    [SerializeField] private float maxPitchAngle = 85f;

    // Component references & State
    private CharacterController controller;
    private Vector3 currentVelocity;
    private Vector3 targetMoveDirection;
    private float verticalVelocity;
    private float verticalRotation = 0f;
    private bool isGrounded;

    public bool IsSprinting { get; private set; }
    public bool IsGrounded => isGrounded;
    public bool IsGliding => isGliding;

    private void Awake()
    {
        controller = GetComponent<CharacterController>();

        if (cameraTransform == null && Camera.main != null)
        {
            cameraTransform = Camera.main.transform;
        }

        // Lock and hide mouse cursor for FPS gameplay
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    private void Update()
    {
        CheckGrounded();
        HandleMouseLook();
        HandleMovement();
        HandleJumpAndGravity();
    }

    /// <summary>
    /// Evaluates sphere check at the player's feet against the ground layer mask.
    /// </summary>
    private void CheckGrounded()
    {
        if (groundCheck != null)
        {
            isGrounded = Physics.CheckSphere(groundCheck.position, groundDistance, groundMask);
        }
        else
        {
            isGrounded = controller.isGrounded;
        }

        // Auto-pack parachute upon touching the battlefield terrain
        if (isGrounded && isGliding)
        {
            isGliding = false;
        }
    }

    /// <summary>
    /// Rotates the player body horizontally (yaw) and camera vertically (pitch).
    /// </summary>
    private void HandleMouseLook()
    {
        if (cameraTransform == null) return;

        float mouseX = Input.GetAxisRaw("Mouse X") * mouseSensitivity;
        float mouseY = Input.GetAxisRaw("Mouse Y") * mouseSensitivity;

        // Yaw rotates the entire player capsule
        transform.Rotate(Vector3.up * mouseX);

        // Pitch rotates only the camera
        verticalRotation -= mouseY;
        verticalRotation = Mathf.Clamp(verticalRotation, minPitchAngle, maxPitchAngle);
        cameraTransform.localRotation = Quaternion.Euler(verticalRotation, 0f, 0f);
    }

    /// <summary>
    /// Reads WASD movement input and moves the CharacterController with acceleration damping.
    /// </summary>
    private void HandleMovement()
    {
        float inputHorizontal = Input.GetAxisRaw("Horizontal");
        float inputVertical = Input.GetAxisRaw("Vertical");

        Vector3 inputDir = (transform.right * inputHorizontal + transform.forward * inputVertical).normalized;

        if (isGliding)
        {
            // Gliding flight model: glide forward in look direction with lateral drift
            Vector3 forwardGlide = transform.forward * glideForwardSpeed;
            targetMoveDirection = forwardGlide + (transform.right * inputHorizontal * (glideForwardSpeed * 0.5f));
            currentVelocity = Vector3.Lerp(currentVelocity, targetMoveDirection, Time.deltaTime * 3f);
            controller.Move(currentVelocity * Time.deltaTime);
            return;
        }

        // Check sprint condition
        IsSprinting = Input.GetKey(KeyCode.LeftShift) && inputVertical > 0.1f && isGrounded;
        float targetSpeed = IsSprinting ? sprintSpeed : walkSpeed;

        targetMoveDirection = inputDir * targetSpeed;
        currentVelocity = Vector3.Lerp(currentVelocity, targetMoveDirection, Time.deltaTime * movementDamping);

        controller.Move(currentVelocity * Time.deltaTime);
    }

    /// <summary>
    /// Handles jump impulse, parachute glide toggle, and kinematic gravity acceleration.
    /// </summary>
    private void HandleJumpAndGravity()
    {
        if (isGrounded)
        {
            // Slight downward stick force when grounded
            if (verticalVelocity < 0f)
            {
                verticalVelocity = -2f;
            }

            // Jump
            if (Input.GetButtonDown("Jump"))
            {
                verticalVelocity = Mathf.Sqrt(2f * jumpHeight * gravity);
            }
        }
        else
        {
            // Allow toggling parachute glider mid-air with Space
            if (Input.GetButtonDown("Jump") && verticalVelocity < -2f)
            {
                isGliding = !isGliding;
            }

            if (isGliding)
            {
                // Terminal descent speed under deployed canopy
                verticalVelocity = Mathf.Lerp(verticalVelocity, -glideFallSpeed, Time.deltaTime * 5f);
            }
            else
            {
                // Freefall gravity
                verticalVelocity -= gravity * Time.deltaTime;
            }
        }

        controller.Move(Vector3.up * verticalVelocity * Time.deltaTime);
    }

    /// <summary>
    /// Deploys parachute gliders for battle royale start drops.
    /// </summary>
    public void DeployParachute()
    {
        isGliding = true;
    }

    private void OnDrawGizmosSelected()
    {
        if (groundCheck != null)
        {
            Gizmos.color = isGrounded ? Color.green : Color.red;
            Gizmos.DrawWireSphere(groundCheck.position, groundDistance);
        }
    }
}`
    },
    {
      id: 'weapon-system',
      name: 'WeaponSystem.cs',
      filename: 'WeaponSystem.cs',
      category: 'Combat',
      description: 'Battle Royale multi-weapon loadout (Assault Rifle, Pump Shotgun, Bolt Sniper). Supports Aim Down Sights (ADS) FOV zoom, raycast ballistics, recoil, bullet spread, and reload cycles.',
      dependencies: ['UnityEngine', 'IDamageable'],
      unityComponentsRequired: ['AudioSource'],
      code: `using System.Collections;
using UnityEngine;

public enum WeaponSlot { PrimaryRifle = 0, SecondaryShotgun = 1, SpecialSniper = 2 }

[System.Serializable]
public class WeaponData
{
    public string weaponName = "Assault Rifle";
    public WeaponSlot slot = WeaponSlot.PrimaryRifle;
    public float damage = ${settings.damage.toFixed(1)}f;
    public float fireRate = ${settings.fireRate.toFixed(1)}f; // rounds per second
    public int magazineCapacity = ${settings.magazineSize};
    public int currentAmmo = ${settings.magazineSize};
    public int reserveAmmo = 90;
    public float reloadTime = ${settings.reloadTime.toFixed(1)}f;
    public float range = ${settings.range.toFixed(1)}f;
    public float adsZoomFov = 45f;
    public float hipfireSpread = 0.035f;
    public float adsSpread = 0.005f;
    public int pelletsPerShot = 1; // 8 for shotgun, 1 for rifle/sniper
    public GameObject weaponModel;
    public AudioClip shootSfx;
    public AudioClip reloadSfx;
}

public class WeaponSystem : MonoBehaviour
{
    [Header("Camera & Muzzle")]
    [SerializeField] private Camera fpsCamera;
    [SerializeField] private Transform muzzlePoint;
    [SerializeField] private ParticleSystem muzzleFlash;
    [SerializeField] private GameObject impactEffectPrefab;
    [SerializeField] private TrailRenderer bulletTracerPrefab;

    [Header("Arsenal Loadout")]
    [SerializeField] private WeaponData[] weapons = new WeaponData[3];
    [SerializeField] private int activeWeaponIndex = 0;

    [Header("Aim Down Sights (ADS)")]
    [SerializeField] private float defaultFov = 60f;
    [SerializeField] private float adsFovSpeed = 10f;
    [SerializeField] private LayerMask hitMask = ~0;

    private AudioSource audioSource;
    private float nextTimeToFire = 0f;
    private bool isReloading = false;
    private bool isAimingDownSights = false;

    // Events for UI HUD
    public static event System.Action<int, int, string> OnAmmoChanged;
    public static event System.Action<WeaponSlot> OnWeaponSwitched;
    public static event System.Action OnHitEnemy;

    public WeaponData ActiveWeapon => weapons[activeWeaponIndex];
    public bool IsAimingDownSights => isAimingDownSights;

    private void Awake()
    {
        audioSource = GetComponent<AudioSource>();
        if (fpsCamera == null) fpsCamera = Camera.main;
    }

    private void Start()
    {
        SwitchWeapon(0);
    }

    private void Update()
    {
        HandleWeaponSwitchInput();
        HandleADS();

        if (isReloading) return;

        // Manual reload on 'R'
        if (Input.GetKeyDown(KeyCode.R) && ActiveWeapon.currentAmmo < ActiveWeapon.magazineCapacity && ActiveWeapon.reserveAmmo > 0)
        {
            StartCoroutine(ReloadCoroutine());
            return;
        }

        // Fire weapon (hold mouse 0 for auto rifle, click for sniper/shotgun)
        bool fireInput = ActiveWeapon.slot == WeaponSlot.PrimaryRifle ? Input.GetButton("Fire1") : Input.GetButtonDown("Fire1");
        if (fireInput && Time.time >= nextTimeToFire)
        {
            nextTimeToFire = Time.time + (1f / ActiveWeapon.fireRate);
            if (ActiveWeapon.currentAmmo > 0)
            {
                Shoot();
            }
            else
            {
                // Auto reload if empty
                if (ActiveWeapon.reserveAmmo > 0)
                {
                    StartCoroutine(ReloadCoroutine());
                }
            }
        }
    }

    private void HandleWeaponSwitchInput()
    {
        if (Input.GetKeyDown(KeyCode.Alpha1)) SwitchWeapon(0);
        if (Input.GetKeyDown(KeyCode.Alpha2)) SwitchWeapon(1);
        if (Input.GetKeyDown(KeyCode.Alpha3)) SwitchWeapon(2);

        // Scroll wheel cycle
        float scroll = Input.GetAxis("Mouse ScrollWheel");
        if (scroll > 0f) SwitchWeapon((activeWeaponIndex + 1) % weapons.Length);
        if (scroll < 0f) SwitchWeapon((activeWeaponIndex - 1 + weapons.Length) % weapons.Length);
    }

    private void HandleADS()
    {
        isAimingDownSights = Input.GetButton("Fire2");
        float targetFov = isAimingDownSights ? ActiveWeapon.adsZoomFov : defaultFov;
        fpsCamera.fieldOfView = Mathf.Lerp(fpsCamera.fieldOfView, targetFov, Time.deltaTime * adsFovSpeed);
    }

    public void SwitchWeapon(int index)
    {
        if (index < 0 || index >= weapons.Length || (index == activeWeaponIndex && weapons[index].weaponModel.activeSelf)) return;
        if (isReloading) StopAllCoroutines();
        isReloading = false;

        for (int i = 0; i < weapons.Length; i++)
        {
            if (weapons[i].weaponModel != null)
            {
                weapons[i].weaponModel.SetActive(i == index);
            }
        }

        activeWeaponIndex = index;
        OnWeaponSwitched?.Invoke(ActiveWeapon.slot);
        NotifyAmmo();
    }

    private void Shoot()
    {
        ActiveWeapon.currentAmmo--;
        NotifyAmmo();

        if (muzzleFlash != null) muzzleFlash.Play();
        if (audioSource != null && ActiveWeapon.shootSfx != null)
        {
            audioSource.PlayOneShot(ActiveWeapon.shootSfx);
        }

        // Perform raycast(s) - 1 for rifle/sniper, multiple for shotgun pellets
        int pelletCount = Mathf.Max(1, ActiveWeapon.pelletsPerShot);
        float spread = isAimingDownSights ? ActiveWeapon.adsSpread : ActiveWeapon.hipfireSpread;

        for (int i = 0; i < pelletCount; i++)
        {
            Vector3 shootDirection = fpsCamera.transform.forward;
            if (spread > 0f)
            {
                shootDirection += fpsCamera.transform.right * Random.Range(-spread, spread) +
                                  fpsCamera.transform.up * Random.Range(-spread, spread);
                shootDirection.Normalize();
            }

            Ray ray = new Ray(fpsCamera.transform.position, shootDirection);
            Vector3 hitPoint = ray.origin + ray.direction * ActiveWeapon.range;

            if (Physics.Raycast(ray, out RaycastHit hit, ActiveWeapon.range, hitMask))
            {
                hitPoint = hit.point;

                // Dispatch damage to target via IDamageable
                IDamageable damageable = hit.collider.GetComponent<IDamageable>();
                if (damageable != null)
                {
                    damageable.TakeDamage(ActiveWeapon.damage);
                    OnHitEnemy?.Invoke();
                }

                // Spawn impact VFX
                if (impactEffectPrefab != null)
                {
                    Instantiate(impactEffectPrefab, hit.point, Quaternion.LookRotation(hit.normal));
                }
            }

            // Spawn bullet tracer
            if (bulletTracerPrefab != null && muzzlePoint != null)
            {
                StartCoroutine(SpawnTracer(muzzlePoint.position, hitPoint));
            }
        }
    }

    private IEnumerator SpawnTracer(Vector3 start, Vector3 end)
    {
        TrailRenderer tracer = Instantiate(bulletTracerPrefab, start, Quaternion.identity);
        float time = 0f;
        while (time < 0.05f)
        {
            tracer.transform.position = Vector3.Lerp(start, end, time / 0.05f);
            time += Time.deltaTime;
            yield return null;
        }
        tracer.transform.position = end;
        Destroy(tracer.gameObject, 0.2f);
    }

    private IEnumerator ReloadCoroutine()
    {
        isReloading = true;
        if (audioSource != null && ActiveWeapon.reloadSfx != null)
        {
            audioSource.PlayOneShot(ActiveWeapon.reloadSfx);
        }

        yield return new WaitForSeconds(ActiveWeapon.reloadTime);

        int neededAmmo = ActiveWeapon.magazineCapacity - ActiveWeapon.currentAmmo;
        int ammoToLoad = Mathf.Min(neededAmmo, ActiveWeapon.reserveAmmo);

        ActiveWeapon.currentAmmo += ammoToLoad;
        ActiveWeapon.reserveAmmo -= ammoToLoad;

        isReloading = false;
        NotifyAmmo();
    }

    private void NotifyAmmo()
    {
        OnAmmoChanged?.Invoke(ActiveWeapon.currentAmmo, ActiveWeapon.reserveAmmo, ActiveWeapon.weaponName);
    }
}`
    },
    {
      id: 'humanoid-enemy-ai',
      name: 'HumanoidEnemyAI.cs',
      filename: 'HumanoidEnemyAI.cs',
      category: 'AI',
      description: 'Humanoid Battle Royale bot AI with realistic human anatomy, tactical rifle weapon, NavMesh pathfinding, cover-seeking, bursts of fire, hit reactions, and death loot drops.',
      dependencies: ['UnityEngine', 'UnityEngine.AI', 'IDamageable'],
      unityComponentsRequired: ['NavMeshAgent', 'Animator', 'Collider'],
      code: `using System.Collections;
using UnityEngine;
using UnityEngine.AI;

/// <summary>
/// Humanoid Battle Royale Bot AI.
/// Features tactical waypoint roaming, player detection cone, line-of-sight checks,
/// rifle burst firing with tracers, strafing, cover seeking, and loot drops upon death.
/// </summary>
[RequireComponent(typeof(NavMeshAgent))]
public class HumanoidEnemyAI : MonoBehaviour, IDamageable
{
    public enum BotState { Patrol, Search, Chase, AttackInCover, Dead }

    [Header("Bot Identification")]
    [SerializeField] private string botName = "Bot_Recon";
    [SerializeField] private float maxHealth = ${settings.enemyHealth.toFixed(1)}f;
    private float currentHealth;

    [Header("Combat & Weapon")]
    [SerializeField] private float rifleDamage = ${settings.enemyDamage.toFixed(1)}f;
    [SerializeField] private float attackRange = ${settings.attackRange.toFixed(1)}f;
    [SerializeField] private float fireRate = 3.0f; // bursts per sec
    [SerializeField] private Transform rifleMuzzle;
    [SerializeField] private ParticleSystem muzzleFlash;
    [SerializeField] private TrailRenderer bulletTracer;

    [Header("Vision & Detection")]
    [SerializeField] private float detectionRadius = ${settings.detectionRadius.toFixed(1)}f;
    [SerializeField] private float fieldOfViewAngle = 110f;
    [SerializeField] private LayerMask obstacleMask;
    [SerializeField] private Transform eyeTransform;

    [Header("Navigation")]
    [SerializeField] private Transform[] patrolWaypoints;
    [SerializeField] private float patrolSpeed = ${settings.enemyPatrolSpeed.toFixed(1)}f;
    [SerializeField] private float combatSpeed = ${settings.enemySpeed.toFixed(1)}f;

    [Header("Loot Drop on Death")]
    [SerializeField] private GameObject[] lootPrefabs;

    private NavMeshAgent agent;
    private Transform playerTransform;
    private BotState currentState = BotState.Patrol;
    private int currentWaypointIndex = 0;
    private float nextFireTime = 0f;
    private bool isDead = false;

    // Animator hashes for human animations (Walk, Run, Aim, Shoot, Die)
    private Animator animator;
    private static readonly int SpeedHash = Animator.StringToHash("Speed");
    private static readonly int ShootHash = Animator.StringToHash("Shoot");
    private static readonly int DieHash = Animator.StringToHash("Die");

    private void Awake()
    {
        agent = GetComponent<NavMeshAgent>();
        animator = GetComponentInChildren<Animator>();
        currentHealth = maxHealth;

        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player != null) playerTransform = player.transform;
    }

    private void Start()
    {
        agent.speed = patrolSpeed;
        SetNextPatrolDestination();
    }

    private void Update()
    {
        if (isDead) return;

        UpdateAnimator();

        switch (currentState)
        {
            case BotState.Patrol:
                HandlePatrol();
                if (CanSeePlayer()) SwitchState(BotState.Chase);
                break;

            case BotState.Chase:
                HandleChase();
                break;

            case BotState.AttackInCover:
                HandleAttack();
                break;
        }
    }

    private void SwitchState(BotState newState)
    {
        currentState = newState;
        if (currentState == BotState.Patrol) agent.speed = patrolSpeed;
        if (currentState == BotState.Chase) agent.speed = combatSpeed;
        if (currentState == BotState.AttackInCover) agent.speed = combatSpeed * 0.5f;
    }

    private void HandlePatrol()
    {
        if (patrolWaypoints == null || patrolWaypoints.Length == 0) return;
        if (!agent.pathPending && agent.remainingDistance <= agent.stoppingDistance + 0.5f)
        {
            currentWaypointIndex = (currentWaypointIndex + 1) % patrolWaypoints.Length;
            SetNextPatrolDestination();
        }
    }

    private void SetNextPatrolDestination()
    {
        if (patrolWaypoints != null && patrolWaypoints.Length > 0)
        {
            agent.SetDestination(patrolWaypoints[currentWaypointIndex].position);
        }
    }

    private void HandleChase()
    {
        if (playerTransform == null) return;

        agent.SetDestination(playerTransform.position);
        float distance = Vector3.Distance(transform.position, playerTransform.position);

        if (distance <= attackRange)
        {
            SwitchState(BotState.AttackInCover);
        }
        else if (distance > detectionRadius * 1.5f && !CanSeePlayer())
        {
            SwitchState(BotState.Patrol);
        }
    }

    private void HandleAttack()
    {
        if (playerTransform == null) return;

        // Face player while shooting
        Vector3 lookPos = playerTransform.position;
        lookPos.y = transform.position.y;
        transform.LookAt(lookPos);

        float distance = Vector3.Distance(transform.position, playerTransform.position);
        if (distance > attackRange * 1.25f)
        {
            SwitchState(BotState.Chase);
            return;
        }

        // Fire rifle bursts
        if (Time.time >= nextFireTime)
        {
            nextFireTime = Time.time + (1f / fireRate);
            FireAtPlayer();
        }
    }

    private void FireAtPlayer()
    {
        if (muzzleFlash != null) muzzleFlash.Play();
        if (animator != null) animator.SetTrigger(ShootHash);

        // Raycast toward player chest with small human aim inaccuracy
        Vector3 target = playerTransform.position + Vector3.up * 1.0f + Random.insideUnitSphere * 0.4f;
        Vector3 dir = (target - rifleMuzzle.position).normalized;

        if (Physics.Raycast(rifleMuzzle.position, dir, out RaycastHit hit, attackRange * 1.5f))
        {
            IDamageable targetDamageable = hit.collider.GetComponent<IDamageable>();
            if (targetDamageable != null)
            {
                targetDamageable.TakeDamage(rifleDamage);
            }
        }
    }

    private bool CanSeePlayer()
    {
        if (playerTransform == null) return false;

        Vector3 eyePos = eyeTransform != null ? eyeTransform.position : transform.position + Vector3.up * 1.6f;
        Vector3 dirToPlayer = (playerTransform.position + Vector3.up * 1.2f) - eyePos;
        float dist = dirToPlayer.magnitude;

        if (dist > detectionRadius) return false;

        // Check field of view
        float angle = Vector3.Angle(transform.forward, dirToPlayer.normalized);
        if (angle > fieldOfViewAngle * 0.5f) return false;

        // Raycast to check for line of sight
        if (Physics.Raycast(eyePos, dirToPlayer.normalized, out RaycastHit hit, dist, ~0, QueryTriggerInteraction.Ignore))
        {
            return hit.collider.CompareTag("Player");
        }

        return false;
    }

    private void UpdateAnimator()
    {
        if (animator != null)
        {
            animator.SetFloat(SpeedHash, agent.velocity.magnitude);
        }
    }

    public void TakeDamage(float damage)
    {
        if (isDead) return;

        currentHealth -= damage;

        // Instantly alert bot to shooter location
        if (currentState == BotState.Patrol && playerTransform != null)
        {
            SwitchState(BotState.Chase);
        }

        if (currentHealth <= 0f)
        {
            Die();
        }
    }

    private void Die()
    {
        isDead = true;
        currentState = BotState.Dead;
        agent.isStopped = true;

        if (animator != null) animator.SetTrigger(DieHash);

        // Spawn loot crate / weapon drop
        if (lootPrefabs != null && lootPrefabs.Length > 0)
        {
            GameObject chosen = lootPrefabs[Random.Range(0, lootPrefabs.Length)];
            Instantiate(chosen, transform.position + Vector3.up * 0.5f, Quaternion.identity);
        }

        Destroy(gameObject, 3.5f);
    }
}`
    },
    {
      id: 'storm-zone',
      name: 'StormZone.cs',
      filename: 'StormZone.cs',
      category: 'BattleRoyale',
      description: 'Battle Royale safe zone circle controller. Handles progressive storm shrink phases, center relocation, edge shader rendering, and periodic electrical damage to players caught outside.',
      dependencies: ['UnityEngine'],
      unityComponentsRequired: ['LineRenderer (or Cylinder Mesh)'],
      code: `using System.Collections;
using UnityEngine;

/// <summary>
/// Battle Royale Shrinking Safe Zone (The Storm).
/// Shrinks across multiple timed phases, alerts players with countdowns,
/// and inflicts ticking storm damage to anyone outside the safe boundary.
/// </summary>
public class StormZone : MonoBehaviour
{
    [System.Serializable]
    public class StormPhase
    {
        public float targetRadius = 50f;
        public float shrinkDuration = 45f;
        public float waitDuration = 30f;
        public float damagePerSecond = 5f;
    }

    [Header("Storm Configuration")]
    [SerializeField] private StormPhase[] phases;
    [SerializeField] private float initialRadius = ${settings.initialStormRadius.toFixed(0)}f;
    [SerializeField] private Transform stormVisualCylinder;

    [Header("Damage Settings")]
    [SerializeField] private float tickRate = 1.0f; // seconds per damage tick
    [SerializeField] private LayerMask playerMask;

    private int currentPhaseIndex = 0;
    private float currentRadius;
    private Vector3 currentCenter;
    private Vector3 targetCenter;
    private bool isShrinking = false;
    private float nextDamageTickTime = 0f;

    // Events for UI HUD and Audio
    public static event System.Action<float, float> OnStormRadiusUpdated; // (currentRadius, maxRadius)
    public static event System.Action<int, float, bool> OnStormPhaseChanged; // (phaseIndex, remainingTime, isShrinking)
    public static event System.Action OnPlayerStormDamage;

    public float CurrentRadius => currentRadius;
    public Vector3 CurrentCenter => currentCenter;

    private void Awake()
    {
        currentRadius = initialRadius;
        currentCenter = transform.position;
        targetCenter = transform.position;
        UpdateVisuals();
    }

    private void Start()
    {
        StartCoroutine(StormCycle());
    }

    private void Update()
    {
        UpdateVisuals();
        CheckPlayerInStorm();
    }

    private IEnumerator StormCycle()
    {
        for (int i = 0; i < phases.Length; i++)
        {
            currentPhaseIndex = i;
            StormPhase phase = phases[i];

            // 1. Wait phase (Safe zone is static, players loot and fight)
            isShrinking = false;
            float waitTimer = phase.waitDuration;
            while (waitTimer > 0f)
            {
                OnStormPhaseChanged?.Invoke(i + 1, waitTimer, false);
                waitTimer -= Time.deltaTime;
                yield return null;
            }

            // 2. Shrink phase (Circle moves and shrinks)
            isShrinking = true;
            float startRadius = currentRadius;
            Vector3 startCenter = currentCenter;

            // Pick a randomized new center within the current radius
            Vector2 randomCircle = Random.insideUnitCircle * (startRadius - phase.targetRadius) * 0.7f;
            targetCenter = currentCenter + new Vector3(randomCircle.x, 0f, randomCircle.y);

            float elapsed = 0f;
            while (elapsed < phase.shrinkDuration)
            {
                float t = elapsed / phase.shrinkDuration;
                currentRadius = Mathf.Lerp(startRadius, phase.targetRadius, t);
                currentCenter = Vector3.Lerp(startCenter, targetCenter, t);
                transform.position = currentCenter;

                OnStormPhaseChanged?.Invoke(i + 1, phase.shrinkDuration - elapsed, true);
                OnStormRadiusUpdated?.Invoke(currentRadius, initialRadius);

                elapsed += Time.deltaTime;
                yield return null;
            }

            currentRadius = phase.targetRadius;
            currentCenter = targetCenter;
        }
    }

    private void CheckPlayerInStorm()
    {
        if (Time.time < nextDamageTickTime) return;
        nextDamageTickTime = Time.time + tickRate;

        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player == null) return;

        Vector3 playerPos = player.transform.position;
        playerPos.y = currentCenter.y;
        float distance = Vector3.Distance(playerPos, currentCenter);

        // Outside safe radius!
        if (distance > currentRadius)
        {
            IDamageable playerDamageable = player.GetComponent<IDamageable>();
            if (playerDamageable != null)
            {
                float dps = phases[Mathf.Min(currentPhaseIndex, phases.Length - 1)].damagePerSecond;
                playerDamageable.TakeDamage(dps * tickRate);
                OnPlayerStormDamage?.Invoke();
            }
        }
    }

    private void UpdateVisuals()
    {
        if (stormVisualCylinder != null)
        {
            // Scale cylinder diameter to match 2 * radius
            stormVisualCylinder.position = currentCenter;
            stormVisualCylinder.localScale = new Vector3(currentRadius * 2f, 80f, currentRadius * 2f);
        }
    }

    private void OnDrawGizmos()
    {
        Gizmos.color = new Color(0.2f, 0.6f, 1f, 0.4f);
        Gizmos.DrawWireSphere(transform.position, currentRadius);
    }
}`
    },
    {
      id: 'loot-item',
      name: 'LootItem.cs',
      filename: 'LootItem.cs',
      category: 'BattleRoyale',
      description: 'Interactable ground loot item & supply drop crate. Supports weapon pickups, medkits (+50 HP), shield potions (+50 Armor), and ammo with rotating 3D models and beacon pillars.',
      dependencies: ['UnityEngine'],
      unityComponentsRequired: ['SphereCollider'],
      code: `using UnityEngine;

public enum LootItemType { AssaultRifle, Shotgun, SniperRifle, Medkit, ShieldPotion, AmmoBox }

/// <summary>
/// Interactable Battle Royale ground loot item.
/// Floats and rotates smoothly with a rarity light beacon.
/// Picks up when player presses 'E' inside trigger radius.
/// </summary>
public class LootItem : MonoBehaviour
{
    [Header("Loot Configuration")]
    [SerializeField] private LootItemType itemType;
    [SerializeField] private string itemName = "Assault Rifle";
    [SerializeField] private int quantity = 1;
    [SerializeField] private Color beaconColor = Color.cyan;

    [Header("Floating Animation")]
    [SerializeField] private float rotationSpeed = 60f;
    [SerializeField] private float bobbingAmplitude = 0.15f;
    [SerializeField] private float bobbingFrequency = 2f;

    [Header("VFX & Beacon")]
    [SerializeField] private Light beaconLight;
    [SerializeField] private ParticleSystem pickupVfx;
    [SerializeField] private AudioClip pickupSfx;

    private Vector3 initialPosition;
    private bool isPlayerInRange = false;

    private void Awake()
    {
        initialPosition = transform.position;
        if (beaconLight != null) beaconLight.color = beaconColor;
    }

    private void Update()
    {
        // Smooth floating and spinning animation
        transform.Rotate(Vector3.up, rotationSpeed * Time.deltaTime, Space.World);
        float newY = initialPosition.y + Mathf.Sin(Time.time * bobbingFrequency) * bobbingAmplitude;
        transform.position = new Vector3(initialPosition.x, newY, initialPosition.z);

        // Interact on 'E'
        if (isPlayerInRange && Input.GetKeyDown(KeyCode.E))
        {
            Pickup();
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            isPlayerInRange = true;
            // Notify HUD of interaction prompt: "Press E to pick up [itemName]"
        }
    }

    private void OnTriggerExit(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            isPlayerInRange = false;
        }
    }

    private void Pickup()
    {
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player == null) return;

        switch (itemType)
        {
            case LootItemType.AssaultRifle:
                player.GetComponent<WeaponSystem>()?.SwitchWeapon(0);
                break;
            case LootItemType.Shotgun:
                player.GetComponent<WeaponSystem>()?.SwitchWeapon(1);
                break;
            case LootItemType.SniperRifle:
                player.GetComponent<WeaponSystem>()?.SwitchWeapon(2);
                break;
            case LootItemType.Medkit:
                player.GetComponent<PlayerHealth>()?.Heal(50f);
                break;
            case LootItemType.ShieldPotion:
                player.GetComponent<PlayerHealth>()?.AddShield(50f);
                break;
        }

        if (pickupSfx != null) AudioSource.PlayClipAtPoint(pickupSfx, transform.position);
        if (pickupVfx != null) Instantiate(pickupVfx, transform.position, Quaternion.identity);

        Destroy(gameObject);
    }
}`
    },
    {
      id: 'player-health',
      name: 'PlayerHealth.cs',
      filename: 'PlayerHealth.cs',
      category: 'Player',
      description: 'Health & Shield Armor system for Battle Royale combat. Damage absorbs from shield first, then health. Handles storm ticks, hit feedback, and game over defeat events.',
      dependencies: ['UnityEngine', 'IDamageable'],
      unityComponentsRequired: [],
      code: `using System;
using UnityEngine;

/// <summary>
/// Manages Player Vitality: 100 Health + 100 Shield Armor.
/// Damage punctures shield first before reducing bodily health.
/// </summary>
public class PlayerHealth : MonoBehaviour, IDamageable
{
    [Header("Vitality Stats")]
    [SerializeField] private float maxHealth = 100f;
    [SerializeField] private float maxShield = 100f;

    private float currentHealth;
    private float currentShield;
    private bool isDead = false;

    public static event Action<float, float, float, float> OnVitalityChanged; // (hp, maxHp, shield, maxShield)
    public static event Action OnPlayerDied;
    public static event Action OnShieldBroken;

    private void Awake()
    {
        currentHealth = maxHealth;
        currentShield = 50f; // Start with standard level 1 shield
    }

    private void Start()
    {
        NotifyVitality();
    }

    public void TakeDamage(float amount)
    {
        if (isDead) return;

        if (currentShield > 0f)
        {
            currentShield -= amount;
            if (currentShield < 0f)
            {
                // Overflow damage penetrates straight into health
                currentHealth += currentShield; // currentShield is negative
                currentShield = 0f;
                OnShieldBroken?.Invoke();
            }
        }
        else
        {
            currentHealth -= amount;
        }

        currentHealth = Mathf.Clamp(currentHealth, 0f, maxHealth);
        NotifyVitality();

        if (currentHealth <= 0f)
        {
            Die();
        }
    }

    public void Heal(float amount)
    {
        if (isDead) return;
        currentHealth = Mathf.Clamp(currentHealth + amount, 0f, maxHealth);
        NotifyVitality();
    }

    public void AddShield(float amount)
    {
        if (isDead) return;
        currentShield = Mathf.Clamp(currentShield + amount, 0f, maxShield);
        NotifyVitality();
    }

    private void Die()
    {
        isDead = true;
        OnPlayerDied?.Invoke();
    }

    private void NotifyVitality()
    {
        OnVitalityChanged?.Invoke(currentHealth, maxHealth, currentShield, maxShield);
    }
}`
    },
    {
      id: 'hud-controller',
      name: 'HUDController.cs',
      filename: 'HUDController.cs',
      category: 'UI',
      description: 'Battle Royale Heads-Up Display: compass ribbon, mini-map safe circle, dynamic crosshair bloom, alive/kill counter, kill feed notifications, and Victory Royale banner.',
      dependencies: ['UnityEngine', 'UnityEngine.UI'],
      unityComponentsRequired: ['Canvas'],
      code: `using System.Collections;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Battle Royale HUD Controller.
/// Coordinates Health/Shield bars, dynamic weapon slots, Alive counter,
/// compass angle, storm timer, kill feed, and Victory Royale #1 celebration.
/// </summary>
public class HUDController : MonoBehaviour
{
    [Header("Vitality UI")]
    [SerializeField] private Slider healthSlider;
    [SerializeField] private Slider shieldSlider;
    [SerializeField] private Text healthText;
    [SerializeField] private Image damageVignette;

    [Header("Ammo & Weapon")]
    [SerializeField] private Text ammoText;
    [SerializeField] private Text weaponNameText;

    [Header("Battle Royale Telemetry")]
    [SerializeField] private Text aliveCountText;
    [SerializeField] private Text killCountText;
    [SerializeField] private Text stormTimerText;
    [SerializeField] private RectTransform compassBar;

    [Header("Dynamic Crosshair & Hitmarker")]
    [SerializeField] private RectTransform crosshairReticle;
    [SerializeField] private Image hitmarkerImage;

    [Header("Victory Royale Screen")]
    [SerializeField] private GameObject victoryBanner;
    [SerializeField] private GameObject defeatBanner;

    private int kills = 0;

    private void OnEnable()
    {
        PlayerHealth.OnVitalityChanged += UpdateVitality;
        PlayerHealth.OnPlayerDied += ShowDefeat;
        WeaponSystem.OnAmmoChanged += UpdateAmmo;
        WeaponSystem.OnHitEnemy += FlashHitmarker;
        StormZone.OnStormPhaseChanged += UpdateStormTimer;
    }

    private void OnDisable()
    {
        PlayerHealth.OnVitalityChanged -= UpdateVitality;
        PlayerHealth.OnPlayerDied -= ShowDefeat;
        WeaponSystem.OnAmmoChanged -= UpdateAmmo;
        WeaponSystem.OnHitEnemy -= FlashHitmarker;
        StormZone.OnStormPhaseChanged -= UpdateStormTimer;
    }

    private void UpdateVitality(float hp, float maxHp, float shield, float maxShield)
    {
        if (healthSlider != null) healthSlider.value = hp / maxHp;
        if (shieldSlider != null) shieldSlider.value = shield / maxShield;
        if (healthText != null) healthText.text = $"HP {Mathf.CeilToInt(hp)}";
    }

    private void UpdateAmmo(int current, int reserve, string weaponName)
    {
        if (ammoText != null) ammoText.text = $"{current} / {reserve}";
        if (weaponNameText != null) weaponNameText.text = weaponName;
    }

    private void UpdateStormTimer(int phase, float remaining, bool isShrinking)
    {
        if (stormTimerText == null) return;
        int mins = Mathf.FloorToInt(remaining / 60f);
        int secs = Mathf.FloorToInt(remaining % 60f);
        string status = isShrinking ? "STORM SHRINKING" : "NEXT SAFE ZONE";
        stormTimerText.text = $"{status}: {mins:00}:{secs:00}";
    }

    public void UpdateMatchStats(int alive, int killTotal)
    {
        if (aliveCountText != null) aliveCountText.text = $"ALIVE: {alive}";
        if (killCountText != null) killCountText.text = $"KILLS: {killTotal}";
    }

    public void FlashHitmarker()
    {
        if (hitmarkerImage != null)
        {
            StopCoroutine(nameof(HitmarkerRoutine));
            StartCoroutine(nameof(HitmarkerRoutine));
        }
    }

    private IEnumerator HitmarkerRoutine()
    {
        hitmarkerImage.enabled = true;
        yield return new WaitForSeconds(0.08f);
        hitmarkerImage.enabled = false;
    }

    public void ShowVictory()
    {
        if (victoryBanner != null) victoryBanner.SetActive(true);
    }

    public void ShowDefeat()
    {
        if (defeatBanner != null) defeatBanner.SetActive(true);
    }
}`
    },
    {
      id: 'game-manager',
      name: 'GameManager.cs',
      filename: 'GameManager.cs',
      category: 'BattleRoyale',
      description: 'Battle Royale Match Director. Orchestrates match drop sequence, bot roster management, simulated kill feed, storm progression, and Victory Royale trigger when 1 player remains.',
      dependencies: ['UnityEngine'],
      unityComponentsRequired: [],
      code: `using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Battle Royale Match Director.
/// Spawns 15-50 players across the open world map, runs the kill feed,
/// counts surviving players, and triggers the Victory Royale champion screen.
/// </summary>
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("Match Settings")]
    [SerializeField] private int initialTotalPlayers = 15;
    [SerializeField] private float botSimulatedKillInterval = 12f;

    [Header("Spawning & Map")]
    [SerializeField] private Transform[] dropSpawnPoints;
    [SerializeField] private GameObject botPrefab;

    private int playersAlive;
    private int playerKills = 0;
    private bool isMatchActive = true;

    public int PlayersAlive => playersAlive;
    public int PlayerKills => playerKills;

    private void Awake()
    {
        if (Instance == null) Instance = this;
        else Destroy(gameObject);

        playersAlive = initialTotalPlayers;
    }

    private void Start()
    {
        StartCoroutine(SimulateBotEliminations());
    }

    /// <summary>
    /// Called when the player eliminates a bot.
    /// </summary>
    public void RegisterPlayerKill(string botName)
    {
        if (!isMatchActive) return;

        playerKills++;
        playersAlive--;

        FindObjectOfType<HUDController>()?.UpdateMatchStats(playersAlive, playerKills);

        if (playersAlive <= 1)
        {
            TriggerVictoryRoyale();
        }
    }

    /// <summary>
    /// Simulates bots fighting each other in other sectors of the big map.
    /// </summary>
    private IEnumerator SimulateBotEliminations()
    {
        string[] weapons = { "Assault Rifle", "Pump Shotgun", "Bolt Sniper", "Storm" };
        string[] botNames = { "Bot_Viper", "Bot_Ghost", "Bot_Apex", "Bot_Shadow", "Bot_Titan", "Bot_Echo" };

        while (isMatchActive && playersAlive > 2)
        {
            yield return new WaitForSeconds(Random.Range(botSimulatedKillInterval * 0.7f, botSimulatedKillInterval * 1.3f));

            if (playersAlive > 2)
            {
                playersAlive--;
                FindObjectOfType<HUDController>()?.UpdateMatchStats(playersAlive, playerKills);
            }
        }
    }

    private void TriggerVictoryRoyale()
    {
        isMatchActive = false;
        FindObjectOfType<HUDController>()?.ShowVictory();
    }
}`
    },
    {
      id: 'idamageable',
      name: 'IDamageable.cs',
      filename: 'IDamageable.cs',
      category: 'Architecture',
      description: 'Decoupled interface enabling weapons, storm zones, and hazards to dispatch damage to players and AI bots without tight class coupling.',
      dependencies: [],
      unityComponentsRequired: [],
      code: `/// <summary>
/// Interface implemented by any combatant or entity that can receive damage.
/// Decouples weapon raycasting and storm systems from specific concrete classes.
/// </summary>
public interface IDamageable
{
    /// <summary>
    /// Applies damage to the implementing entity.
    /// </summary>
    /// <param name="amount">Amount of raw damage to inflict.</param>
    void TakeDamage(float amount);
}`
    }
  ];
}
