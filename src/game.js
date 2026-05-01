import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const canvas = document.querySelector("#game");
const scoreNode = document.querySelector("#score");
const waveNode = document.querySelector("#wave");
const targetsLeftNode = document.querySelector("#targets-left");
const bestKillsNode = document.querySelector("#best-kills");
const moneyNode = document.querySelector("#money");
const healthFillNode = document.querySelector("#health-fill");
const healthValueNode = document.querySelector("#health-value");
const weaponNameNode = document.querySelector("#weapon-name");
const startPanel = document.querySelector("#start-panel");
const playButton = document.querySelector("#play-button");
const cameraModeButton = document.querySelector("#camera-mode-button");
const hitMarker = document.querySelector("#hit-marker");
const damageFlash = document.querySelector("#damage-flash");
const shopButtons = Array.from(document.querySelectorAll("[data-weapon]"));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9dc8df);
scene.fog = new THREE.Fog(0x9dc8df, 28, 86);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(74, 1, 0.1, 160);
camera.position.set(0, 1.72, 11);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const worldForward = new THREE.Vector3();
const worldRight = new THREE.Vector3();
const shotRight = new THREE.Vector3();
const shotUp = new THREE.Vector3();
const moveVector = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();
const muzzleWorld = new THREE.Vector3();
const playerPosition = new THREE.Vector3(0, 0, 11);
const cameraTargetPosition = new THREE.Vector3();
const cameraLookAt = new THREE.Vector3();
const avatarMuzzle = new THREE.Object3D();
const yAxis = new THREE.Vector3(0, 1, 0);
const playerVelocity = new THREE.Vector3();
const lookSway = new THREE.Vector2();

const input = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  fire: false,
};

const player = {
  yaw: 0,
  pitch: 0,
  height: 1.72,
  radius: 0.48,
  speed: 6.4,
  sprintSpeed: 9.4,
};

const cameraState = {
  mode: "first",
};

const WEAPONS = {
  pistol: {
    id: "pistol",
    label: "Пистолет",
    cost: 0,
    damage: 46,
    cooldown: 0.34,
    range: 70,
    spread: 0.004,
    reward: 24,
    auto: false,
  },
  bow: {
    id: "bow",
    label: "Лук",
    cost: 140,
    damage: 135,
    cooldown: 0.82,
    range: 86,
    spread: 0.001,
    reward: 28,
    auto: false,
  },
  rifle: {
    id: "rifle",
    label: "Автомат",
    cost: 360,
    damage: 34,
    cooldown: 0.105,
    range: 82,
    spread: 0.014,
    reward: 24,
    auto: true,
  },
  sword: {
    id: "sword",
    label: "Меч",
    cost: 240,
    damage: 155,
    cooldown: 0.42,
    range: 3.1,
    reward: 34,
    auto: false,
    melee: true,
  },
  machinegun: {
    id: "machinegun",
    label: "Пулемет",
    cost: 760,
    damage: 28,
    cooldown: 0.058,
    range: 88,
    spread: 0.025,
    reward: 22,
    auto: true,
  },
};

const WEAPON_ORDER = ["pistol", "bow", "rifle", "sword", "machinegun"];

const weapon = {
  root: new THREE.Group(),
  basePosition: new THREE.Vector3(0.34, -0.31, -0.68),
  recoil: 0,
  nextAttackAt: 0,
};

const playerAvatar = new THREE.Group();
const BEST_KILLS_KEY = "wasd-range-best-zombie-kills";

const bounds = {
  minX: -56,
  maxX: 56,
  minZ: -58,
  maxZ: 50,
};

const game = {
  score: 0,
  streak: 0,
  wave: 0,
  health: 100,
  maxHealth: 100,
  kills: 0,
  bestKills: readBestKills(),
  money: 0,
  weaponId: "pistol",
  unlockedWeapons: new Set(["pistol"]),
  over: false,
  targets: [],
  targetMeshes: [],
  shots: [],
  particles: [],
};

const zombieCoverTexture = createFallbackCoverTexture();

const materials = {
  floor: new THREE.MeshStandardMaterial({ color: 0x627668, roughness: 0.86 }),
  grid: new THREE.LineBasicMaterial({ color: 0xd8e3df, transparent: true, opacity: 0.24 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x344047, roughness: 0.76 }),
  wallCap: new THREE.MeshStandardMaterial({ color: 0xbfc5bb, roughness: 0.72 }),
  post: new THREE.MeshStandardMaterial({ color: 0x2f3941, roughness: 0.68 }),
  targetBody: new THREE.MeshStandardMaterial({
    color: 0xd83243,
    emissive: 0x250306,
    roughness: 0.46,
  }),
  targetRing: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.38,
  }),
  targetCore: new THREE.MeshStandardMaterial({
    color: 0xffd86b,
    emissive: 0x4a3100,
    roughness: 0.34,
  }),
  muzzle: new THREE.MeshBasicMaterial({
    color: 0xfff1a8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }),
  tracer: new THREE.LineBasicMaterial({
    color: 0x9ee8ff,
    transparent: true,
    opacity: 0.75,
  }),
  particle: new THREE.MeshBasicMaterial({
    color: 0xffd86b,
    transparent: true,
    opacity: 0.95,
  }),
  gunSlide: new THREE.MeshStandardMaterial({
    color: 0x1a2028,
    metalness: 0.55,
    roughness: 0.36,
  }),
  gunBody: new THREE.MeshStandardMaterial({
    color: 0x252f38,
    metalness: 0.25,
    roughness: 0.48,
  }),
  gunGrip: new THREE.MeshStandardMaterial({
    color: 0x17120f,
    roughness: 0.62,
  }),
  gunSight: new THREE.MeshStandardMaterial({
    color: 0x90f0ff,
    emissive: 0x12404a,
    roughness: 0.25,
  }),
  bowWood: new THREE.MeshStandardMaterial({
    color: 0x5a3320,
    roughness: 0.62,
  }),
  blade: new THREE.MeshStandardMaterial({
    color: 0xdfe8ef,
    metalness: 0.62,
    roughness: 0.2,
  }),
  weaponAccent: new THREE.MeshStandardMaterial({
    color: 0xffd86b,
    emissive: 0x3a2600,
    roughness: 0.34,
  }),
  hand: new THREE.MeshStandardMaterial({
    color: 0xd09b72,
    roughness: 0.78,
  }),
  playerSuit: new THREE.MeshStandardMaterial({
    color: 0x2f6f86,
    roughness: 0.58,
  }),
  playerVest: new THREE.MeshStandardMaterial({
    color: 0x1c252d,
    roughness: 0.52,
  }),
  zombieCover: new THREE.MeshStandardMaterial({
    map: zombieCoverTexture,
    roughness: 0.58,
    side: THREE.DoubleSide,
  }),
  zombieBack: new THREE.MeshStandardMaterial({
    color: 0x4b111b,
    roughness: 0.7,
  }),
  zombieLimb: new THREE.MeshStandardMaterial({
    color: 0x283643,
    roughness: 0.74,
  }),
  zombieSkin: new THREE.MeshStandardMaterial({
    color: 0x9fc28f,
    roughness: 0.82,
  }),
  zombieCloth: new THREE.MeshStandardMaterial({
    color: 0x5b1822,
    roughness: 0.72,
  }),
  zombiePants: new THREE.MeshStandardMaterial({
    color: 0x222b38,
    roughness: 0.78,
  }),
  zombieEye: new THREE.MeshBasicMaterial({
    color: 0xffe66d,
  }),
};

loadZombieCoverImage();

const muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), materials.muzzle);
muzzleFlash.frustumCulled = false;
createWeapon();
scene.add(camera);

setupLights();
setupArena();
createPlayerAvatar();
syncCameraMode();
spawnWave();
resize();
updateHud();
animate();

playButton.addEventListener("click", () => {
  if (game.over) {
    resetGame();
  }

  canvas.requestPointerLock();
});

cameraModeButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleCameraMode();

  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
});

for (const button of shopButtons) {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    buyOrSelectWeapon(button.dataset.weapon);
  });
}

canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();

  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
    return;
  }

  input.fire = true;
  useCurrentWeapon();
});

window.addEventListener("mouseup", (event) => {
  if (event.button === 0) {
    input.fire = false;
  }
});

document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === canvas;
  startPanel.classList.toggle("hidden", locked);

  if (!locked) {
    clearInput();
  }
});

window.addEventListener("resize", resize);

window.addEventListener("keydown", (event) => {
  if (event.code.startsWith("Digit")) {
    const index = Number.parseInt(event.code.slice(5), 10) - 1;
    const weaponId = WEAPON_ORDER[index];
    if (weaponId) {
      event.preventDefault();
      buyOrSelectWeapon(weaponId);
      return;
    }
  }

  if (event.code === "KeyV" && !event.repeat) {
    event.preventDefault();
    toggleCameraMode();
    return;
  }

  if (isControlKey(event.code)) {
    event.preventDefault();
  }

  setKey(event.code, true);
});

window.addEventListener("keyup", (event) => {
  if (isControlKey(event.code)) {
    event.preventDefault();
  }

  setKey(event.code, false);
});

window.addEventListener("blur", clearInput);
window.addEventListener("contextmenu", (event) => event.preventDefault());

window.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas) {
    return;
  }

  const sensitivity = 0.00155;
  player.yaw -= event.movementX * sensitivity;
  player.pitch -= event.movementY * sensitivity;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.22, 1.18);

  lookSway.x = THREE.MathUtils.clamp(lookSway.x + event.movementX * 0.00065, -0.08, 0.08);
  lookSway.y = THREE.MathUtils.clamp(lookSway.y + event.movementY * 0.00065, -0.08, 0.08);
});

function isControlKey(code) {
  return (
    code === "KeyW" ||
    code === "KeyA" ||
    code === "KeyS" ||
    code === "KeyD" ||
    code === "ArrowUp" ||
    code === "ArrowDown" ||
    code === "ArrowLeft" ||
    code === "ArrowRight" ||
    code === "ShiftLeft" ||
    code === "ShiftRight"
  );
}

function setKey(code, pressed) {
  if (code === "KeyW" || code === "ArrowUp") input.forward = pressed;
  if (code === "KeyS" || code === "ArrowDown") input.backward = pressed;
  if (code === "KeyA" || code === "ArrowLeft") input.left = pressed;
  if (code === "KeyD" || code === "ArrowRight") input.right = pressed;
  if (code === "ShiftLeft" || code === "ShiftRight") input.sprint = pressed;
}

function clearInput() {
  input.forward = false;
  input.backward = false;
  input.left = false;
  input.right = false;
  input.sprint = false;
  input.fire = false;
}

function toggleCameraMode() {
  cameraState.mode = cameraState.mode === "first" ? "third" : "first";
  syncCameraMode();
}

function syncCameraMode() {
  const firstPerson = cameraState.mode === "first";
  weapon.root.visible = firstPerson;
  playerAvatar.visible = !firstPerson;
  cameraModeButton.textContent = firstPerson ? "3-е лицо" : "1-е лицо";

  if (firstPerson) {
    weapon.root.add(muzzleFlash);
    muzzleFlash.position.set(0.02, 0.04, -0.9);
  } else {
    avatarMuzzle.add(muzzleFlash);
    muzzleFlash.position.set(0, 0, 0);
  }
}

function currentWeapon() {
  return WEAPONS[game.weaponId] ?? WEAPONS.pistol;
}

function buyOrSelectWeapon(weaponId) {
  const item = WEAPONS[weaponId];
  if (!item) {
    return;
  }

  if (!game.unlockedWeapons.has(weaponId)) {
    if (game.money < item.cost) {
      updateHud();
      return;
    }

    game.money -= item.cost;
    game.unlockedWeapons.add(weaponId);
  }

  game.weaponId = weaponId;
  updateWeaponModel();
  updateHud();
}

function updateWeaponModel() {
  const weaponId = game.weaponId;
  const pistolVisible = weaponId === "pistol";

  for (const part of weapon.root.userData.pistolParts ?? []) {
    part.visible = pistolVisible;
  }

  const visuals = weapon.root.userData.weaponVisuals ?? {};
  for (const [id, model] of Object.entries(visuals)) {
    model.visible = id === weaponId;
  }

  weapon.basePosition.set(0.34, weaponId === "sword" ? -0.25 : -0.31, weaponId === "sword" ? -0.6 : -0.68);
}

function readBestKills() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KILLS_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function saveBestKills(value) {
  try {
    window.localStorage.setItem(BEST_KILLS_KEY, String(value));
  } catch {
  }
}

function loadZombieCoverImage() {
  const loader = new THREE.TextureLoader();
  const applyTexture = (texture) => {
    prepareZombieTexture(texture);
    materials.zombieCover.map = texture;
    materials.zombieCover.needsUpdate = true;
  };
  const useFallback = () => {
    materials.zombieCover.map = zombieCoverTexture;
    materials.zombieCover.needsUpdate = true;
  };

  loader.load("./download.png", applyTexture, undefined, () => {
    loader.load("./assets/zombie-cover.png", applyTexture, undefined, useFallback);
  });
}

function prepareZombieTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1;
  texture.offset.x = 1;
  texture.needsUpdate = true;
}

function createFallbackCoverTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 768;
  const ctx = textureCanvas.getContext("2d");

  ctx.fillStyle = "#f7f7f2";
  ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

  ctx.fillStyle = "#d9002f";
  ctx.fillRect(38, 28, 436, 210);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 154px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ЕГЭ", 256, 182);

  ctx.fillStyle = "#0b3157";
  ctx.fillRect(0, 270, 512, 140);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(70, 302, 372, 68);
  ctx.fillStyle = "#111111";
  ctx.font = "700 24px Arial, sans-serif";
  ctx.fillText("ЕДИНЫЙ ГОСУДАРСТВЕННЫЙ", 256, 332);
  ctx.fillText("ЭКЗАМЕН", 256, 360);

  ctx.fillStyle = "#d9002f";
  ctx.fillRect(38, 402, 436, 110);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 66px Arial, sans-serif";
  ctx.fillText("МАТЕМАТИКА", 256, 478);

  ctx.fillStyle = "#f4f0e6";
  ctx.fillRect(82, 530, 348, 68);
  ctx.fillStyle = "#111111";
  ctx.font = "700 30px Arial, sans-serif";
  ctx.fillText("ПРОФИЛЬ", 256, 575);

  ctx.fillStyle = "#d9002f";
  ctx.fillRect(0, 626, 512, 142);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(256, 676, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9002f";
  ctx.font = "900 52px Arial, sans-serif";
  ctx.fillText("10", 256, 694);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(58, 638, 78, 78);
  ctx.fillStyle = "#111111";
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      if ((x * 3 + y * 5) % 4 < 2) {
        ctx.fillRect(66 + x * 9, 646 + y * 9, 7, 7);
      }
    }
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  prepareZombieTexture(texture);
  return texture;
}

function setupLights() {
  const hemi = new THREE.HemisphereLight(0xe7f7ff, 0x596349, 1.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-12, 22, 10);
  sun.castShadow = true;
  sun.shadow.camera.left = -38;
  sun.shadow.camera.right = 38;
  sun.shadow.camera.top = 36;
  sun.shadow.camera.bottom = -36;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
}

function setupArena() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(124, 124), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(124, 62, 0xffffff, 0xffffff);
  grid.position.y = 0.012;
  grid.material = materials.grid;
  scene.add(grid);

  const laneMaterial = new THREE.MeshStandardMaterial({ color: 0xc2d265, roughness: 0.7 });
  for (let x = -48; x <= 48; x += 16) {
    const lane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 108), laneMaterial);
    lane.position.set(x, 0.025, -4);
    lane.receiveShadow = true;
    scene.add(lane);
  }

  addWall(0, 1.1, -62, 124, 2.2, 0.9);
  addWall(0, 1.1, 54, 124, 2.2, 0.9);
  addWall(-62, 1.1, -4, 0.9, 2.2, 116);
  addWall(62, 1.1, -4, 0.9, 2.2, 116);

  for (let i = -44; i <= 44; i += 11) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.62, 2.8), materials.wallCap);
    block.position.set(i, 0.31, -15 - Math.abs(i) * 0.1);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
  }

  for (let index = 0; index < 18; index += 1) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 3, 0.72, 2 + Math.random() * 3), materials.wallCap);
    block.position.set((Math.random() - 0.5) * 88, 0.36, (Math.random() - 0.5) * 86);
    if (Math.hypot(block.position.x - playerPosition.x, block.position.z - playerPosition.z) < 12) {
      block.position.x += 16;
    }
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
  }
}

function addWall(x, y, z, width, height, depth) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.wall);
  wall.position.set(x, y, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
}

function createWeapon() {
  weapon.root.position.copy(weapon.basePosition);
  weapon.root.rotation.set(-0.05, -0.03, 0.035);
  camera.add(weapon.root);

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.58), materials.gunSlide);
  slide.position.set(0.02, 0.02, -0.29);
  weapon.root.add(slide);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.4), materials.gunBody);
  frame.position.set(0.02, -0.08, -0.18);
  weapon.root.add(frame);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.46, 18), materials.gunBody);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.02, 0.04, -0.62);
  weapon.root.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.035, 18), materials.gunSlide);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0.02, 0.04, -0.86);
  weapon.root.add(muzzle);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.035), materials.gunSight);
  frontSight.position.set(0.02, 0.13, -0.62);
  weapon.root.add(frontSight);

  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.04), materials.gunSight);
  rearSight.position.set(0.02, 0.13, -0.04);
  weapon.root.add(rearSight);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.18), materials.gunGrip);
  grip.position.set(-0.02, -0.28, 0.02);
  grip.rotation.x = -0.22;
  weapon.root.add(grip);

  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.015, 8, 20), materials.gunBody);
  triggerGuard.position.set(0.02, -0.18, -0.12);
  triggerGuard.rotation.set(Math.PI / 2, 0, 0);
  triggerGuard.scale.set(0.75, 1, 1.25);
  weapon.root.add(triggerGuard);

  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.025), materials.gunSlide);
  trigger.position.set(0.02, -0.19, -0.12);
  trigger.rotation.x = -0.35;
  weapon.root.add(trigger);

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 12), materials.hand);
  rightHand.position.set(-0.05, -0.34, 0.02);
  rightHand.scale.set(0.95, 0.76, 1.1);
  weapon.root.add(rightHand);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 12), materials.hand);
  leftHand.position.set(-0.18, -0.28, -0.28);
  leftHand.scale.set(1.2, 0.68, 0.9);
  leftHand.rotation.z = -0.25;
  weapon.root.add(leftHand);

  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.42, 14), materials.hand);
  forearm.position.set(-0.31, -0.42, -0.08);
  forearm.rotation.set(1.15, 0.12, -0.55);
  weapon.root.add(forearm);

  muzzleFlash.position.set(0.02, 0.04, -0.9);
  weapon.root.add(muzzleFlash);
  weapon.root.userData.pistolParts = weapon.root.children.filter((child) => child !== muzzleFlash);
  createAlternateWeaponModels();
  updateWeaponModel();
}

function createAlternateWeaponModels() {
  weapon.root.userData.weaponVisuals = {
    bow: createBowModel(),
    rifle: createRifleModel(false),
    sword: createSwordModel(),
    machinegun: createRifleModel(true),
  };

  for (const model of Object.values(weapon.root.userData.weaponVisuals)) {
    model.visible = false;
    weapon.root.add(model);
  }
}

function createBowModel() {
  const group = new THREE.Group();
  group.position.set(-0.03, -0.02, -0.14);

  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.68, 10), materials.bowWood);
  upper.position.set(-0.18, 0.16, -0.26);
  upper.rotation.set(0.32, 0.18, -0.28);
  group.add(upper);

  const lower = upper.clone();
  lower.position.y = -0.24;
  lower.rotation.z = 0.28;
  group.add(lower);

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.22, 12), materials.gunGrip);
  grip.position.set(-0.12, -0.04, -0.25);
  grip.rotation.z = 0.05;
  group.add(grip);

  const stringGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.23, 0.48, -0.28),
    new THREE.Vector3(-0.04, -0.04, -0.25),
    new THREE.Vector3(-0.23, -0.56, -0.28),
  ]);
  group.add(new THREE.Line(stringGeometry, new THREE.LineBasicMaterial({ color: 0xf7f4e8 })));

  const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 8), materials.blade);
  arrow.position.set(0.05, -0.04, -0.42);
  arrow.rotation.x = Math.PI / 2;
  group.add(arrow);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 10), materials.weaponAccent);
  tip.position.set(0.05, -0.04, -0.78);
  tip.rotation.x = -Math.PI / 2;
  group.add(tip);

  return group;
}

function createRifleModel(isHeavy) {
  const group = new THREE.Group();
  group.position.set(-0.02, -0.01, isHeavy ? -0.08 : -0.12);

  const body = new THREE.Mesh(new THREE.BoxGeometry(isHeavy ? 0.42 : 0.34, 0.16, isHeavy ? 0.82 : 0.68), materials.gunBody);
  body.position.set(0.02, -0.02, -0.28);
  group.add(body);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.26), materials.gunGrip);
  stock.position.set(0.02, -0.04, 0.18);
  stock.rotation.x = -0.2;
  group.add(stock);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(isHeavy ? 0.038 : 0.026, isHeavy ? 0.038 : 0.026, isHeavy ? 0.9 : 0.72, 16), materials.gunSlide);
  barrel.position.set(0.02, 0.02, isHeavy ? -0.92 : -0.78);
  barrel.rotation.x = Math.PI / 2;
  group.add(barrel);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.15, isHeavy ? 0.32 : 0.26, 0.16), materials.gunGrip);
  mag.position.set(0.02, -0.25, -0.22);
  mag.rotation.x = 0.12;
  group.add(mag);

  if (isHeavy) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.13, 22), materials.gunGrip);
    drum.position.set(0.02, -0.14, -0.16);
    drum.rotation.z = Math.PI / 2;
    group.add(drum);
  }

  return group;
}

function createSwordModel() {
  const group = new THREE.Group();
  group.position.set(0.05, -0.04, -0.15);
  group.rotation.set(-0.42, -0.24, -0.38);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 1.02), materials.blade);
  blade.position.set(0.02, 0.05, -0.54);
  group.add(blade);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.16, 4), materials.blade);
  tip.position.set(0.02, 0.05, -1.13);
  tip.rotation.z = Math.PI / 4;
  tip.rotation.x = -Math.PI / 2;
  group.add(tip);

  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.08), materials.weaponAccent);
  guard.position.set(0.02, 0.02, -0.02);
  group.add(guard);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 12), materials.gunGrip);
  handle.position.set(0.02, -0.02, 0.16);
  handle.rotation.x = Math.PI / 2;
  group.add(handle);

  return group;
}

function createPlayerAvatar() {
  playerAvatar.visible = false;
  scene.add(playerAvatar);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.72, 6, 14), materials.playerSuit);
  torso.position.set(0, 1.04, 0);
  torso.castShadow = true;
  playerAvatar.add(torso);

  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.58, 0.28), materials.playerVest);
  vest.position.set(0, 1.08, -0.02);
  vest.castShadow = true;
  playerAvatar.add(vest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), materials.hand);
  head.position.set(0, 1.62, 0);
  head.castShadow = true;
  playerAvatar.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.14, 14), materials.hand);
  neck.position.set(0, 1.42, 0);
  neck.castShadow = true;
  playerAvatar.add(neck);

  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.58, 5, 10), materials.hand);
  leftArm.position.set(-0.27, 1.16, -0.28);
  leftArm.rotation.set(1.08, -0.18, 0.16);
  leftArm.castShadow = true;
  playerAvatar.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.62, 5, 10), materials.hand);
  rightArm.position.set(0.27, 1.16, -0.28);
  rightArm.rotation.set(1.08, 0.18, -0.16);
  rightArm.castShadow = true;
  playerAvatar.add(rightArm);

  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.62, 5, 10), materials.playerSuit);
  leftLeg.position.set(-0.12, 0.42, 0);
  leftLeg.castShadow = true;
  playerAvatar.add(leftLeg);
  playerAvatar.userData.leftLeg = leftLeg;

  const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.62, 5, 10), materials.playerSuit);
  rightLeg.position.set(0.12, 0.42, 0);
  rightLeg.castShadow = true;
  playerAvatar.add(rightLeg);
  playerAvatar.userData.rightLeg = rightLeg;

  const avatarGun = new THREE.Group();
  avatarGun.position.set(0.2, 1.18, -0.58);
  avatarGun.rotation.x = -0.03;
  playerAvatar.add(avatarGun);

  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.42), materials.gunSlide);
  gunBody.castShadow = true;
  avatarGun.add(gunBody);

  const gunGrip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.1), materials.gunGrip);
  gunGrip.position.set(0, -0.14, 0.1);
  gunGrip.rotation.x = -0.22;
  gunGrip.castShadow = true;
  avatarGun.add(gunGrip);

  avatarMuzzle.position.set(0, 0.02, -0.26);
  avatarGun.add(avatarMuzzle);
}

function spawnWave() {
  if (game.over) {
    return;
  }

  game.wave += 1;
  clearTargets();

  const count = Math.min(5 + game.wave * 2, 28);
  const positions = createTargetPositions(count);
  for (let index = 0; index < count; index += 1) {
    const position = positions[index];
    const target = createTarget(position.x, position.z, 0);
    target.userData.targetId = game.targets.length;
    scene.add(target);
    game.targetMeshes.push(...target.userData.hitMeshes);
    game.targets.push({
      group: target,
      alive: true,
      hp: 72 + game.wave * 18,
      maxHp: 72 + game.wave * 18,
      baseY: target.position.y,
      phase: Math.random() * Math.PI * 2,
      speed: 4.2 + Math.min(game.wave * 0.38, 4.2) + Math.random() * 1.0,
      attackTimer: 0.4 + Math.random() * 0.4,
    });
  }

  updateHud();
}

function createTargetPositions(count) {
  const positions = [];
  let attempts = 0;

  while (positions.length < count && attempts < 800) {
    attempts += 1;
    const angle = Math.random() * Math.PI * 2;
    const radius = 18 + Math.random() * 36;
    const x = THREE.MathUtils.clamp(playerPosition.x + Math.cos(angle) * radius, bounds.minX + 4, bounds.maxX - 4);
    const z = THREE.MathUtils.clamp(playerPosition.z + Math.sin(angle) * radius, bounds.minZ + 4, bounds.maxZ - 4);
    const farFromPlayer = Math.hypot(playerPosition.x - x, playerPosition.z - z) > 14;
    const farEnough = farFromPlayer && positions.every((p) => Math.hypot(p.x - x, p.z - z) > 3.2);

    if (farEnough) {
      positions.push({ x, z });
    }
  }

  return positions;
}

function createTarget(x, z, y) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const photo = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 3), materials.zombieCover);
  photo.position.set(0, 1.55, 0);
  photo.rotation.y = Math.PI;
  photo.castShadow = true;
  photo.receiveShadow = true;
  group.add(photo);

  group.userData.photo = photo;
  group.userData.hitMeshes = [photo];
  return group;
}

function clearTargets() {
  for (const target of game.targets) {
    scene.remove(target.group);
    disposeObject(target.group);
  }

  game.targets.length = 0;
  game.targetMeshes.length = 0;
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);
  updatePlayer(delta);
  updateWeapon(delta);
  updateCombat();
  updateTargets(clock.elapsedTime, delta);
  updateShots(delta);
  updateParticles(delta);
  updateMuzzle(delta);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function updatePlayer(delta) {
  moveVector.set(0, 0, 0);

  if (document.pointerLockElement === canvas) {
    setFlatForward(worldForward);
    worldRight.crossVectors(worldForward, yAxis).normalize();

    if (input.forward) moveVector.add(worldForward);
    if (input.backward) moveVector.sub(worldForward);
    if (input.right) moveVector.add(worldRight);
    if (input.left) moveVector.sub(worldRight);
  }

  const targetSpeed = input.sprint ? player.sprintSpeed : player.speed;
  if (moveVector.lengthSq() > 0) {
    moveVector.normalize().multiplyScalar(targetSpeed);
  }

  const acceleration = moveVector.lengthSq() > 0 ? 24 : 13;
  playerVelocity.x = THREE.MathUtils.damp(playerVelocity.x, moveVector.x, acceleration, delta);
  playerVelocity.z = THREE.MathUtils.damp(playerVelocity.z, moveVector.z, acceleration, delta);

  playerPosition.x += playerVelocity.x * delta;
  playerPosition.z += playerVelocity.z * delta;
  playerPosition.x = THREE.MathUtils.clamp(playerPosition.x, bounds.minX, bounds.maxX);
  playerPosition.z = THREE.MathUtils.clamp(playerPosition.z, bounds.minZ, bounds.maxZ);

  const headBob = Math.sin(clock.elapsedTime * 10.8) * Math.min(playerVelocity.length() * 0.0032, 0.022);
  updatePlayerAvatar(headBob);

  if (cameraState.mode === "first") {
    updateFirstPersonCamera(headBob);
  } else {
    updateThirdPersonCamera(delta, headBob);
  }
}

function setFlatForward(target) {
  return target.set(0, 0, -1).applyAxisAngle(yAxis, player.yaw).normalize();
}

function updateFirstPersonCamera(headBob) {
  camera.position.set(playerPosition.x, player.height + headBob, playerPosition.z);
  camera.rotation.order = "YXZ";
  camera.rotation.set(player.pitch, player.yaw, 0);
}

function updateThirdPersonCamera(delta, headBob) {
  setFlatForward(worldForward);
  worldRight.crossVectors(worldForward, yAxis).normalize();

  cameraTargetPosition
    .set(playerPosition.x, 2.25 + Math.max(-player.pitch, 0) * 0.8 + headBob, playerPosition.z)
    .addScaledVector(worldForward, -5.4)
    .addScaledVector(worldRight, 0.7);

  camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraTargetPosition.x, 10, delta);
  camera.position.y = THREE.MathUtils.damp(camera.position.y, cameraTargetPosition.y, 10, delta);
  camera.position.z = THREE.MathUtils.damp(camera.position.z, cameraTargetPosition.z, 10, delta);

  const aimHeight = THREE.MathUtils.clamp(1.36 + player.pitch * 2.4, 0.35, 4.2);
  cameraLookAt
    .set(playerPosition.x, aimHeight, playerPosition.z)
    .addScaledVector(worldForward, 7.5);
  camera.lookAt(cameraLookAt);
}

function updatePlayerAvatar(headBob) {
  playerAvatar.position.set(playerPosition.x, headBob * 0.4, playerPosition.z);
  playerAvatar.rotation.y = player.yaw;

  const speed = playerVelocity.length();
  const moving = speed > 0.2 && document.pointerLockElement === canvas;
  const stride = clock.elapsedTime * (input.sprint ? 13.5 : 10.5);
  const legSwing = moving ? Math.sin(stride) * 0.36 : 0;

  const leftLeg = playerAvatar.userData.leftLeg;
  const rightLeg = playerAvatar.userData.rightLeg;
  if (leftLeg && rightLeg) {
    leftLeg.rotation.x = legSwing;
    rightLeg.rotation.x = -legSwing;
  }
}

function updateWeapon(delta) {
  const speed = playerVelocity.length();
  const moving = speed > 0.2 && document.pointerLockElement === canvas;
  const stride = clock.elapsedTime * (input.sprint ? 13.5 : 10.5);
  const bobX = moving ? Math.sin(stride) * 0.016 : 0;
  const bobY = moving ? Math.abs(Math.cos(stride)) * 0.018 : 0;
  const sprintDrop = input.sprint && moving ? -0.035 : 0;

  lookSway.x = THREE.MathUtils.damp(lookSway.x, 0, 9, delta);
  lookSway.y = THREE.MathUtils.damp(lookSway.y, 0, 9, delta);
  weapon.recoil = THREE.MathUtils.damp(weapon.recoil, 0, 18, delta);

  weapon.root.position.x = THREE.MathUtils.damp(
    weapon.root.position.x,
    weapon.basePosition.x - lookSway.x * 0.55 + bobX,
    18,
    delta,
  );
  weapon.root.position.y = THREE.MathUtils.damp(
    weapon.root.position.y,
    weapon.basePosition.y - lookSway.y * 0.28 + bobY + sprintDrop - weapon.recoil * 0.035,
    18,
    delta,
  );
  weapon.root.position.z = THREE.MathUtils.damp(
    weapon.root.position.z,
    weapon.basePosition.z + weapon.recoil * 0.12,
    22,
    delta,
  );

  weapon.root.rotation.x = THREE.MathUtils.damp(weapon.root.rotation.x, -0.05 - lookSway.y * 0.55 - weapon.recoil * 0.18, 18, delta);
  weapon.root.rotation.y = THREE.MathUtils.damp(weapon.root.rotation.y, -0.03 - lookSway.x * 0.9, 18, delta);
  weapon.root.rotation.z = THREE.MathUtils.damp(weapon.root.rotation.z, 0.035 - lookSway.x * 0.45 + bobX * 0.7, 18, delta);
}

function updateTargets(time, delta) {
  for (const target of game.targets) {
    if (!target.alive) {
      continue;
    }

    const dx = playerPosition.x - target.group.position.x;
    const dz = playerPosition.z - target.group.position.z;
    const distance = Math.hypot(dx, dz);
    const dirX = distance > 0.001 ? dx / distance : 0;
    const dirZ = distance > 0.001 ? dz / distance : 0;
    const shamble = Math.sin(time * 6.4 + target.phase);

    target.group.position.y = target.baseY + Math.abs(shamble) * 0.08;
    target.group.lookAt(playerPosition.x, target.group.position.y, playerPosition.z);

    if (distance > 1.15) {
      const slowNearPlayer = distance < 4 ? THREE.MathUtils.mapLinear(distance, 1.15, 4, 0.65, 1) : 1;
      target.group.position.x += dirX * target.speed * slowNearPlayer * delta;
      target.group.position.z += dirZ * target.speed * slowNearPlayer * delta;
      target.group.position.x = THREE.MathUtils.clamp(target.group.position.x, bounds.minX + 1, bounds.maxX - 1);
      target.group.position.z = THREE.MathUtils.clamp(target.group.position.z, bounds.minZ + 1, bounds.maxZ - 1);
    }

    target.attackTimer -= delta;
    if (distance <= 1.45 && target.attackTimer <= 0) {
      damagePlayer(10 + Math.min(game.wave, 8));
      target.attackTimer = Math.max(0.55, 0.95 - game.wave * 0.025);
    }

    const photo = target.group.userData.photo;
    if (photo) {
      photo.position.y = 1.55 + Math.abs(shamble) * 0.12;
      photo.rotation.z = shamble * 0.035;
    }
  }
}

function updateCombat() {
  const item = currentWeapon();
  if (input.fire && item.auto && document.pointerLockElement === canvas) {
    useCurrentWeapon();
  }
}

function useCurrentWeapon() {
  if (game.over) {
    return;
  }

  const now = clock.elapsedTime;
  const item = currentWeapon();
  if (now < weapon.nextAttackAt) {
    return;
  }

  weapon.nextAttackAt = now + item.cooldown;
  if (item.melee) {
    swingSword(item);
    return;
  }

  shoot(item);
}

function shoot(item) {
  materials.muzzle.opacity = 1;
  weapon.recoil = Math.min(weapon.recoil + (item.auto ? 0.5 : 1), 1.25);
  getShotDirection(item.spread ?? 0);
  raycaster.set(camera.position, cameraDirection);
  raycaster.far = item.range;
  const hit = raycaster.intersectObjects(game.targetMeshes, false)[0];
  const end = hit ? hit.point.clone() : camera.position.clone().add(cameraDirection.clone().multiplyScalar(item.range));

  muzzleFlash.getWorldPosition(muzzleWorld);
  addTracer(muzzleWorld.clone(), end);

  if (!hit) {
    game.streak = 0;
    updateHud();
    return;
  }

  const targetId = hit.object.parent.userData.targetId;
  const target = game.targets[targetId];
  if (!target || !target.alive) {
    return;
  }

  damageTarget(target, item.damage, hit.point, hit.face?.normal ?? cameraDirection, item);
}

function getShotDirection(spread) {
  camera.getWorldDirection(cameraDirection);

  if (spread <= 0) {
    return cameraDirection.normalize();
  }

  shotRight.crossVectors(cameraDirection, yAxis).normalize();
  shotUp.crossVectors(shotRight, cameraDirection).normalize();
  cameraDirection
    .addScaledVector(shotRight, (Math.random() - 0.5) * spread)
    .addScaledVector(shotUp, (Math.random() - 0.5) * spread)
    .normalize();

  return cameraDirection;
}

function swingSword(item) {
  weapon.recoil = Math.min(weapon.recoil + 1.2, 1.35);
  setFlatForward(worldForward);
  let hits = 0;

  for (const target of game.targets) {
    if (!target.alive) {
      continue;
    }

    const dx = target.group.position.x - playerPosition.x;
    const dz = target.group.position.z - playerPosition.z;
    const distance = Math.hypot(dx, dz);
    if (distance > item.range) {
      continue;
    }

    const dot = (dx / Math.max(distance, 0.001)) * worldForward.x + (dz / Math.max(distance, 0.001)) * worldForward.z;
    if (dot < 0.32) {
      continue;
    }

    const point = target.group.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    damageTarget(target, item.damage, point, worldForward, item);
    hits += 1;
  }

  const slashEnd = playerPosition.clone().addScaledVector(worldForward, item.range);
  slashEnd.y = player.height * 0.75;
  addTracer(new THREE.Vector3(playerPosition.x, player.height * 0.75, playerPosition.z), slashEnd);

  if (hits === 0) {
    game.streak = 0;
    updateHud();
  }
}

function damageTarget(target, amount, point, normal, item) {
  target.hp -= amount;
  spawnHitParticles(point, normal);
  showHitMarker();

  if (target.hp > 0) {
    target.group.scale.setScalar(1 + Math.min(amount / Math.max(target.maxHp, 1), 0.35) * 0.18);
    target.group.userData.hitPulse = 0.12;
    return;
  }

  target.alive = false;
  game.kills += 1;
  if (game.kills > game.bestKills) {
    game.bestKills = game.kills;
    saveBestKills(game.bestKills);
  }

  game.money += (item?.reward ?? 24) + Math.min(game.wave * 3, 36);
  game.score += 100 + game.streak * 20;
  game.streak += 1;

  target.group.scale.setScalar(1);
  target.group.userData.dying = 0.001;
  game.targetMeshes = game.targetMeshes.filter((mesh) => mesh.parent !== target.group);

  const remaining = game.targets.filter((item) => item.alive).length;
  if (remaining === 0 && !game.over) {
    game.money += 45 + game.wave * 12;
    game.health = Math.min(game.maxHealth, game.health + 8);
    setTimeout(() => {
      if (!game.over) {
        spawnWave();
      }
    }, 900);
  }

  updateHud();
}

function addTracer(start, end) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    start.add(new THREE.Vector3(0, -0.08, 0)),
    end,
  ]);
  const line = new THREE.Line(geometry, materials.tracer.clone());
  line.userData.life = 0.09;
  scene.add(line);
  game.shots.push(line);
}

function updateShots(delta) {
  for (let index = game.shots.length - 1; index >= 0; index -= 1) {
    const shot = game.shots[index];
    shot.userData.life -= delta;
    shot.material.opacity = Math.max(shot.userData.life / 0.09, 0);

    if (shot.userData.life <= 0) {
      scene.remove(shot);
      shot.geometry.dispose();
      shot.material.dispose();
      game.shots.splice(index, 1);
    }
  }

  for (const target of game.targets) {
    if (target.group.userData.hitPulse) {
      target.group.userData.hitPulse -= delta;
      target.group.scale.setScalar(1 + Math.max(target.group.userData.hitPulse, 0) * 1.4);
      if (target.group.userData.hitPulse <= 0) {
        target.group.userData.hitPulse = 0;
        target.group.scale.setScalar(1);
      }
    }

    if (!target.group.userData.dying) {
      continue;
    }

    target.group.userData.dying += delta * 4.2;
    const t = target.group.userData.dying;
    target.group.scale.setScalar(Math.max(1 - t, 0.01));
    target.group.rotation.z += delta * 8;

    if (t >= 1) {
      scene.remove(target.group);
      disposeObject(target.group);
      target.group.userData.dying = 0;
    }
  }
}

function spawnHitParticles(point, normal) {
  const normalVector = normal.clone().normalize();

  for (let index = 0; index < 10; index += 1) {
    const particle = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.055), materials.particle.clone());
    particle.position.copy(point);
    particle.userData.life = 0.42 + Math.random() * 0.18;
    particle.userData.velocity = normalVector
      .clone()
      .multiplyScalar(2.8 + Math.random() * 2.5)
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 3.8,
          (Math.random() - 0.15) * 3.2,
          (Math.random() - 0.5) * 3.8,
        ),
      );
    scene.add(particle);
    game.particles.push(particle);
  }
}

function updateParticles(delta) {
  for (let index = game.particles.length - 1; index >= 0; index -= 1) {
    const particle = game.particles[index];
    particle.userData.life -= delta;
    particle.userData.velocity.y -= 8.6 * delta;
    particle.position.addScaledVector(particle.userData.velocity, delta);
    particle.rotation.x += delta * 8;
    particle.rotation.y += delta * 9;
    particle.material.opacity = Math.max(particle.userData.life / 0.55, 0);

    if (particle.userData.life <= 0) {
      scene.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
      game.particles.splice(index, 1);
    }
  }
}

function updateMuzzle(delta) {
  materials.muzzle.opacity = THREE.MathUtils.damp(materials.muzzle.opacity, 0, 30, delta);
  muzzleFlash.scale.setScalar(1 + materials.muzzle.opacity * 4);
}

function showHitMarker() {
  hitMarker.classList.remove("active");
  void hitMarker.offsetWidth;
  hitMarker.classList.add("active");
}

function damagePlayer(amount) {
  if (game.over) {
    return;
  }

  game.health = Math.max(0, game.health - amount);
  damageFlash.classList.remove("active");
  void damageFlash.offsetWidth;
  damageFlash.classList.add("active");

  if (game.health <= 0) {
    endGame();
  }

  updateHud();
}

function endGame() {
  game.over = true;
  clearInput();
  playerVelocity.set(0, 0, 0);
  playButton.textContent = "Заново";

  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  } else {
    startPanel.classList.remove("hidden");
  }
}

function resetGame() {
  clearTargets();
  game.score = 0;
  game.streak = 0;
  game.wave = 0;
  game.health = game.maxHealth;
  game.kills = 0;
  game.money = 0;
  game.weaponId = "pistol";
  game.unlockedWeapons = new Set(["pistol"]);
  game.over = false;
  playerPosition.set(0, 0, 11);
  playerVelocity.set(0, 0, 0);
  player.yaw = 0;
  player.pitch = 0;
  weapon.nextAttackAt = 0;
  playButton.textContent = "Начать";
  updateWeaponModel();
  spawnWave();
  updateHud();
}

function updateHud() {
  const item = currentWeapon();
  scoreNode.textContent = String(game.kills);
  waveNode.textContent = String(Math.max(game.wave, 1));
  targetsLeftNode.textContent = String(game.targets.filter((target) => target.alive).length);
  bestKillsNode.textContent = String(game.bestKills);
  moneyNode.textContent = `$${game.money}`;
  weaponNameNode.textContent = item.label;
  healthValueNode.textContent = String(Math.ceil(game.health));
  healthFillNode.style.width = `${THREE.MathUtils.clamp((game.health / game.maxHealth) * 100, 0, 100)}%`;
  healthFillNode.style.background =
    game.health > 55 ? "linear-gradient(90deg, #51d66d, #ffd86b)" : game.health > 25 ? "#ffd86b" : "#dc1e30";

  for (const button of shopButtons) {
    const weaponId = button.dataset.weapon;
    const shopItem = WEAPONS[weaponId];
    const unlocked = game.unlockedWeapons.has(weaponId);
    const selected = game.weaponId === weaponId;
    button.classList.toggle("active", selected);
    button.classList.toggle("locked", !unlocked);
    button.disabled = !unlocked && game.money < shopItem.cost;
    button.textContent = unlocked
      ? `${WEAPON_ORDER.indexOf(weaponId) + 1} ${shopItem.label}${selected ? " ✓" : ""}`
      : `${WEAPON_ORDER.indexOf(weaponId) + 1} ${shopItem.label} $${shopItem.cost}`;
  }
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
  });
}
