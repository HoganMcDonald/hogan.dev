// Bullet Hell Mini Game
// Words from the page become enemy waves in a top-down shooter

import { BAL } from './bullet-hell-balance';

type BulletOwner = 'player' | 'enemy';
type EnemyPattern = 'straight' | 'sine' | 'zigzag' | 'erratic';
type EnemyAttack = 'aimed' | 'radial' | 'laser' | 'mine' | 'spiral' | 'wall' | 'shotgun';
type EnemyType = 'normal' | 'splitter' | 'swarm' | 'cloaker';
type BossType = 'classic' | 'paragraph' | 'echo' | 'cursor';
type Phase = 'playing' | 'waveIntro' | 'shop' | 'crateOpening' | 'gameOver' | 'paused';
type EnhancementType = 'homing' | 'exploding' | 'radial' | 'orbital' | 'chainLightning' | 'golden' | 'gravityWell' | 'lifeDrain' | 'pierce';
type EliteModifier = 'regenerating' | 'bulletSponge' | 'vengeful';
type SynergyId = 'homingChainLightning' | 'explodingRadial' | 'pierceGravityWell' | 'goldenLifeDrain';
type ChallengeModifier = 'noShoot' | 'darkness' | 'speedUp' | 'fragile' | 'bulletHell';

interface EnhancementSlot {
  type: EnhancementType;
  level: number;
  chance: number;
}

interface LootCrate {
  x: number;
  y: number;
  vy: number;
  alive: boolean;
  enhancement: EnhancementType;
}

interface LightningBolt {
  segments: { x: number; y: number }[];
  life: number;
  maxLife: number;
}

interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  speed: number;
  invincibleUntil: number;
  shootCooldown: number;
  lastShot: number;
  maxBullets: number;
  enhancementSlots: (EnhancementSlot | null)[];
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  alive: boolean;
  owner: BulletOwner;
  enhancement: EnhancementType | null;
  target?: Enemy;
  orbitAngle: number;
  orbitRadius: number;
  orbitRotations: number;
  gravityWellLife: number;
  pierceCount: number;
  isMine: boolean;
  fuseTimer: number;
  isLaser: boolean;
  laserLife: number;
  isLaserWarning: boolean;
  warningTimer: number;
  warningX: number;
  warningSourceY: number;
  grazed: boolean;
}

interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  word: string;
  hp: number;
  maxHp: number;
  alive: boolean;
  hitFlash: number;
  pattern: EnemyPattern;
  phaseOffset: number;
  baseX: number;
  time: number;
  canShoot: boolean;
  attackType: EnemyAttack;
  shootTimer: number;
  shootInterval: number;
  isBoss: boolean;
  bossType: BossType | null;
  bossData: Record<string, any>;
  bossAttackIndex: number;
  bossAttackTimer: number;
  gildedTimer: number;
  enemyType: EnemyType;
  isSplitterChild: boolean;
  cloakPhase: number;
  cloakVisible: boolean;
  spiralAngle: number;
  isElite: boolean;
  eliteModifier: EliteModifier | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  char: string;
  color: string;
  size: number;
}

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  available: () => boolean;
  apply: () => void;
}

interface GameState {
  phase: Phase;
  score: number;
  points: number;
  wave: number;
  waveTimer: number;
  enemiesRemaining: number;
  enemiesSpawned: number;
  enemiesPerWave: number;
  spawnTimer: number;
  spawnInterval: number;
  wordPool: string[];
  wordIndex: number;
  shopSelection: number;
  bossActive: boolean;
  currentBossType: BossType | null;
  replayBuffer: { x: number; y: number; shooting: boolean; time: number }[];
  pendingCrate: LootCrate | null;
  crateSelection: number;
  shakeIntensity: number;
  shakeTimer: number;
  timeScale: number;
  timeScaleTimer: number;
  combo: number;
  comboTimer: number;
  bestCombo: number;
  grazeScore: number;
  totalKills: number;
  bulletsFired: number;
  bulletsHit: number;
  gameStartTime: number;
  activeSynergies: Set<SynergyId>;
  synergyNotifications: { id: SynergyId; timer: number }[];
  challenge: {
    active: boolean;
    modifier: ChallengeModifier | null;
    noShootTimer: number;
    savedHp: number;
  };
}

// --- Registry interfaces ---

interface EnhancementDef {
  id: EnhancementType;
  name: string;
  abbr: string;
  desc: string;
  color: string;
  baseChance: number;
  chancePerLevel: number;
  replacesDefault?: boolean;
  onCreate?: (b: Bullet, slot: EnhancementSlot) => Bullet[] | void;
  onUpdate?: (b: Bullet, dt: number) => void;
  onHit?: (b: Bullet, e: Enemy) => void;
  onRender?: (b: Bullet, ctx: CanvasRenderingContext2D, now: number) => void;
}

interface AttackDef {
  id: string;
  unlockWave: number;
  label: string;
  glowColor: string;
  bgColor: string;
  bossOnly?: boolean;
  introWarning?: string;
  fire: (e: Enemy) => void;
  bossFire?: (e: Enemy) => void;
}

interface BossTypeDef {
  id: BossType;
  unlockWave: number;
  name: string;
  introWarning: string;
  spawn: () => void;
  move: (e: Enemy, dt: number) => void;
  attack: (e: Enemy, dt: number) => void;
  render: (e: Enemy, ctx: CanvasRenderingContext2D) => void;
  onKill?: (e: Enemy) => void;
  onUpdate?: (e: Enemy, dt: number) => void;
  canBeHit?: (e: Enemy) => boolean;
}

interface EnemyTypeDef {
  id: string;
  unlockWave: number;
  weight: number;
  introWarning?: string;
  spawn: () => void;
  move?: (e: Enemy, dt: number) => void;
  onKill?: (e: Enemy) => void;
  canBeHit?: (e: Enemy) => boolean;
}

interface SynergyDef {
  id: SynergyId;
  requires: [EnhancementType, EnhancementType];
  name: string;
  desc: string;
  color: string;
}

// --- Constants ---

const COLORS = {
  bg: '#1a1b26',
  cyan: '#7dcfff',
  purple: '#bb9af7',
  blue: '#7aa2f7',
  green: '#9ece6a',
  orange: '#ff9e64',
  red: '#f7768e',
  yellow: '#e0af68',
  fg: '#a9b1d6',
  fgBright: '#c0caf5',
  fgMuted: '#565f89',
  bgSurface: '#24283b',
};

const BULLET_DEFAULTS = {
  enhancement: null as EnhancementType | null,
  orbitAngle: 0,
  orbitRadius: 0,
  orbitRotations: 0,
  gravityWellLife: 0,
  pierceCount: 0,
  isMine: false,
  fuseTimer: 0,
  isLaser: false,
  laserLife: 0,
  isLaserWarning: false,
  warningTimer: 0,
  warningX: 0,
  warningSourceY: 0,
  grazed: false,
};

// --- Pure utility functions (no state) ---

function aabb(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  pad = 0,
): boolean {
  return Math.abs(ax - bx) < (aw + bw) / 2 + pad
      && Math.abs(ay - by) < (ah + bh) / 2 + pad;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Init ---

export function initGame(button: HTMLElement) {
  button.addEventListener('click', () => startGame());
}

function scrapeWords(): string[] {
  const content = document.querySelector('.page-content');
  if (!content) return ['no', 'words', 'found'];
  const text = content.textContent || '';
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter((w) => w.length > 0);
  const unique = Array.from(new Set(words));
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.length > 0 ? unique : ['hello', 'world'];
}

function startGame() {
  const words = scrapeWords();

  const canvas = document.createElement('canvas');
  canvas.id = 'bullet-hell-canvas';
  canvas.style.cssText =
    'position:fixed;inset:0;z-index:9000;width:100vw;height:100vh;background:rgba(26,27,38,0.95);';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  let W = window.innerWidth;
  let H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;

  window.addEventListener('resize', () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  });

  const pageContent = document.querySelector('.page-content') as HTMLElement;
  if (pageContent) pageContent.style.visibility = 'hidden';

  const keys: Record<string, boolean> = {};
  const keyJustPressed: Record<string, boolean> = {};
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (!keys[k]) keyJustPressed[k] = true;
    keys[k] = true;
    if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      e.preventDefault();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.key.toLowerCase()] = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const player: Player = {
    x: W / 2,
    y: H - 100,
    w: BAL.player.w,
    h: BAL.player.h,
    hp: BAL.player.hp,
    maxHp: BAL.player.maxHp,
    speed: BAL.player.speed,
    invincibleUntil: 0,
    shootCooldown: BAL.player.shootCooldown,
    lastShot: 0,
    maxBullets: BAL.player.maxBullets,
    enhancementSlots: [null, null, null],
  };

  const bullets: Bullet[] = [];
  const enemies: Enemy[] = [];
  const particles: Particle[] = [];
  const lootCrates: LootCrate[] = [];
  const lightningBolts: LightningBolt[] = [];

  const purchaseCounts: Record<string, number> = {};

  const state: GameState = {
    phase: 'waveIntro',
    score: 0,
    points: 0,
    wave: 1,
    waveTimer: 2,
    enemiesRemaining: 0,
    enemiesSpawned: 0,
    enemiesPerWave: BAL.wave.baseEnemies,
    spawnTimer: 0,
    spawnInterval: BAL.wave.baseSpawnInterval,
    wordPool: words,
    wordIndex: 0,
    shopSelection: 0,
    bossActive: false,
    currentBossType: null,
    replayBuffer: [],
    pendingCrate: null,
    crateSelection: 0,
    shakeIntensity: 0,
    shakeTimer: 0,
    timeScale: 1,
    timeScaleTimer: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    grazeScore: 0,
    totalKills: 0,
    bulletsFired: 0,
    bulletsHit: 0,
    gameStartTime: performance.now(),
    activeSynergies: new Set<SynergyId>(),
    synergyNotifications: [],
    challenge: { active: false, modifier: null, noShootTimer: 0, savedHp: 0 },
  };

  // --- Shared helpers ---

  function enemiesShootThisWave(): boolean {
    return state.wave >= BAL.wave.shootStartWave;
  }

  function enemyHpBonus(): number {
    return Math.floor(state.wave / BAL.wave.hpBonusDivisor);
  }

  function isBossWave(): boolean {
    return state.wave % BAL.wave.bossWaveInterval === 0;
  }

  function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
  }

  function triggerShake(intensity: number, duration: number) {
    state.shakeIntensity = Math.max(state.shakeIntensity, intensity);
    state.shakeTimer = Math.max(state.shakeTimer, duration);
  }

  function shopCost(basePrice: number, itemId: string): number {
    const bought = purchaseCounts[itemId] || 0;
    const waveInflation = Math.floor(state.wave / BAL.shop.inflationDivisor);
    return basePrice + bought + waveInflation;
  }

  function nextWord(): string {
    const word = state.wordPool[state.wordIndex % state.wordPool.length];
    state.wordIndex++;
    return word;
  }

  function getEnemyStats(word: string): { hp: number; speed: number } {
    const len = word.length;
    const bonus = enemyHpBonus();
    const speedBonus = state.wave * BAL.wave.speedBonusPerWave;
    const { short, medium, long } = BAL.enemyTiers;
    if (len <= short.maxLength) return { hp: short.hp + bonus, speed: short.speed + speedBonus + Math.random() * short.speedRandom };
    if (len <= medium.maxLength) return { hp: medium.hp + bonus, speed: medium.speed + speedBonus + Math.random() * medium.speedRandom };
    return { hp: long.hp + bonus, speed: long.speed + speedBonus + Math.random() * long.speedRandom };
  }

  const ENEMY_DEFAULTS = {
    isBoss: false,
    bossType: null as BossType | null,
    bossData: {} as Record<string, any>,
    bossAttackIndex: 0,
    bossAttackTimer: 0,
    gildedTimer: 0,
    enemyType: 'normal' as EnemyType,
    isSplitterChild: false,
    cloakPhase: 0,
    cloakVisible: true,
    spiralAngle: 0,
    isElite: false,
    eliteModifier: null as EliteModifier | null,
  };

  // --- Combo system ---

  function comboMultiplier(): number {
    if (state.combo < BAL.combo.threshold) return 1;
    return Math.min(BAL.combo.maxMultiplier, 1 + (state.combo - BAL.combo.threshold) * BAL.combo.multPerKill);
  }

  // --- Elite enemies ---

  const ELITE_MODIFIERS: { id: EliteModifier; unlockWave: number }[] = [
    { id: 'regenerating', unlockWave: BAL.elite.regenerating.unlockWave },
    { id: 'bulletSponge', unlockWave: BAL.elite.bulletSponge.unlockWave },
    { id: 'vengeful', unlockWave: BAL.elite.vengeful.unlockWave },
  ];

  function applyEliteStatus(e: Enemy) {
    if (e.isBoss || e.isSplitterChild) return;
    if (state.wave < BAL.elite.unlockWave) return;
    const chance = Math.min(BAL.elite.maxChance, BAL.elite.chance + (state.wave - BAL.elite.unlockWave) * BAL.elite.chancePerWave);
    if (Math.random() >= chance) return;
    e.isElite = true;
    e.hp = Math.ceil(e.hp * BAL.elite.hpMultiplier);
    e.maxHp = e.hp;
    const available = ELITE_MODIFIERS.filter(m => state.wave >= m.unlockWave);
    if (available.length > 0) {
      e.eliteModifier = available[Math.floor(Math.random() * available.length)].id;
    }
  }

  // --- Synergy system ---

  const SYNERGY_DEFS: SynergyDef[] = [
    { id: 'homingChainLightning', requires: ['homing', 'chainLightning'], name: 'Storm Seeker', desc: 'Lightning auto-targets with extended range', color: COLORS.cyan },
    { id: 'explodingRadial', requires: ['exploding', 'radial'], name: 'Cluster Bomb', desc: 'Explosions spawn secondary blasts', color: COLORS.orange },
    { id: 'pierceGravityWell', requires: ['pierce', 'gravityWell'], name: 'Singularity Lance', desc: 'Gravity well pull force increased', color: COLORS.purple },
    { id: 'goldenLifeDrain', requires: ['golden', 'lifeDrain'], name: 'Midas Touch', desc: 'Heal extra HP on gilded kills', color: COLORS.yellow },
  ];

  function recalcSynergies() {
    const equipped = new Set(player.enhancementSlots.filter(s => s !== null).map(s => s!.type));
    for (const syn of SYNERGY_DEFS) {
      const active = equipped.has(syn.requires[0]) && equipped.has(syn.requires[1]);
      const wasActive = state.activeSynergies.has(syn.id);
      if (active && !wasActive) {
        state.activeSynergies.add(syn.id);
        state.synergyNotifications.push({ id: syn.id, timer: 3 });
      } else if (!active && wasActive) {
        state.activeSynergies.delete(syn.id);
      }
    }
  }

  // --- Challenge waves ---

  const CHALLENGE_MODIFIERS: { id: ChallengeModifier; label: string }[] = [
    { id: 'noShoot', label: 'NO SHOOTING for 5 seconds!' },
    { id: 'darkness', label: 'LIGHTS OUT!' },
    { id: 'speedUp', label: 'ENEMIES ARE FASTER!' },
    { id: 'fragile', label: 'ONE HIT AND YOU ARE DOWN!' },
    { id: 'bulletHell', label: 'BULLET HELL MODE!' },
  ];

  function rollChallenge(): ChallengeModifier | null {
    if (state.wave < BAL.challenge.startWave) return null;
    if (isBossWave()) return null;
    if (Math.random() >= BAL.challenge.chance) return null;
    return CHALLENGE_MODIFIERS[Math.floor(Math.random() * CHALLENGE_MODIFIERS.length)].id;
  }

  function playerBulletCount(): number {
    let count = 0;
    for (const b of bullets) {
      if (b.owner === 'player' && b.alive) count++;
    }
    return count;
  }

  function findNearestEnemy(x: number, y: number): Enemy | undefined {
    let best: Enemy | undefined;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  function clearKeys() {
    for (const k in keyJustPressed) delete keyJustPressed[k];
  }

  // =========================================================================
  // ENHANCEMENT REGISTRY
  // =========================================================================

  const ENHANCEMENT_REGISTRY: Record<string, EnhancementDef> = {};

  function registerEnhancement(def: EnhancementDef) {
    ENHANCEMENT_REGISTRY[def.id] = def;
  }

  function enhName(id: EnhancementType): string { return ENHANCEMENT_REGISTRY[id].name; }
  function enhColor(id: EnhancementType): string { return ENHANCEMENT_REGISTRY[id].color; }
  function enhDesc(id: EnhancementType): string { return ENHANCEMENT_REGISTRY[id].desc; }
  function enhAbbr(id: EnhancementType): string { return ENHANCEMENT_REGISTRY[id].abbr; }

  registerEnhancement({
    id: 'homing',
    name: 'Homing',
    abbr: 'HMG',
    desc: 'Bullets track nearest enemy',
    color: COLORS.green,
    baseChance: BAL.enhancements.homing.baseChance,
    chancePerLevel: BAL.enhancements.homing.chancePerLevel,
    onCreate: (b) => {
      b.vy = -BAL.enhancements.homing.speed;
      b.w = BAL.enhancements.homing.bulletW;
      b.h = BAL.enhancements.homing.bulletH;
      b.target = findNearestEnemy(b.x, b.y);
    },
    onUpdate: (b, dt) => {
      if (!b.target || !b.target.alive) b.target = findNearestEnemy(b.x, b.y);
      if (b.target) {
        const tdx = b.target.x - b.x;
        const tdy = b.target.y - b.y;
        const d = dist(b.x, b.y, b.target.x, b.target.y);
        if (d > 0) {
          const turnRate = BAL.enhancements.homing.turnRate * dt;
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || BAL.enhancements.homing.speed;
          b.vx += (tdx / d) * speed * turnRate;
          b.vy += (tdy / d) * speed * turnRate;
          const newSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          b.vx = (b.vx / newSpeed) * speed;
          b.vy = (b.vy / newSpeed) * speed;
        }
      }
    },
  });

  registerEnhancement({
    id: 'exploding',
    name: 'Exploding',
    abbr: 'EXP',
    desc: `Bullets explode on hit (${BAL.enhancements.exploding.aoeRadius}px AoE)`,
    color: COLORS.orange,
    baseChance: BAL.enhancements.exploding.baseChance,
    chancePerLevel: BAL.enhancements.exploding.chancePerLevel,
    onHit: (b) => {
      spawnExplosion(b.x, b.y);
    },
  });

  registerEnhancement({
    id: 'radial',
    name: 'Radial',
    abbr: 'RAD',
    desc: 'Fire extra angled side bullets',
    color: COLORS.purple,
    baseChance: BAL.enhancements.radial.baseChance,
    chancePerLevel: BAL.enhancements.radial.chancePerLevel,
    replacesDefault: true,
    onCreate: (_b, slot) => {
      const bx = player.x;
      const by = player.y - player.h / 2;
      const sideCount = 2 + slot.level;
      const result: Bullet[] = [
        {
          x: bx, y: by, vx: 0, vy: -BAL.enhancements.radial.centerSpeed, w: BAL.player.bulletW, h: BAL.player.bulletH,
          alive: true, owner: 'player', ...BULLET_DEFAULTS,
        },
      ];
      const spread = BAL.enhancements.radial.spreadAngle;
      for (let i = 0; i < sideCount; i++) {
        const angle = -Math.PI / 2 + spread * ((i + 1) / (sideCount + 1) - 0.5) * 2;
        const speed = BAL.enhancements.radial.sideSpeed;
        result.push({
          x: bx, y: by,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: 3, h: 8, alive: true, owner: 'player',
          ...BULLET_DEFAULTS, enhancement: 'radial',
        });
      }
      return result;
    },
  });

  registerEnhancement({
    id: 'orbital',
    name: 'Orbital',
    abbr: 'ORB',
    desc: 'Bullet orbits around you',
    color: COLORS.blue,
    baseChance: BAL.enhancements.orbital.baseChance,
    chancePerLevel: BAL.enhancements.orbital.chancePerLevel,
    replacesDefault: true,
    onCreate: (_b, slot) => {
      const bx = player.x;
      const by = player.y - player.h / 2;
      const maxRot = BAL.enhancements.orbital.baseRotations + slot.level * BAL.enhancements.orbital.rotationsPerLevel;
      return [{
        x: bx, y: by, vx: 0, vy: 0, w: 6, h: 6,
        alive: true, owner: 'player', ...BULLET_DEFAULTS,
        enhancement: 'orbital',
        orbitAngle: 0, orbitRadius: BAL.enhancements.orbital.radius, orbitRotations: maxRot,
      }];
    },
    onUpdate: (b, dt) => {
      const angularVelocity = BAL.enhancements.orbital.angularVelocity;
      b.orbitAngle += angularVelocity * dt;
      b.x = player.x + Math.cos(b.orbitAngle) * b.orbitRadius;
      b.y = player.y + Math.sin(b.orbitAngle) * b.orbitRadius;
      const rotationsDone = b.orbitAngle / (Math.PI * 2);
      if (rotationsDone >= b.orbitRotations) b.alive = false;
    },
    onRender: (b, c) => {
      c.beginPath();
      c.arc(b.x, b.y, b.w / 2 + 1, 0, Math.PI * 2);
      c.fill();
    },
  });

  registerEnhancement({
    id: 'chainLightning',
    name: 'Chain Lightning',
    abbr: 'ZAP',
    desc: 'Arcs lightning to nearby enemies',
    color: COLORS.cyan,
    baseChance: BAL.enhancements.chainLightning.baseChance,
    chancePerLevel: BAL.enhancements.chainLightning.chancePerLevel,
    onHit: (_b, e) => {
      const slot = player.enhancementSlots.find(s => s?.type === 'chainLightning');
      const synergyBonus = state.activeSynergies.has('homingChainLightning') ? BAL.synergies.homingChainLightning.autoTargetRange : 0;
      const arcRange = BAL.enhancements.chainLightning.baseRange + (slot ? slot.level * BAL.enhancements.chainLightning.rangePerLevel : 0) + synergyBonus;
      const maxChains = BAL.enhancements.chainLightning.baseChains + Math.floor((slot ? slot.level : 0) / BAL.enhancements.chainLightning.chainsEveryNLevels);
      let chainCount = 0;
      const hitSet = new Set<Enemy>([e]);
      let cx = e.x, cy = e.y;
      while (chainCount < maxChains) {
        let nearest: Enemy | undefined;
        let nearDist = Infinity;
        for (const other of enemies) {
          if (!other.alive || hitSet.has(other)) continue;
          const d = dist(cx, cy, other.x, other.y);
          if (d < arcRange && d < nearDist) {
            nearDist = d;
            nearest = other;
          }
        }
        if (!nearest) break;
        hitSet.add(nearest);
        const segs: { x: number; y: number }[] = [{ x: cx, y: cy }];
        const boltSteps = 8;
        for (let s = 1; s < boltSteps; s++) {
          const t = s / boltSteps;
          segs.push({
            x: cx + (nearest.x - cx) * t + (Math.random() - 0.5) * BAL.enhancements.chainLightning.jitter,
            y: cy + (nearest.y - cy) * t + (Math.random() - 0.5) * BAL.enhancements.chainLightning.jitter,
          });
        }
        segs.push({ x: nearest.x, y: nearest.y });
        lightningBolts.push({ segments: segs, life: BAL.enhancements.chainLightning.boltLife, maxLife: BAL.enhancements.chainLightning.boltLife });
        damageEnemy(nearest);
        nearest.hitFlash = 1;
        if (nearest.hp <= 0) killEnemy(nearest);
        cx = nearest.x;
        cy = nearest.y;
        chainCount++;
      }
    },
  });

  registerEnhancement({
    id: 'golden',
    name: 'Golden',
    abbr: 'GLD',
    desc: `${BAL.enhancements.golden.pointMult}x points on kill`,
    color: COLORS.yellow,
    baseChance: BAL.enhancements.golden.baseChance,
    chancePerLevel: BAL.enhancements.golden.chancePerLevel,
    onHit: (_b, e) => {
      e.gildedTimer = BAL.enhancements.golden.gildedDuration;
    },
  });

  registerEnhancement({
    id: 'gravityWell',
    name: 'Gravity Well',
    abbr: 'GRV',
    desc: 'Slow orb that pulls enemies in',
    color: '#9d7cd8',
    baseChance: BAL.enhancements.gravityWell.baseChance,
    chancePerLevel: BAL.enhancements.gravityWell.chancePerLevel,
    replacesDefault: true,
    onCreate: (_b, slot) => {
      const bx = player.x;
      const by = player.y - player.h / 2;
      const wellLife = BAL.enhancements.gravityWell.baseLife + slot.level * BAL.enhancements.gravityWell.lifePerLevel;
      return [{
        x: bx, y: by, vx: 0, vy: -BAL.enhancements.gravityWell.speed, w: 14, h: 14,
        alive: true, owner: 'player', ...BULLET_DEFAULTS,
        enhancement: 'gravityWell',
        gravityWellLife: wellLife,
      }];
    },
    onUpdate: (b, dt) => {
      b.gravityWellLife -= dt;
      if (b.gravityWellLife <= 0) { b.alive = false; return; }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= (1 - BAL.enhancements.gravityWell.drag * dt);
      b.vy *= (1 - BAL.enhancements.gravityWell.drag * dt);
      if (b.y < -20 || b.y > H + 20) b.alive = false;
    },
    onRender: (b, c, now) => {
      const pulse = 1 + Math.sin(now * 0.008) * 0.2;
      const r = (b.w / 2 + 4) * pulse;
      c.shadowBlur = 20;
      c.globalAlpha = 0.3;
      c.beginPath();
      c.arc(b.x, b.y, r + 8, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(b.x, b.y, r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff';
      c.globalAlpha = 0.5;
      c.beginPath();
      c.arc(b.x, b.y, r * 0.4, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    },
  });

  registerEnhancement({
    id: 'lifeDrain',
    name: 'Life Drain',
    abbr: 'DRN',
    desc: 'Chance to heal on hit',
    color: COLORS.red,
    baseChance: BAL.enhancements.lifeDrain.baseChance,
    chancePerLevel: BAL.enhancements.lifeDrain.chancePerLevel,
    onHit: () => {
      const slot = player.enhancementSlots.find(s => s?.type === 'lifeDrain');
      const healChance = BAL.enhancements.lifeDrain.baseHealChance + (slot ? slot.level * BAL.enhancements.lifeDrain.healChancePerLevel : 0);
      if (Math.random() < healChance && player.hp < player.maxHp) {
        const healAmt = (slot && slot.level >= BAL.enhancements.lifeDrain.doubleHealLevel && Math.random() < BAL.enhancements.lifeDrain.doubleHealChance) ? 2 : 1;
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        particles.push({
          x: player.x, y: player.y - player.h,
          vx: (Math.random() - 0.5) * 40, vy: -80,
          life: 0.8, maxLife: 0.8,
          char: `+${healAmt}`, color: COLORS.red, size: 14,
        });
      }
    },
  });

  registerEnhancement({
    id: 'pierce',
    name: 'Pierce',
    abbr: 'PRC',
    desc: 'Bullets pass through enemies',
    color: COLORS.cyan,
    baseChance: BAL.enhancements.pierce.baseChance,
    chancePerLevel: BAL.enhancements.pierce.chancePerLevel,
    onCreate: (b, slot) => {
      b.pierceCount = BAL.enhancements.pierce.basePierceCount + slot.level;
      b.h = BAL.enhancements.pierce.bulletH;
    },
    onRender: (b, ctx) => {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = COLORS.cyan;
      ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h * 1.5);
      ctx.globalAlpha = 1;
    },
  });

  const ALL_ENHANCEMENTS: EnhancementType[] = Object.keys(ENHANCEMENT_REGISTRY) as EnhancementType[];

  function randomEnhancementType(): EnhancementType {
    const equipped = new Set(player.enhancementSlots.filter(Boolean).map(s => s!.type));
    const available = ALL_ENHANCEMENTS.filter(t => !equipped.has(t));
    if (available.length === 0) return ALL_ENHANCEMENTS[Math.floor(Math.random() * ALL_ENHANCEMENTS.length)];
    return available[Math.floor(Math.random() * available.length)];
  }

  // =========================================================================
  // ATTACK REGISTRY
  // =========================================================================

  const ATTACK_REGISTRY: Record<string, AttackDef> = {};

  function registerAttack(def: AttackDef) {
    ATTACK_REGISTRY[def.id] = def;
  }

  // --- Attack fire functions ---

  function fireAimed(e: Enemy) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = dist(e.x, e.y, player.x, player.y);
    if (d === 0) return;
    const speed = BAL.attacks.aimed.baseSpeed + state.wave * BAL.attacks.aimed.speedPerWave;
    bullets.push({
      x: e.x,
      y: e.y + e.h / 2,
      vx: (dx / d) * speed,
      vy: (dy / d) * speed,
      w: 6,
      h: 6,
      alive: true,
      owner: 'enemy',
      ...BULLET_DEFAULTS,
    });
  }

  function fireAimedBurst(e: Enemy) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = dist(e.x, e.y, player.x, player.y);
    if (d === 0) return;
    const speed = BAL.attacks.aimedBurst.baseSpeed + state.wave * BAL.attacks.aimedBurst.speedPerWave;
    const baseAngle = Math.atan2(dy, dx);
    const half = Math.floor(BAL.attacks.aimedBurst.count / 2);
    for (let i = -half; i <= half; i++) {
      const angle = baseAngle + i * BAL.attacks.aimedBurst.spreadAngle;
      bullets.push({
        x: e.x,
        y: e.y + e.h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6,
        h: 6,
        alive: true,
        owner: 'enemy',
        ...BULLET_DEFAULTS,
      });
    }
  }

  function fireRadial(e: Enemy) {
    const count = BAL.attacks.radial.baseCount + Math.floor(state.wave / BAL.attacks.radial.countPerWaveDivisor);
    const speed = BAL.attacks.radial.baseSpeed + state.wave * BAL.attacks.radial.speedPerWave;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + e.time;
      bullets.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 5,
        h: 5,
        alive: true,
        owner: 'enemy',
        ...BULLET_DEFAULTS,
      });
    }
  }

  function fireSpiralBurst(e: Enemy) {
    const speed = BAL.attacks.spiral.baseSpeed + state.wave * BAL.attacks.spiral.speedPerWave;
    for (let v = 0; v < BAL.attacks.spiral.volleys; v++) {
      const baseAngle = e.spiralAngle + v * BAL.attacks.spiral.volleyAngleStep;
      for (let i = 0; i < BAL.attacks.spiral.armsPerVolley; i++) {
        const angle = baseAngle + (i * Math.PI * 2) / BAL.attacks.spiral.armsPerVolley;
        bullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: 5, h: 5,
          alive: true, owner: 'enemy',
          ...BULLET_DEFAULTS,
        });
      }
    }
    e.spiralAngle += BAL.attacks.spiral.angleIncrement;
  }

  function fireWall(e: Enemy) {
    const gapX = W * BAL.attacks.wall.gapMinRatio + Math.random() * W * BAL.attacks.wall.gapRangeRatio;
    const gapW = BAL.attacks.wall.gapWidth;
    const speed = BAL.attacks.wall.baseSpeed + state.wave * BAL.attacks.wall.speedPerWave;
    for (let x = BAL.attacks.wall.spacing / 2; x < W; x += BAL.attacks.wall.spacing) {
      if (Math.abs(x - gapX) < gapW / 2) continue;
      bullets.push({
        x, y: e.y + e.h / 2,
        vx: 0, vy: speed,
        w: BAL.attacks.wall.bulletW, h: BAL.attacks.wall.bulletH,
        alive: true, owner: 'enemy',
        ...BULLET_DEFAULTS,
      });
    }
  }

  function fireLaserWarning(e: Enemy) {
    const lx = player.x;
    const ly = e.y + e.h / 2;
    bullets.push({
      x: lx, y: ly, vx: 0, vy: 0, w: 4, h: H - ly,
      alive: true, owner: 'enemy', ...BULLET_DEFAULTS,
      isLaserWarning: true, warningTimer: BAL.attacks.laser.warningDuration, warningX: lx, warningSourceY: ly,
    });
  }

  function fireLaserBeam(x: number, sourceY: number) {
    bullets.push({
      x, y: sourceY, vx: 0, vy: 0, w: BAL.attacks.laser.beamWidth, h: H - sourceY,
      alive: true, owner: 'enemy', ...BULLET_DEFAULTS,
      isLaser: true, laserLife: BAL.attacks.laser.beamLife,
    });
    for (let py = sourceY; py < H; py += 30) {
      particles.push({
        x: x + (Math.random() - 0.5) * 10, y: py,
        vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 40,
        life: 0.25, maxLife: 0.25, char: '!', color: COLORS.red, size: 14,
      });
    }
  }

  function throwMine(e: Enemy) {
    const targetX = player.x + (Math.random() - 0.5) * BAL.attacks.mine.targetSpreadX;
    const targetY = player.y + (Math.random() - 0.5) * BAL.attacks.mine.targetSpreadY;
    const dx = targetX - e.x;
    const dy = targetY - e.y;
    const d = dist(e.x, e.y, targetX, targetY);
    const speed = e.isBoss ? (BAL.attacks.mine.bossSpeed + Math.random() * BAL.attacks.mine.bossSpeedRandom) : (BAL.attacks.mine.baseSpeed + Math.random() * BAL.attacks.mine.speedRandom);
    bullets.push({
      x: e.x, y: e.y + e.h / 2,
      vx: d > 0 ? (dx / d) * speed : 0,
      vy: d > 0 ? (dy / d) * speed : speed,
      w: 14, h: 14,
      alive: true, owner: 'enemy', ...BULLET_DEFAULTS,
      isMine: true, fuseTimer: -1,
    });
  }

  function fireShotgun(e: Enemy) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const baseAngle = Math.atan2(dy, dx);
    const count = BAL.attacks.shotgun.count;
    const spread = BAL.attacks.shotgun.spread;
    const speed = BAL.attacks.shotgun.baseSpeed + state.wave * BAL.attacks.shotgun.speedPerWave;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + spread * ((i / (count - 1)) - 0.5);
      bullets.push({
        x: e.x, y: e.y + e.h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 5, h: 5,
        alive: true, owner: 'enemy',
        ...BULLET_DEFAULTS,
      });
    }
  }

  function fireShotgunBoss(e: Enemy) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const baseAngle = Math.atan2(dy, dx);
    const count = BAL.attacks.shotgunBoss.count;
    const spread = BAL.attacks.shotgunBoss.spread;
    const speed = BAL.attacks.shotgunBoss.baseSpeed + state.wave * BAL.attacks.shotgunBoss.speedPerWave;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + spread * ((i / (count - 1)) - 0.5);
      bullets.push({
        x: e.x, y: e.y + e.h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6, h: 6,
        alive: true, owner: 'enemy',
        ...BULLET_DEFAULTS,
      });
    }
  }

  registerAttack({
    id: 'aimed',
    unlockWave: BAL.attacks.aimed.unlockWave,
    label: 'AIM',
    glowColor: COLORS.orange,
    bgColor: 'rgba(255,158,100,0.3)',
    fire: fireAimed,
    bossFire: fireAimedBurst,
  });

  registerAttack({
    id: 'radial',
    unlockWave: BAL.attacks.radial.unlockWave,
    label: 'RAD',
    glowColor: COLORS.red,
    bgColor: 'rgba(247,118,142,0.3)',
    introWarning: 'NEW THREAT: RADIAL SHOTS',
    fire: fireRadial,
  });

  registerAttack({
    id: 'laser',
    unlockWave: BAL.attacks.laser.unlockWave,
    label: 'LAS',
    glowColor: COLORS.blue,
    bgColor: 'rgba(122,162,247,0.3)',
    introWarning: 'NEW THREAT: LASER BEAMS',
    fire: fireLaserWarning,
    bossFire: (e: Enemy) => {
      fireLaserWarning(e);
      for (const ox of BAL.attacks.laser.bossOffsets) {
        const lx = Math.max(20, Math.min(W - 20, player.x + ox));
        const ly = e.y + e.h / 2;
        bullets.push({
          x: lx, y: ly, vx: 0, vy: 0, w: 4, h: H - ly,
          alive: true, owner: 'enemy', ...BULLET_DEFAULTS,
          isLaserWarning: true, warningTimer: BAL.attacks.laser.warningDuration, warningX: lx, warningSourceY: ly,
        });
      }
    },
  });

  registerAttack({
    id: 'mine',
    unlockWave: BAL.attacks.mine.unlockWave,
    label: 'MIN',
    glowColor: COLORS.yellow,
    bgColor: 'rgba(224,175,104,0.3)',
    introWarning: 'NEW THREAT: LAND MINES',
    fire: throwMine,
    bossFire: (e: Enemy) => {
      for (let i = 0; i < BAL.attacks.mine.bossVolley; i++) throwMine(e);
    },
  });

  registerAttack({
    id: 'spiral',
    unlockWave: Infinity,
    label: 'SPI',
    glowColor: COLORS.purple,
    bgColor: 'rgba(187,154,247,0.3)',
    bossOnly: true,
    fire: fireSpiralBurst,
  });

  registerAttack({
    id: 'wall',
    unlockWave: Infinity,
    label: 'WAL',
    glowColor: COLORS.purple,
    bgColor: 'rgba(187,154,247,0.3)',
    bossOnly: true,
    fire: fireWall,
  });

  registerAttack({
    id: 'shotgun',
    unlockWave: BAL.attacks.shotgun.unlockWave,
    label: 'SHT',
    glowColor: COLORS.red,
    bgColor: 'rgba(247,118,142,0.3)',
    introWarning: 'NEW THREAT: SHOTGUN BLASTS',
    fire: fireShotgun,
    bossFire: fireShotgunBoss,
  });

  function availableAttacks(): string[] {
    return Object.keys(ATTACK_REGISTRY).filter(id => {
      const def = ATTACK_REGISTRY[id];
      return !def.bossOnly && def.unlockWave <= state.wave;
    });
  }

  function pickAttack(): EnemyAttack {
    const attacks = availableAttacks();
    return attacks[Math.floor(Math.random() * attacks.length)] as EnemyAttack;
  }

  function enemyShoot(e: Enemy) {
    const def = ATTACK_REGISTRY[e.attackType];
    if (def && !def.bossOnly) def.fire(e);
  }

  const BOSS_ATTACKS: EnemyAttack[] = ['aimed', 'radial', 'spiral', 'laser', 'mine', 'wall', 'shotgun'];

  function bossShoot(e: Enemy) {
    const attackId = BOSS_ATTACKS[e.bossAttackIndex % BOSS_ATTACKS.length];
    const def = ATTACK_REGISTRY[attackId];
    if (def.bossFire) {
      def.bossFire(e);
    } else {
      def.fire(e);
    }
  }

  // =========================================================================
  // ENEMY TYPE REGISTRY
  // =========================================================================

  const ENEMY_TYPE_REGISTRY: Record<string, EnemyTypeDef> = {};

  function registerEnemyType(def: EnemyTypeDef) {
    ENEMY_TYPE_REGISTRY[def.id] = def;
  }

  function makeBaseEnemy(
    x: number, word: string, stats: { hp: number; speed: number },
    overrides: Partial<Enemy> = {},
  ): Enemy {
    const patterns: EnemyPattern[] = ['straight', 'sine', 'zigzag'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    ctx.font = '16px monospace';
    const measured = ctx.measureText(word);
    const ew = measured.width + 12;
    const eh = 24;
    let shootChance = Math.min(BAL.wave.shootChanceMax, BAL.wave.shootChanceBase + state.wave * BAL.wave.shootChancePerWave);
    if (state.challenge.active && state.challenge.modifier === 'bulletHell') {
      shootChance = Math.min(BAL.wave.shootChanceMax, shootChance * BAL.challenge.bulletHell.shootChanceMult);
    }
    const canShoot = enemiesShootThisWave() && Math.random() < shootChance;
    let speed = stats.speed;
    if (state.challenge.active && state.challenge.modifier === 'speedUp') {
      speed *= BAL.challenge.speedUp.enemySpeedMult;
    }
    let shootInterval = Math.max(BAL.wave.minShootInterval, BAL.wave.shootIntervalBase - state.wave * BAL.wave.shootIntervalDecay);
    if (state.challenge.active && state.challenge.modifier === 'bulletHell') {
      shootInterval *= BAL.challenge.bulletHell.shootIntervalMult;
    }
    return {
      x, y: -eh, vx: 0, vy: speed,
      w: ew, h: eh, word,
      hp: stats.hp, maxHp: stats.hp,
      alive: true, hitFlash: 0,
      pattern, phaseOffset: Math.random() * Math.PI * 2,
      baseX: x, time: 0,
      canShoot, attackType: canShoot ? pickAttack() : 'aimed',
      shootTimer: BAL.wave.shootTimerBase + Math.random() * BAL.wave.shootTimerRandom,
      shootInterval,
      ...ENEMY_DEFAULTS,
      ...overrides,
    };
  }

  function moveByPattern(e: Enemy, dt: number) {
    switch (e.pattern) {
      case 'straight':
        e.y += e.vy * dt;
        break;
      case 'sine':
        e.y += e.vy * dt;
        e.x = e.baseX + Math.sin(e.time * BAL.movement.sine.frequency + e.phaseOffset) * BAL.movement.sine.amplitude;
        break;
      case 'zigzag':
        e.y += e.vy * dt;
        e.x = e.baseX + ((Math.floor(e.time * BAL.movement.zigzag.frequency) % 2 === 0 ? 1 : -1) * BAL.movement.zigzag.amplitude * (e.time % 0.5)) / 0.5;
        break;
      case 'erratic':
        e.y += e.vy * dt;
        e.x = e.baseX + Math.sin(e.time * BAL.movement.erratic.freq1 + e.phaseOffset) * BAL.movement.erratic.amp1
            + Math.cos(e.time * BAL.movement.erratic.freq2 + e.phaseOffset * 2) * BAL.movement.erratic.amp2;
        break;
    }
  }

  registerEnemyType({
    id: 'normal',
    unlockWave: BAL.enemyTypes.normal.unlockWave,
    weight: BAL.enemyTypes.normal.weight,
    spawn: () => {
      const word = nextWord();
      const stats = getEnemyStats(word);
      const x = Math.random() * (W - 60) + 30;
      enemies.push(makeBaseEnemy(x, word, stats, { enemyType: 'normal' }));
    },
  });

  registerEnemyType({
    id: 'splitter',
    unlockWave: BAL.enemyTypes.splitter.unlockWave,
    weight: BAL.enemyTypes.splitter.weight,
    introWarning: 'NEW ENEMY: SPLITTERS',
    spawn: () => {
      const word = nextWord();
      const stats = getEnemyStats(word);
      const x = Math.random() * (W - 60) + 30;
      enemies.push(makeBaseEnemy(x, word, { hp: stats.hp + BAL.enemyTypes.splitter.hpBonus, speed: stats.speed }, {
        enemyType: 'splitter',
      }));
    },
    onKill: (e) => {
      if (!e.isSplitterChild) spawnSplitterChildren(e);
    },
  });

  registerEnemyType({
    id: 'swarm',
    unlockWave: BAL.enemyTypes.swarm.unlockWave,
    weight: BAL.enemyTypes.swarm.weight,
    introWarning: 'NEW ENEMY: SWARM',
    spawn: () => {
      const count = BAL.enemyTypes.swarm.countBase + Math.floor(Math.random() * BAL.enemyTypes.swarm.countRandom);
      const clusterX = Math.random() * (W - 100) + 50;
      const chars = ['*', '#', '~', '!', '@'];
      for (let i = 0; i < count; i++) {
        const x = clusterX + (Math.random() - 0.5) * BAL.enemyTypes.swarm.clusterSpread;
        const ch = chars[Math.floor(Math.random() * chars.length)];
        enemies.push({
          x, y: -(Math.random() * 40), vx: 0,
          vy: BAL.enemyTypes.swarm.speedBase + state.wave * BAL.enemyTypes.swarm.speedPerWave + Math.random() * BAL.enemyTypes.swarm.speedRandom,
          w: 16, h: 16, word: ch,
          hp: 1, maxHp: 1,
          alive: true, hitFlash: 0,
          pattern: 'erratic',
          phaseOffset: Math.random() * Math.PI * 2,
          baseX: x, time: Math.random() * 3,
          canShoot: false, attackType: 'aimed',
          shootTimer: 99, shootInterval: 99,
          ...ENEMY_DEFAULTS,
          enemyType: 'swarm',
        });
      }
      state.enemiesSpawned += count - 1;
      state.enemiesRemaining += count - 1;
    },
  });

  registerEnemyType({
    id: 'cloaker',
    unlockWave: BAL.enemyTypes.cloaker.unlockWave,
    weight: BAL.enemyTypes.cloaker.weight,
    introWarning: 'NEW ENEMY: CLOAKERS',
    spawn: () => {
      const word = nextWord();
      const stats = getEnemyStats(word);
      const x = Math.random() * (W - 60) + 30;
      enemies.push(makeBaseEnemy(x, word, stats, {
        enemyType: 'cloaker',
        cloakPhase: Math.random() * Math.PI * 2,
      }));
    },
    move: (e, dt) => {
      e.cloakPhase += dt * BAL.enemyTypes.cloaker.cloakSpeed;
      e.cloakVisible = Math.sin(e.cloakPhase) > BAL.enemyTypes.cloaker.visibleThreshold;
      moveByPattern(e, dt);
    },
    canBeHit: (e) => e.cloakVisible,
  });

  function pickEnemyType(): string {
    const available = Object.values(ENEMY_TYPE_REGISTRY).filter(
      def => def.unlockWave <= state.wave,
    );
    const totalWeight = available.reduce((sum, def) => sum + def.weight, 0);
    let r = Math.random() * totalWeight;
    for (const def of available) {
      r -= def.weight;
      if (r <= 0) return def.id;
    }
    return 'normal';
  }

  function spawnEnemy() {
    const before = enemies.length;
    const typeId = pickEnemyType();
    ENEMY_TYPE_REGISTRY[typeId].spawn();
    for (let i = before; i < enemies.length; i++) {
      applyEliteStatus(enemies[i]);
    }
  }

  function spawnSplitterChildren(parent: Enemy) {
    const count = BAL.enemyTypes.splitter.childCountBase + Math.floor(Math.random() * BAL.enemyTypes.splitter.childCountRandom);
    for (let i = 0; i < count; i++) {
      const offsetX = (i - (count - 1) / 2) * BAL.enemyTypes.splitter.childOffsetX;
      enemies.push({
        x: parent.x + offsetX, y: parent.y, vx: 0, vy: parent.vy * BAL.enemyTypes.splitter.childSpeedMult,
        w: Math.max(16, parent.w - 8), h: 18,
        word: parent.word.slice(0, Math.max(2, Math.ceil(parent.word.length / 2))),
        hp: 1, maxHp: 1,
        alive: true, hitFlash: 0,
        pattern: parent.pattern,
        phaseOffset: Math.random() * Math.PI * 2,
        baseX: parent.x + offsetX, time: 0,
        canShoot: false, attackType: 'aimed',
        shootTimer: 99, shootInterval: 99,
        ...ENEMY_DEFAULTS,
        enemyType: 'splitter',
        isSplitterChild: true,
      });
    }
    state.enemiesRemaining += count;
  }

  // =========================================================================
  // BOSS TYPE REGISTRY
  // =========================================================================

  const BOSS_TYPE_REGISTRY: Record<string, BossTypeDef> = {};

  function registerBossType(def: BossTypeDef) {
    BOSS_TYPE_REGISTRY[def.id] = def;
  }

  function makeBossEnemy(overrides: Partial<Enemy>): Enemy {
    return {
      x: W / 2, y: -40, vx: 0, vy: BAL.boss.speed,
      w: 0, h: 40, word: '',
      hp: 0, maxHp: 0,
      alive: true, hitFlash: 0,
      pattern: 'sine', phaseOffset: 0,
      baseX: W / 2, time: 0,
      canShoot: true, attackType: 'aimed',
      shootTimer: 1, shootInterval: BAL.boss.shootInterval,
      ...ENEMY_DEFAULTS,
      isBoss: true,
      ...overrides,
    };
  }

  registerBossType({
    id: 'classic',
    unlockWave: BAL.bossTypes.classic.unlockWave,
    name: 'BOSS',
    introWarning: 'PREPARE YOURSELF',
    spawn: () => {
      const bossHp = BAL.boss.hpBase + state.wave * BAL.boss.hpPerWave;
      const bossWord = '< BOSS >';
      ctx.font = 'bold 24px monospace';
      const measured = ctx.measureText(bossWord);
      const bw = measured.width + 40;
      enemies.push(makeBossEnemy({
        w: bw, word: bossWord,
        hp: bossHp, maxHp: bossHp,
        bossType: 'classic',
        bossData: {},
      }));
    },
    move: (e, dt) => {
      if (e.y < BAL.boss.restY) {
        e.y += e.vy * dt;
      } else {
        e.y = BAL.boss.restY;
        e.x = W / 2 + Math.sin(e.time * BAL.boss.sineSpeed) * (W * BAL.boss.sineAmplitudeRatio);
      }
    },
    attack: (e, dt) => {
      e.bossAttackTimer += dt;
      if (e.bossAttackTimer >= BAL.boss.attackTimer) {
        bossShoot(e);
        e.bossAttackTimer = 0;
        e.bossAttackIndex++;
      }
    },
    render: (e, c) => {
      const flash = e.hitFlash > 0;
      const gilded = e.gildedTimer > 0;
      c.font = 'bold 24px monospace';
      const glowColor = gilded ? COLORS.yellow : COLORS.red;
      c.shadowColor = flash ? '#fff' : glowColor;
      c.shadowBlur = flash ? 30 : gilded ? 24 : 16;
      c.fillStyle = flash ? 'rgba(255,255,255,0.3)' : 'rgba(247,118,142,0.2)';
      c.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      c.strokeStyle = flash ? '#fff' : glowColor;
      c.lineWidth = 2;
      c.strokeRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      c.fillStyle = flash ? '#fff' : COLORS.fgBright;
      c.fillText(e.word, e.x, e.y);
      drawBossHpBar(e, c);
    },
  });

  function drawBossHpBar(e: Enemy, c: CanvasRenderingContext2D) {
    const barW = Math.max(e.w, 120);
    const barH = 6;
    const barY = e.y - e.h / 2 - 12;
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(e.x - barW / 2, barY, barW, barH);
    const hpRatio = e.hp / e.maxHp;
    c.fillStyle = hpRatio > 0.5 ? COLORS.red : hpRatio > 0.25 ? COLORS.orange : COLORS.yellow;
    c.fillRect(e.x - barW / 2, barY, barW * hpRatio, barH);
    c.strokeStyle = COLORS.fgMuted;
    c.lineWidth = 1;
    c.strokeRect(e.x - barW / 2, barY, barW, barH);
  }

  // --- The Paragraph ---

  function scrapeParagraph(): string[] {
    const paragraphs = document.querySelectorAll('.page-content p');
    const candidates: string[][] = [];
    paragraphs.forEach(p => {
      const text = (p.textContent || '').trim();
      const words = text.split(/\s+/).filter(w => w.length > 0);
      if (words.length >= 5) candidates.push(words);
    });
    if (candidates.length === 0) {
      return ['The', 'words', 'have', 'escaped', 'the', 'page', 'and', 'formed', 'a', 'monster'];
    }
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    return picked.slice(0, BAL.bossTypes.paragraph.maxWords);
  }

  interface ParagraphSegment {
    word: string;
    relX: number;
    relY: number;
    alive: boolean;
    hp: number;
    maxHp: number;
  }

  function layoutParagraphSegments(words: string[], segHp: number): ParagraphSegment[] {
    const spacing = BAL.bossTypes.paragraph.segmentSpacing;
    const rowSpacing = BAL.bossTypes.paragraph.rowSpacing;
    const maxRowW = W * 0.7;
    const segments: ParagraphSegment[] = [];
    let curX = 0;
    let curY = 0;
    ctx.font = 'bold 16px monospace';
    for (const word of words) {
      const ww = ctx.measureText(word).width;
      if (curX + ww > maxRowW && curX > 0) {
        curX = 0;
        curY += rowSpacing;
      }
      segments.push({ word, relX: curX + ww / 2, relY: curY, alive: true, hp: segHp, maxHp: segHp });
      curX += ww + spacing;
    }
    // Center each row
    const rows: number[] = [...new Set(segments.map(s => s.relY))];
    for (const rowY of rows) {
      const rowSegs = segments.filter(s => s.relY === rowY);
      const lastSeg = rowSegs[rowSegs.length - 1];
      const lastW = ctx.measureText(lastSeg.word).width;
      const rowW = lastSeg.relX + lastW / 2;
      const offset = -rowW / 2;
      for (const s of rowSegs) s.relX += offset;
    }
    // Center vertically
    const totalH = rows[rows.length - 1];
    const vOffset = -totalH / 2;
    for (const s of segments) s.relY += vOffset;
    return segments;
  }

  registerBossType({
    id: 'paragraph',
    unlockWave: BAL.bossTypes.paragraph.unlockWave,
    name: 'THE PARAGRAPH',
    introWarning: 'THE PAGE FIGHTS BACK',
    spawn: () => {
      const words = scrapeParagraph();
      const segHp = BAL.bossTypes.paragraph.segmentHpBase + Math.floor(state.wave / 5) * BAL.bossTypes.paragraph.segmentHpPerWave;
      const segments = layoutParagraphSegments(words, segHp);
      const totalHp = segments.reduce((sum, s) => sum + s.hp, 0);
      const totalW = W * 0.7;
      const totalH = 80;
      enemies.push(makeBossEnemy({
        w: totalW, h: totalH, word: 'THE PARAGRAPH',
        hp: totalHp, maxHp: totalHp,
        bossType: 'paragraph',
        bossData: { segments, phase: 0, attackTimer: 0 },
      }));
    },
    move: (e, dt) => {
      if (e.y < BAL.boss.restY) {
        e.y += e.vy * dt;
      } else {
        e.y = BAL.boss.restY;
        const phase = e.bossData.phase || 0;
        const speedMult = 1 + phase * BAL.bossTypes.paragraph.speedBoostPerPhase;
        e.x = W / 2 + Math.sin(e.time * BAL.boss.sineSpeed * speedMult) * (W * BAL.boss.sineAmplitudeRatio);
      }
    },
    onUpdate: (e, dt) => {
      const segs = e.bossData.segments as ParagraphSegment[];
      const aliveCount = segs.filter(s => s.alive).length;
      const ratio = aliveCount / segs.length;
      const thresholds = BAL.bossTypes.paragraph.phaseThresholds;
      let phase = 0;
      if (ratio <= thresholds[1]) phase = 2;
      else if (ratio <= thresholds[0]) phase = 1;
      e.bossData.phase = phase;
    },
    attack: (e, dt) => {
      const phase = e.bossData.phase || 0;
      const intervals = [BAL.boss.attackTimer, BAL.boss.attackTimer * 0.7, BAL.boss.attackTimer * 0.5];
      e.bossData.attackTimer = (e.bossData.attackTimer || 0) + dt;
      if (e.bossData.attackTimer >= intervals[phase]) {
        e.bossData.attackTimer = 0;
        const segs = (e.bossData.segments as ParagraphSegment[]).filter(s => s.alive);
        if (segs.length === 0) return;
        const seg = segs[Math.floor(Math.random() * segs.length)];
        const sx = e.x + seg.relX;
        const sy = e.y + seg.relY;
        if (phase === 0) {
          // Aimed shots from random segment
          const angle = Math.atan2(player.y - sy, player.x - sx);
          const speed = BAL.attacks.aimed.baseSpeed + state.wave * BAL.attacks.aimed.speedPerWave;
          bullets.push({ x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, w: 6, h: 6, alive: true, owner: 'enemy', ...BULLET_DEFAULTS });
        } else if (phase === 1) {
          // Radial burst from segment
          const count = 6;
          const speed = BAL.attacks.radial.baseSpeed + state.wave * BAL.attacks.radial.speedPerWave;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            bullets.push({ x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, w: 6, h: 6, alive: true, owner: 'enemy', ...BULLET_DEFAULTS });
          }
        } else {
          // Spiral + aimed
          const speed = BAL.attacks.spiral.baseSpeed + state.wave * BAL.attacks.spiral.speedPerWave;
          for (let i = 0; i < 3; i++) {
            const angle = e.bossData.spiralAngle || 0;
            const a = angle + (Math.PI * 2 * i) / 3;
            bullets.push({ x: sx, y: sy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, w: 6, h: 6, alive: true, owner: 'enemy', ...BULLET_DEFAULTS });
          }
          e.bossData.spiralAngle = ((e.bossData.spiralAngle || 0) + 0.4);
          // Also aimed
          const aimAngle = Math.atan2(player.y - sy, player.x - sx);
          const aimSpeed = BAL.attacks.aimed.baseSpeed + state.wave * BAL.attacks.aimed.speedPerWave;
          bullets.push({ x: sx, y: sy, vx: Math.cos(aimAngle) * aimSpeed, vy: Math.sin(aimAngle) * aimSpeed, w: 6, h: 6, alive: true, owner: 'enemy', ...BULLET_DEFAULTS });
        }
      }
    },
    render: (e, c) => {
      const segs = e.bossData.segments as ParagraphSegment[];
      c.font = 'bold 16px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      for (const seg of segs) {
        const sx = e.x + seg.relX;
        const sy = e.y + seg.relY;
        if (seg.alive) {
          const hpRatio = seg.hp / seg.maxHp;
          c.shadowColor = COLORS.red;
          c.shadowBlur = 8;
          c.fillStyle = hpRatio > 0.5 ? COLORS.fgBright : hpRatio > 0.25 ? COLORS.orange : COLORS.red;
          c.fillText(seg.word, sx, sy);
        } else {
          c.shadowBlur = 0;
          c.fillStyle = 'rgba(86,95,137,0.3)';
          c.fillText(seg.word, sx, sy);
          // Strikethrough
          const ww = c.measureText(seg.word).width;
          c.strokeStyle = 'rgba(86,95,137,0.4)';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(sx - ww / 2, sy);
          c.lineTo(sx + ww / 2, sy);
          c.stroke();
        }
      }
      c.shadowBlur = 0;
      drawBossHpBar(e, c);
    },
  });

  // --- Echo Boss ---

  registerBossType({
    id: 'echo',
    unlockWave: BAL.bossTypes.echo.unlockWave,
    name: 'ECHO',
    introWarning: 'IT LEARNS YOUR MOVES',
    spawn: () => {
      const bossHp = BAL.bossTypes.echo.hpBase + state.wave * BAL.bossTypes.echo.hpPerWave;
      const bossWord = '< ECHO >';
      ctx.font = 'bold 24px monospace';
      const measured = ctx.measureText(bossWord);
      const bw = measured.width + 40;
      state.replayBuffer = [];
      enemies.push(makeBossEnemy({
        w: bw, word: bossWord,
        hp: bossHp, maxHp: bossHp,
        bossType: 'echo',
        bossData: { phase: 'recording', recordTimer: 0, replayIndex: 0, shootTimer: 0, trail: [] as { x: number; y: number }[] },
      }));
    },
    move: (e, dt) => {
      const data = e.bossData;
      const echoConf = BAL.bossTypes.echo;
      if (e.y < BAL.boss.restY) {
        e.y += e.vy * dt;
        return;
      }
      if (data.phase === 'recording') {
        // Simple sine movement during recording
        e.y = BAL.boss.restY;
        e.x = W / 2 + Math.sin(e.time * BAL.boss.sineSpeed) * (W * BAL.boss.sineAmplitudeRatio);
      } else {
        // Replaying: follow recorded player positions
        const buf = state.replayBuffer;
        if (buf.length > 0) {
          const idx = Math.floor(data.replayIndex) % buf.length;
          const entry = buf[idx];
          const targetX = entry.x;
          const dx = targetX - e.x;
          const moveX = Math.sign(dx) * Math.min(Math.abs(dx), echoConf.moveSpeed * dt);
          e.x += moveX;
          e.y = BAL.boss.restY;
          data.replayIndex += 60 * dt; // advance through buffer at ~60fps rate
        }
      }
      // Trail for visual effect
      const trail = data.trail as { x: number; y: number }[];
      trail.push({ x: e.x, y: e.y });
      if (trail.length > 20) trail.shift();
    },
    onUpdate: (e, dt) => {
      const data = e.bossData;
      if (data.phase === 'recording') {
        data.recordTimer += dt;
        // Record player position
        state.replayBuffer.push({
          x: player.x, y: player.y,
          shooting: keys[' '] || keys['space'] || false,
          time: e.time,
        });
        if (state.replayBuffer.length > BAL.bossTypes.echo.replayBufferSize) {
          state.replayBuffer.shift();
        }
        if (data.recordTimer >= BAL.bossTypes.echo.replayDelay) {
          data.phase = 'replaying';
          data.replayIndex = 0;
        }
      }
    },
    attack: (e, dt) => {
      const data = e.bossData;
      data.shootTimer = (data.shootTimer || 0) + dt;
      if (data.phase === 'recording') {
        // Simple aimed shots during recording
        if (data.shootTimer >= BAL.boss.attackTimer) {
          data.shootTimer = 0;
          const angle = Math.atan2(player.y - e.y, player.x - e.x);
          const speed = BAL.attacks.aimed.baseSpeed + state.wave * BAL.attacks.aimed.speedPerWave;
          bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, w: 6, h: 6, alive: true, owner: 'enemy', ...BULLET_DEFAULTS });
        }
      } else {
        // Replaying: fire when recording shows player was shooting
        const buf = state.replayBuffer;
        if (buf.length > 0 && data.shootTimer >= 0.15) {
          const idx = Math.floor(data.replayIndex) % buf.length;
          if (buf[idx].shooting) {
            data.shootTimer = 0;
            const angle = Math.atan2(player.y - e.y, player.x - e.x);
            const speed = BAL.attacks.aimed.baseSpeed + state.wave * BAL.attacks.aimed.speedPerWave * 1.2;
            bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, w: 6, h: 6, alive: true, owner: 'enemy', ...BULLET_DEFAULTS });
          }
        }
      }
    },
    render: (e, c) => {
      const flash = e.hitFlash > 0;
      const data = e.bossData;
      const isReplaying = data.phase === 'replaying';

      // Draw trail during replay
      if (isReplaying) {
        const trail = data.trail as { x: number; y: number }[];
        for (let i = 0; i < trail.length; i++) {
          const alpha = (i / trail.length) * 0.3;
          c.fillStyle = `rgba(122,162,247,${alpha})`;
          c.fillRect(trail[i].x - e.w / 4, trail[i].y - e.h / 4, e.w / 2, e.h / 2);
        }
      }

      c.font = 'bold 24px monospace';
      const baseColor = isReplaying ? COLORS.blue : COLORS.purple;
      c.globalAlpha = isReplaying ? 0.8 : 1;
      c.shadowColor = flash ? '#fff' : baseColor;
      c.shadowBlur = flash ? 30 : 16;
      c.fillStyle = flash ? 'rgba(255,255,255,0.3)' : `rgba(122,162,247,0.2)`;
      c.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      c.strokeStyle = flash ? '#fff' : baseColor;
      c.lineWidth = 2;
      c.strokeRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      c.fillStyle = flash ? '#fff' : COLORS.fgBright;
      c.fillText(e.word, e.x, e.y);
      c.globalAlpha = 1;
      c.shadowBlur = 0;
      drawBossHpBar(e, c);
    },
  });

  // --- The Cursor ---

  registerBossType({
    id: 'cursor',
    unlockWave: BAL.bossTypes.cursor.unlockWave,
    name: 'THE CURSOR',
    introWarning: 'CLICK. CLICK. CLICK.',
    spawn: () => {
      const bossHp = BAL.bossTypes.cursor.hpBase + state.wave * BAL.bossTypes.cursor.hpPerWave;
      enemies.push(makeBossEnemy({
        w: 30, h: 40, word: '',
        hp: bossHp, maxHp: bossHp,
        bossType: 'cursor',
        bossData: { teleportTimer: 0, isTeleporting: false, targetX: 0, targetY: 0, warningTimer: 0, shootTimer: 0 },
      }));
    },
    move: (e, dt) => {
      const data = e.bossData;
      const conf = BAL.bossTypes.cursor;
      if (e.y < BAL.boss.restY) {
        e.y += e.vy * dt;
        return;
      }
      if (data.isTeleporting) {
        data.warningTimer += dt;
        if (data.warningTimer >= conf.teleportWarningDuration) {
          // Teleport!
          e.x = data.targetX;
          e.y = data.targetY;
          data.isTeleporting = false;
          data.teleportTimer = 0;
          // Shockwave on arrival
          const count = conf.shockwaveBullets;
          const speed = BAL.attacks.radial.baseSpeed + state.wave * BAL.attacks.radial.speedPerWave;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, w: 8, h: 8, alive: true, owner: 'enemy', ...BULLET_DEFAULTS });
          }
          triggerShake(6, 0.3);
        }
      } else {
        data.teleportTimer += dt;
        if (data.teleportTimer >= conf.teleportInterval) {
          data.isTeleporting = true;
          data.warningTimer = 0;
          data.targetX = Math.random() * (W - 80) + 40;
          data.targetY = 40 + Math.random() * (H * 0.35);
        }
      }
    },
    attack: (e, dt) => {
      const data = e.bossData;
      if (data.isTeleporting) return;
      if (e.y < BAL.boss.restY) return;
      data.shootTimer = (data.shootTimer || 0) + dt;
      if (data.shootTimer >= BAL.bossTypes.cursor.idleShootInterval) {
        data.shootTimer = 0;
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        const speed = BAL.attacks.aimed.baseSpeed + state.wave * BAL.attacks.aimed.speedPerWave;
        bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, w: 6, h: 6, alive: true, owner: 'enemy', ...BULLET_DEFAULTS });
      }
    },
    canBeHit: (e) => !e.bossData.isTeleporting,
    render: (e, c) => {
      const flash = e.hitFlash > 0;
      const data = e.bossData;

      // Draw teleport warning reticle
      if (data.isTeleporting) {
        const warningAlpha = 0.3 + Math.sin(data.warningTimer * 20) * 0.3;
        c.strokeStyle = `rgba(247,118,142,${warningAlpha})`;
        c.lineWidth = 2;
        const r = 25;
        c.beginPath();
        c.arc(data.targetX, data.targetY, r, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.moveTo(data.targetX - r - 5, data.targetY);
        c.lineTo(data.targetX + r + 5, data.targetY);
        c.moveTo(data.targetX, data.targetY - r - 5);
        c.lineTo(data.targetX, data.targetY + r + 5);
        c.stroke();
      }

      // Draw cursor arrow
      c.save();
      c.translate(e.x, e.y);
      const pulse = 1 + Math.sin(e.time * 4) * 0.05;
      c.scale(pulse, pulse);
      c.shadowColor = flash ? '#fff' : COLORS.fgBright;
      c.shadowBlur = flash ? 20 : 8 + Math.sin(e.time * 3) * 4;
      c.beginPath();
      c.moveTo(0, -16);
      c.lineTo(8, 8);
      c.lineTo(3, 6);
      c.lineTo(6, 16);
      c.lineTo(2, 16);
      c.lineTo(-1, 6);
      c.lineTo(-6, 10);
      c.closePath();
      c.fillStyle = flash ? '#fff' : COLORS.fgBright;
      c.fill();
      c.strokeStyle = '#000';
      c.lineWidth = 1.5;
      c.stroke();
      c.restore();
      c.shadowBlur = 0;

      drawBossHpBar(e, c);
    },
  });

  function pickBossType(): BossType {
    const available = Object.values(BOSS_TYPE_REGISTRY).filter(
      def => def.unlockWave <= state.wave,
    );
    const bossWaveIndex = Math.floor(state.wave / BAL.wave.bossWaveInterval) - 1;
    return available[bossWaveIndex % available.length].id;
  }

  // =========================================================================
  // SPAWN / KILL / EFFECTS
  // =========================================================================

  function spawnBoss() {
    state.bossActive = true;
    const bossType = pickBossType();
    state.currentBossType = bossType;
    const def = BOSS_TYPE_REGISTRY[bossType];
    def.spawn();
    state.enemiesRemaining = 1;
    state.enemiesSpawned = state.enemiesPerWave;
  }

  function damageEnemy(e: Enemy, amount = 1): void {
    const dmg = (e.isElite && e.eliteModifier === 'bulletSponge')
      ? amount * BAL.elite.bulletSponge.damageReduction
      : amount;
    e.hp -= dmg;
  }

  function killEnemy(e: Enemy) {
    e.alive = false;
    state.enemiesRemaining--;

    const typeDef = ENEMY_TYPE_REGISTRY[e.enemyType];
    if (typeDef?.onKill) typeDef.onKill(e);

    state.totalKills++;
    const gilded = e.gildedTimer > 0;
    let mult = gilded ? BAL.enhancements.golden.pointMult : 1;
    if (e.isElite) mult *= BAL.elite.pointMultiplier;
    if (state.challenge.active) mult *= BAL.challenge.bonusPointMultiplier;
    const comboMult = comboMultiplier();
    state.score += Math.round(e.word.length * BAL.timing.killScorePerChar * mult * comboMult);
    state.points += Math.round(BAL.timing.killPoints * mult * comboMult);

    state.combo++;
    state.comboTimer = BAL.timing.comboDecay;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;

    if (e.isBoss) {
      state.bossActive = false;
      state.currentBossType = null;
      state.points += BAL.boss.killPoints * mult;
      if (e.bossType) {
        const bossDef = BOSS_TYPE_REGISTRY[e.bossType];
        bossDef?.onKill?.(e);
      }
      spawnBossDeathEffect(e.x, e.y);
      triggerShake(BAL.boss.killShakeIntensity, BAL.boss.killShakeDuration);
      state.timeScale = BAL.boss.killSlowMo;
      state.timeScaleTimer = BAL.boss.killSlowMoDuration;
      for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24;
        const speed = 60 + Math.random() * 120;
        const chars = ['*', '#', '!', '@', '%'];
        const colors = [COLORS.cyan, COLORS.purple, COLORS.orange, COLORS.yellow];
        particles.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1.5 + Math.random() * 0.5, maxLife: 2,
          char: chars[Math.floor(Math.random() * chars.length)],
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 16 + Math.random() * 12,
        });
      }
    }
    spawnParticles(e.x, e.y, e.word);
    if (gilded) {
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: e.x, y: e.y,
          vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200,
          life: 0.6, maxLife: 0.6, char: '$', color: COLORS.yellow, size: 16,
        });
      }
    }
    if (Math.random() < (e.isBoss ? BAL.loot.bossDropChance : BAL.loot.dropChance)) {
      lootCrates.push({ x: e.x, y: e.y, vy: BAL.loot.crateSpeed, alive: true, enhancement: randomEnhancementType() });
    }

    // Elite: vengeful burst on death
    if (e.isElite && e.eliteModifier === 'vengeful') {
      const count = BAL.elite.vengeful.burstCount;
      const speed = BAL.elite.vengeful.burstSpeed;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        bullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          w: 6, h: 6,
          alive: true, owner: 'enemy',
          ...BULLET_DEFAULTS,
        });
      }
    }

    // Synergy: Midas Touch — heal extra on gilded kill
    if (gilded && state.activeSynergies.has('goldenLifeDrain')) {
      player.hp = Math.min(player.maxHp, player.hp + BAL.synergies.goldenLifeDrain.healOnKill);
    }
  }

  function spawnExplosion(x: number, y: number, isCluster = false) {
    triggerShake(5, 0.2);
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      particles.push({
        x, y,
        vx: Math.cos(angle) * 150, vy: Math.sin(angle) * 150,
        life: 0.4, maxLife: 0.4, char: '*', color: COLORS.orange, size: 14,
      });
    }
    const radius = isCluster ? BAL.synergies.explodingRadial.clusterRadius : BAL.enhancements.exploding.aoeRadius;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (!canHitEnemy(e)) continue;
      if (dist(x, y, e.x, e.y) < radius) {
        damageEnemy(e);
        e.hitFlash = 1;
        if (e.hp <= 0) killEnemy(e);
      }
    }
    // Synergy: Cluster Bomb — secondary explosions
    if (!isCluster && state.activeSynergies.has('explodingRadial')) {
      const count = BAL.synergies.explodingRadial.clusterCount;
      const spread = BAL.synergies.explodingRadial.clusterSpread;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const cx = x + Math.cos(angle) * spread;
        const cy = y + Math.sin(angle) * spread;
        spawnExplosion(cx, cy, true);
      }
    }
  }

  function spawnMineExplosion(x: number, y: number) {
    triggerShake(6, 0.25);
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      particles.push({
        x, y,
        vx: Math.cos(angle) * 120, vy: Math.sin(angle) * 120,
        life: 0.5, maxLife: 0.5, char: '#', color: COLORS.yellow, size: 12,
      });
    }
  }

  function spawnBossDeathEffect(x: number, y: number) {
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40;
      const speed = 100 + Math.random() * 200;
      const chars = ['*', '#', '!', '@', '$', '%'];
      const colors = [COLORS.cyan, COLORS.purple, COLORS.orange, COLORS.yellow, COLORS.red];
      particles.push({
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1 + Math.random() * 0.5, maxLife: 1.5,
        char: chars[Math.floor(Math.random() * chars.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 10 + Math.random() * 16,
      });
    }
  }

  function spawnParticles(x: number, y: number, word: string) {
    const comboMult = 1 + Math.min(state.combo * 0.1, 2);
    const repeats = Math.ceil(comboMult);
    for (let r = 0; r < repeats; r++) {
      for (const char of word) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200,
          life: 0.6 + Math.random() * 0.4, maxLife: 1,
          char, color: COLORS.cyan, size: 14,
        });
      }
    }
  }

  // =========================================================================
  // SHOP
  // =========================================================================

  function buildShopItems(): ShopItem[] {
    const items: ShopItem[] = [
      {
        id: 'hp_up',
        name: '+1 Max HP',
        desc: 'Increase maximum health by 1',
        cost: shopCost(BAL.shop.hpUpBase, 'hp_up'),
        available: () => true,
        apply: () => {
          player.maxHp++;
          player.hp++;
          purchaseCounts['hp_up'] = (purchaseCounts['hp_up'] || 0) + 1;
        },
      },
      {
        id: 'heal',
        name: 'Full Heal',
        desc: 'Restore all health',
        cost: shopCost(BAL.shop.healBase, 'heal'),
        available: () => player.hp < player.maxHp,
        apply: () => {
          player.hp = player.maxHp;
          purchaseCounts['heal'] = (purchaseCounts['heal'] || 0) + 1;
        },
      },
      {
        id: 'fire_rate',
        name: 'Faster Firing',
        desc: `Reduce shot cooldown (current: ${Math.round(player.shootCooldown * 1000)}ms)`,
        cost: shopCost(BAL.shop.fireRateBase, 'fire_rate'),
        available: () => player.shootCooldown > BAL.shop.fireRateMin,
        apply: () => {
          player.shootCooldown = Math.max(BAL.shop.fireRateMin, player.shootCooldown - BAL.shop.fireRateStep);
          purchaseCounts['fire_rate'] = (purchaseCounts['fire_rate'] || 0) + 1;
        },
      },
      {
        id: 'max_bullets',
        name: '+1 Bullet Count',
        desc: `More bullets on screen (current: ${player.maxBullets})`,
        cost: shopCost(BAL.shop.maxBulletsBase, 'max_bullets'),
        available: () => player.maxBullets < BAL.shop.maxBulletsCap,
        apply: () => {
          player.maxBullets++;
          purchaseCounts['max_bullets'] = (purchaseCounts['max_bullets'] || 0) + 1;
        },
      },
    ];

    for (let i = 0; i < player.enhancementSlots.length; i++) {
      const slot = player.enhancementSlots[i];
      if (!slot) continue;
      const slotId = `enhance_${i}`;
      const def = ENHANCEMENT_REGISTRY[slot.type];
      items.push({
        id: slotId,
        name: `${def.name} Lv${slot.level + 1}`,
        desc: `+${Math.round(def.chancePerLevel * 100)}% chance (current: ${pct(slot.chance)})`,
        cost: shopCost(BAL.shop.enhanceBaseCost + slot.level, slotId),
        available: () => slot.level < BAL.shop.enhanceLevelCap,
        apply: () => {
          slot.level++;
          slot.chance = Math.min(1, slot.chance + def.chancePerLevel);
          purchaseCounts[slotId] = (purchaseCounts[slotId] || 0) + 1;
        },
      });

      const sacrificeId = `sacrifice_${i}`;
      const reward = BAL.shop.sacrificeBaseReward + slot.level * BAL.shop.sacrificeRewardPerLevel;
      items.push({
        id: sacrificeId,
        name: `Sacrifice ${def.name}`,
        desc: `Destroy for +${reward} pts and +1 HP`,
        cost: 0,
        available: () => true,
        apply: () => {
          state.points += reward;
          player.hp = Math.min(player.maxHp, player.hp + 1);
          player.enhancementSlots[i] = null;
          recalcSynergies();
          shopItems = buildShopItems();
        },
      });
    }

    return items;
  }

  let shopItems: ShopItem[] = [];

  function startWave() {
    state.phase = 'waveIntro';
    state.waveTimer = isBossWave() ? BAL.wave.bossIntroDuration : BAL.wave.introDuration;
    state.enemiesSpawned = 0;
    state.enemiesPerWave = isBossWave() ? 0 : BAL.wave.baseEnemies + state.wave * BAL.wave.enemiesPerWave;
    state.enemiesRemaining = state.enemiesPerWave;
    state.spawnInterval = Math.max(BAL.wave.minSpawnInterval, BAL.wave.baseSpawnInterval - state.wave * BAL.wave.spawnIntervalDecay);
    state.spawnTimer = 0;
    state.bossActive = false;
    state.currentBossType = null;

    // Challenge wave roll
    const challengeMod = rollChallenge();
    state.challenge = { active: !!challengeMod, modifier: challengeMod, noShootTimer: 0, savedHp: 0 };
    if (challengeMod === 'noShoot') {
      state.challenge.noShootTimer = BAL.challenge.noShoot.duration;
    }
    if (challengeMod === 'fragile') {
      state.challenge.savedHp = player.hp;
      player.hp = BAL.challenge.fragile.playerHp;
    }
  }

  function enterShop() {
    state.phase = 'shop';
    shopItems = buildShopItems();
    state.shopSelection = 0;
  }

  // =========================================================================
  // PLAYER ACTIONS
  // =========================================================================

  function rollEnhancement(): EnhancementType | null {
    for (const slot of player.enhancementSlots) {
      if (slot && Math.random() < slot.chance) return slot.type;
    }
    return null;
  }

  function firePlayerBullet(now: number) {
    if (playerBulletCount() >= player.maxBullets) return;
    if (now - player.lastShot < player.shootCooldown * 1000) return;
    player.lastShot = now;
    state.bulletsFired++;

    const enhancement = rollEnhancement();

    if (enhancement) {
      const def = ENHANCEMENT_REGISTRY[enhancement];
      const slot = player.enhancementSlots.find(s => s?.type === enhancement)!;

      if (def.replacesDefault) {
        const spawned = def.onCreate?.(null as unknown as Bullet, slot);
        if (spawned) {
          for (const b of spawned) bullets.push(b);
        }
        return;
      }

      const bx = player.x;
      const by = player.y - player.h / 2;
      const b: Bullet = {
        x: bx, y: by, vx: 0, vy: -BAL.player.bulletSpeed, w: BAL.player.bulletW, h: BAL.player.bulletH,
        alive: true, owner: 'player', ...BULLET_DEFAULTS,
        enhancement,
      };
      def.onCreate?.(b, slot);
      bullets.push(b);
      return;
    }

    const bx = player.x;
    const by = player.y - player.h / 2;
    bullets.push({
      x: bx, y: by, vx: 0, vy: -BAL.player.bulletSpeed, w: BAL.player.bulletW, h: BAL.player.bulletH,
      alive: true, owner: 'player', ...BULLET_DEFAULTS,
    });
  }

  function checkGrazing() {
    for (const b of bullets) {
      if (!b.alive || b.owner !== 'enemy' || b.isMine || b.isLaser || b.isLaserWarning || b.grazed) continue;
      const d = dist(b.x, b.y, player.x, player.y);
      const collisionDist = (b.w + player.w) / 2;
      if (d < BAL.player.grazeDistance && d > collisionDist) {
        b.grazed = true;
        state.grazeScore += BAL.player.grazeScore;
        state.score += BAL.player.grazeScore;
        for (let i = 0; i < 3; i++) {
          particles.push({
            x: player.x + (Math.random() - 0.5) * 16,
            y: player.y + (Math.random() - 0.5) * 16,
            vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60,
            life: 0.3, maxLife: 0.3, char: '.', color: '#fff', size: 10,
          });
        }
      }
    }
  }

  // =========================================================================
  // DECOMPOSED UPDATE
  // =========================================================================

  function updateCrateOpening() {
    const hasEmptySlot = player.enhancementSlots.some(s => s === null);
    const rerollCost = BAL.loot.rerollBaseCost + Math.floor(state.wave / BAL.loot.rerollCostPerWaveDivisor);
    const canReroll = state.points >= rerollCost;
    const options: string[] = [];
    if (hasEmptySlot) options.push('TAKE');
    if (canReroll) options.push('REROLL');
    options.push('SKIP');
    const optionCount = options.length;
    if (keyJustPressed['w'] || keyJustPressed['arrowup']) {
      state.crateSelection = Math.max(0, state.crateSelection - 1);
    }
    if (keyJustPressed['s'] || keyJustPressed['arrowdown']) {
      state.crateSelection = Math.min(optionCount - 1, state.crateSelection + 1);
    }
    if (keyJustPressed['enter'] || keyJustPressed[' ']) {
      const chosen = options[state.crateSelection];
      if (chosen === 'TAKE') {
        const idx = player.enhancementSlots.indexOf(null);
        if (idx !== -1 && state.pendingCrate) {
          const def = ENHANCEMENT_REGISTRY[state.pendingCrate.enhancement];
          player.enhancementSlots[idx] = {
            type: state.pendingCrate.enhancement,
            level: 1,
            chance: def.baseChance,
          };
        }
        recalcSynergies();
        state.pendingCrate = null;
        enterShop();
      } else if (chosen === 'REROLL') {
        state.points -= rerollCost;
        if (state.pendingCrate) {
          const currentType = state.pendingCrate.enhancement;
          const otherTypes = ALL_ENHANCEMENTS.filter(t => t !== currentType);
          state.pendingCrate.enhancement = otherTypes[Math.floor(Math.random() * otherTypes.length)];
        }
        state.crateSelection = 0;
      } else {
        state.pendingCrate = null;
        enterShop();
      }
    }
  }

  function updateShop() {
    if (keyJustPressed['w'] || keyJustPressed['arrowup']) {
      state.shopSelection = Math.max(0, state.shopSelection - 1);
    }
    if (keyJustPressed['s'] || keyJustPressed['arrowdown']) {
      state.shopSelection = Math.min(shopItems.length, state.shopSelection + 1);
    }
    if (keyJustPressed['enter'] || keyJustPressed[' ']) {
      if (state.shopSelection === shopItems.length) {
        startWave();
      } else {
        const item = shopItems[state.shopSelection];
        if (item.available() && state.points >= item.cost) {
          state.points -= item.cost;
          item.apply();
          shopItems = buildShopItems();
        }
      }
    }
  }

  function updateWaveIntro(dt: number) {
    if (state.phase !== 'waveIntro') return;
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      state.phase = 'playing';
      if (isBossWave()) spawnBoss();
    }
  }

  function updatePlayerMovement(dt: number) {
    let dx = 0;
    let dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }
    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;
    player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));
    player.y = Math.max(player.h / 2, Math.min(H - player.h / 2, player.y));
  }

  function updatePlayerShooting(now: number) {
    if (state.challenge.active && state.challenge.modifier === 'noShoot' && state.challenge.noShootTimer > 0) return;
    if (keys[' ']) firePlayerBullet(now);
  }

  function updateSpawning(dt: number) {
    if (state.phase !== 'playing' || state.bossActive || state.enemiesSpawned >= state.enemiesPerWave) return;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.enemiesSpawned++;
      state.spawnTimer = state.spawnInterval;
    }
  }

  function updateBullets(dt: number) {
    for (const b of bullets) {
      if (!b.alive) continue;

      if (b.isLaserWarning) {
        b.warningTimer -= dt;
        if (b.warningTimer <= 0) {
          b.alive = false;
          fireLaserBeam(b.warningX, b.warningSourceY);
        }
        continue;
      }

      if (b.isLaser) {
        b.laserLife -= dt;
        if (b.laserLife <= 0) b.alive = false;
        continue;
      }

      if (b.isMine) {
        if (b.fuseTimer < 0) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.vx *= (1 - BAL.timing.mineDrag * dt);
          b.vy *= (1 - BAL.timing.mineDrag * dt);
          if (Math.abs(b.vx) < BAL.timing.mineStopThreshold && Math.abs(b.vy) < BAL.timing.mineStopThreshold) {
            b.vx = 0;
            b.vy = 0;
            b.fuseTimer = BAL.attacks.mine.fuseBase + Math.random() * BAL.attacks.mine.fuseRandom;
          }
          if (b.x < -20 || b.x > W + 20 || b.y > H + 20) b.alive = false;
        } else {
          b.fuseTimer -= dt;
          if (b.fuseTimer <= 0) {
            b.alive = false;
            spawnMineExplosion(b.x, b.y);
            if (
              performance.now() > player.invincibleUntil &&
              aabb(b.x, b.y, BAL.attacks.mine.blastRadius, BAL.attacks.mine.blastRadius, player.x, player.y, 0, 0)
            ) {
              player.hp--;
              player.invincibleUntil = performance.now() + BAL.player.invincibleMs;
              triggerShake(10, 0.4);
              if (player.hp <= 0) state.phase = 'gameOver';
            }
          }
        }
        continue;
      }

      // Enhancement-specific update (orbital, gravityWell, homing)
      if (b.enhancement && b.owner === 'player') {
        const def = ENHANCEMENT_REGISTRY[b.enhancement];
        if (def?.onUpdate) {
          def.onUpdate(b, dt);
          if (def.id === 'orbital' || def.id === 'gravityWell') continue;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20 || b.y > H + 20 || b.x < -20 || b.x > W + 20) b.alive = false;
    }
  }

  function updateEnemies(dt: number, now: number) {
    for (const e of enemies) {
      if (!e.alive) continue;
      e.time += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt * BAL.timing.hitFlashRate);
      if (e.gildedTimer > 0) e.gildedTimer -= dt;

      // Elite: regenerating heals over time
      if (e.isElite && e.eliteModifier === 'regenerating' && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + BAL.elite.regenerating.hpPerSecond * dt);
      }

      const typeDef = ENEMY_TYPE_REGISTRY[e.enemyType];

      if (e.isBoss && e.bossType) {
        const bossDef = BOSS_TYPE_REGISTRY[e.bossType];
        if (bossDef) {
          bossDef.onUpdate?.(e, dt);
          bossDef.move(e, dt);
          bossDef.attack(e, dt);
        }
      } else {
        if (typeDef?.move) {
          typeDef.move(e, dt);
        } else {
          moveByPattern(e, dt);
        }

        if (e.canShoot && e.y > 0 && e.y < H * 0.7) {
          e.shootTimer -= dt;
          if (e.shootTimer <= 0) {
            enemyShoot(e);
            e.shootTimer = e.shootInterval;
          }
        }

        if (e.y > H + 50) {
          e.alive = false;
          state.enemiesRemaining--;
        }
      }

      // Gravity well pull (applied after movement)
      const gravSlot = player.enhancementSlots.find(s => s?.type === 'gravityWell');
      const pullRadius = BAL.enhancements.gravityWell.basePullRadius + (gravSlot ? gravSlot.level * BAL.enhancements.gravityWell.pullRadiusPerLevel : 0);
      const basePull = BAL.enhancements.gravityWell.basePullForce + (gravSlot ? gravSlot.level * BAL.enhancements.gravityWell.pullForcePerLevel : 0);
      const pullForce = state.activeSynergies.has('pierceGravityWell') ? basePull * BAL.synergies.pierceGravityWell.pullMultiplier : basePull;
      let gdx = 0, gdy = 0;
      for (const b of bullets) {
        if (!b.alive || b.enhancement !== 'gravityWell' || b.owner !== 'player') continue;
        const d = dist(b.x, b.y, e.x, e.y);
        if (d < pullRadius && d > 10) {
          const strength = pullForce * (1 - d / pullRadius);
          gdx += ((b.x - e.x) / d) * strength;
          gdy += ((b.y - e.y) / d) * strength;
        }
      }
      const gLen = Math.sqrt(gdx * gdx + gdy * gdy);
      const maxPull = pullForce * BAL.enhancements.gravityWell.pullForceCap;
      if (gLen > maxPull) {
        gdx = (gdx / gLen) * maxPull;
        gdy = (gdy / gLen) * maxPull;
      }
      if (gLen > 0) {
        e.baseX += gdx * dt;
        e.x += gdx * dt;
        e.y += gdy * dt;
      }

      // Collision with player
      if (now > player.invincibleUntil && aabb(e.x, e.y, e.w, e.h, player.x, player.y, player.w, player.h)) {
        player.hp--;
        player.invincibleUntil = now + BAL.player.invincibleMs;
        triggerShake(10, 0.4);
        if (player.hp <= 0) state.phase = 'gameOver';
      }
    }
  }

  function canHitEnemy(e: Enemy): boolean {
    const typeDef = ENEMY_TYPE_REGISTRY[e.enemyType];
    if (typeDef?.canBeHit && !typeDef.canBeHit(e)) return false;
    if (e.isBoss && e.bossType) {
      const bossDef = BOSS_TYPE_REGISTRY[e.bossType];
      if (bossDef?.canBeHit && !bossDef.canBeHit(e)) return false;
    }
    return true;
  }

  function hitParagraphSegment(b: Bullet, e: Enemy): boolean {
    if (e.bossType !== 'paragraph') return false;
    const segs = e.bossData.segments as ParagraphSegment[];
    ctx.font = 'bold 16px monospace';
    let hitSeg: ParagraphSegment | null = null;
    let bestDist = Infinity;
    for (const seg of segs) {
      if (!seg.alive) continue;
      const sx = e.x + seg.relX;
      const sy = e.y + seg.relY;
      const sw = ctx.measureText(seg.word).width + 4;
      const sh = 20;
      if (aabb(b.x, b.y, b.w, b.h, sx, sy, sw, sh)) {
        const d = dist(b.x, b.y, sx, sy);
        if (d < bestDist) { bestDist = d; hitSeg = seg; }
      }
    }
    if (!hitSeg) return false;
    hitSeg.hp--;
    if (hitSeg.hp <= 0) {
      hitSeg.alive = false;
      spawnParticles(e.x + hitSeg.relX, e.y + hitSeg.relY, hitSeg.word);
    }
    damageEnemy(e);
    e.hitFlash = 1;
    if (e.hp <= 0) killEnemy(e);
    return true;
  }

  function updateCollisions(now: number) {
    // Enemy bullet vs player
    for (const b of bullets) {
      if (!b.alive || b.owner !== 'enemy') continue;
      if (b.isMine || b.isLaserWarning) continue;
      const by = b.isLaser ? b.y + b.h / 2 : b.y;
      if (now > player.invincibleUntil && aabb(b.x, by, b.w, b.h, player.x, player.y, player.w, player.h)) {
        if (!b.isLaser) b.alive = false;
        player.hp--;
        player.invincibleUntil = now + BAL.player.invincibleMs;
        triggerShake(10, 0.4);
        if (player.hp <= 0) state.phase = 'gameOver';
      }
    }

    checkGrazing();

    // Player bullet vs enemy
    for (const b of bullets) {
      if (!b.alive || b.owner !== 'player') continue;

      if (b.enhancement === 'gravityWell') {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (!canHitEnemy(e)) continue;
          if (aabb(b.x, b.y, b.w, b.h, e.x, e.y, e.w, e.h, 10)) {
            if (e.hitFlash <= 0) {
              if (e.bossType === 'paragraph') {
                hitParagraphSegment(b, e);
              } else {
                damageEnemy(e);
                e.hitFlash = 0.5;
                if (e.hp <= 0) killEnemy(e);
              }
            }
          }
        }
        continue;
      }

      for (const e of enemies) {
        if (!e.alive) continue;
        if (!canHitEnemy(e)) continue;
        if (aabb(b.x, b.y, b.w, b.h, e.x, e.y, e.w, e.h)) {
          if (b.pierceCount > 0 && e.hitFlash > 0) continue;

          state.bulletsHit++;

          if (e.bossType === 'paragraph') {
            if (hitParagraphSegment(b, e)) {
              if (b.enhancement) {
                const def = ENHANCEMENT_REGISTRY[b.enhancement];
                def?.onHit?.(b, e);
              }
              if (b.pierceCount > 0) {
                b.pierceCount--;
              } else {
                b.alive = false;
                break;
              }
            }
          } else {
            damageEnemy(e);
            e.hitFlash = 1;

            if (b.enhancement) {
              const def = ENHANCEMENT_REGISTRY[b.enhancement];
              def?.onHit?.(b, e);
            }

            if (e.hp <= 0) killEnemy(e);

            if (b.pierceCount > 0) {
              b.pierceCount--;
            } else {
              b.alive = false;
              break;
            }
          }
        }
      }
    }
  }

  function updateDecay(dt: number, rawDt: number) {
    if (state.shakeTimer > 0) {
      state.shakeTimer -= rawDt;
      state.shakeIntensity *= 0.9;
      if (state.shakeTimer <= 0) {
        state.shakeIntensity = 0;
        state.shakeTimer = 0;
      }
    }
    if (state.timeScaleTimer > 0) {
      state.timeScaleTimer -= rawDt;
      if (state.timeScaleTimer <= 0) {
        state.timeScale = 1;
        state.timeScaleTimer = 0;
      }
    }
    if (state.comboTimer > 0) {
      state.comboTimer -= rawDt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.comboTimer = 0;
      }
    }
    // Challenge: noShoot countdown
    if (state.challenge.active && state.challenge.modifier === 'noShoot' && state.challenge.noShootTimer > 0) {
      state.challenge.noShootTimer -= rawDt;
    }
    // Synergy notification decay
    for (const n of state.synergyNotifications) {
      n.timer -= rawDt;
    }
    state.synergyNotifications = state.synergyNotifications.filter(n => n.timer > 0);
  }

  function updateEffects(dt: number) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vy += 100 * dt;
    }
    for (const bolt of lightningBolts) {
      bolt.life -= dt;
    }
    for (const c of lootCrates) {
      if (!c.alive) continue;
      c.y += c.vy * dt;
      if (c.y > H + 20) { c.alive = false; continue; }
      if (aabb(c.x, c.y, 0, 0, player.x, player.y, BAL.loot.cratePickupRadius, BAL.loot.cratePickupRadius)) {
        c.alive = false;
        const allFull = player.enhancementSlots.every(s => s !== null);
        if (allFull) {
          const bonus = BAL.loot.fullSlotsBonus;
          state.points += bonus;
          state.score += bonus * BAL.timing.killScorePerChar;
          particles.push({
            x: c.x, y: c.y, vx: 0, vy: -60,
            life: 1, maxLife: 1, char: `+${bonus}`, color: COLORS.yellow, size: 16,
          });
        } else {
          state.pendingCrate = c;
        }
      }
    }
  }

  function cleanupDead() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (!bullets[i].alive) bullets.splice(i, 1);
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (!enemies[i].alive) enemies.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
    for (let i = lootCrates.length - 1; i >= 0; i--) {
      if (!lootCrates[i].alive) lootCrates.splice(i, 1);
    }
    for (let i = lightningBolts.length - 1; i >= 0; i--) {
      if (lightningBolts[i].life <= 0) lightningBolts.splice(i, 1);
    }
  }

  function checkWaveComplete() {
    const enemyBulletsLeft = bullets.some((b) => b.owner === 'enemy');
    if (
      state.phase === 'playing' &&
      enemies.length === 0 &&
      !enemyBulletsLeft &&
      (state.enemiesSpawned >= state.enemiesPerWave || isBossWave())
    ) {
      // Restore HP after fragile challenge
      if (state.challenge.active && state.challenge.modifier === 'fragile' && player.hp > 0) {
        player.hp = state.challenge.savedHp;
      }
      state.challenge = { active: false, modifier: null, noShootTimer: 0, savedHp: 0 };

      state.wave++;
      if (state.pendingCrate) {
        state.crateSelection = 0;
        state.phase = 'crateOpening';
      } else {
        enterShop();
      }
    }
  }

  // --- Main update dispatcher ---

  function update(dt: number, rawDt: number, now: number) {
    if (state.phase === 'paused') { clearKeys(); return; }
    if (state.phase === 'crateOpening') { updateCrateOpening(); clearKeys(); return; }
    if (state.phase === 'shop') { updateShop(); clearKeys(); return; }
    updateWaveIntro(dt);
    if (state.phase === 'gameOver') { updateDecay(dt, rawDt); clearKeys(); return; }

    updatePlayerMovement(dt);
    updatePlayerShooting(now);
    updateSpawning(dt);
    updateBullets(dt);
    updateEnemies(dt, now);
    updateCollisions(now);
    updateDecay(dt, rawDt);
    updateEffects(dt);
    cleanupDead();
    checkWaveComplete();
    clearKeys();
  }

  // =========================================================================
  // DRAWING
  // =========================================================================

  function drawPlayer(now: number) {
    const invincible = now < player.invincibleUntil;
    const blink = invincible && Math.floor(now / 80) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath();
    ctx.moveTo(0, -player.h / 2);
    ctx.lineTo(-player.w / 2, player.h / 2);
    ctx.lineTo(player.w / 2, player.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(0, -player.h / 2 + 4);
    ctx.lineTo(-player.w / 4, player.h / 4);
    ctx.lineTo(player.w / 4, player.h / 4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawBullets(now: number) {
    for (const b of bullets) {
      ctx.save();

      if (b.owner === 'player') {
        if (b.enhancement) {
          const def = ENHANCEMENT_REGISTRY[b.enhancement];
          const color = def.color;
          ctx.shadowColor = color;
          ctx.shadowBlur = b.enhancement === 'golden' ? 16 : 10;
          ctx.fillStyle = color;

          if (def.onRender) {
            def.onRender(b, ctx, now);
          } else {
            ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
          }
        } else {
          ctx.shadowColor = COLORS.cyan;
          ctx.shadowBlur = 8;
          ctx.fillStyle = COLORS.cyan;
          ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
        }
      } else if (b.isLaserWarning) {
        const blink = Math.sin(now * 0.02) > 0;
        if (blink) {
          ctx.strokeStyle = `rgba(247,118,142,0.5)`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(b.warningX, b.warningSourceY);
          ctx.lineTo(b.warningX, H);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = `rgba(247,118,142,${blink ? 0.6 : 0.2})`;
        ctx.fillRect(b.warningX - 6, b.warningSourceY - 1, 12, 2);
        ctx.fillRect(b.warningX - 1, b.warningSourceY - 6, 2, 12);
      } else if (b.isLaser) {
        ctx.shadowColor = COLORS.red;
        ctx.shadowBlur = 20;
        ctx.fillStyle = `rgba(247,118,142,${0.4 + Math.random() * 0.3})`;
        ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.2})`;
        ctx.fillRect(b.x - 2, b.y, 4, b.h);
      } else if (b.isMine) {
        ctx.translate(b.x, b.y);
        if (b.fuseTimer < 0) {
          ctx.shadowColor = COLORS.yellow;
          ctx.shadowBlur = 10;
          ctx.fillStyle = COLORS.yellow;
          const spin = performance.now() * 0.008;
          ctx.rotate(spin);
          const s = b.w / 2;
          ctx.fillRect(-s, -s, s * 2, s * 2);
        } else {
          const pulse = 1 + Math.sin(b.fuseTimer * 6) * 0.2;
          ctx.shadowColor = b.fuseTimer < 1 ? COLORS.red : COLORS.yellow;
          ctx.shadowBlur = b.fuseTimer < 1 ? 16 : 8;
          ctx.fillStyle = b.fuseTimer < 1 ? COLORS.red : COLORS.yellow;
          ctx.rotate(Math.PI / 4);
          const s = (b.w / 2) * pulse;
          ctx.fillRect(-s, -s, s * 2, s * 2);
        }
      } else {
        ctx.shadowColor = COLORS.red;
        ctx.shadowBlur = 8;
        ctx.fillStyle = COLORS.red;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.w / 2 + 1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function drawEnemies() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const e of enemies) {
      const flash = e.hitFlash > 0;
      ctx.save();

      const gilded = e.gildedTimer > 0;

      if (e.isBoss && e.bossType) {
        const bossDef = BOSS_TYPE_REGISTRY[e.bossType];
        if (bossDef) {
          bossDef.render(e, ctx);
        }
        ctx.restore();
        continue;
      }

      // Cloaker alpha modulation
      if (e.enemyType === 'cloaker') {
        const sinVal = Math.sin(e.cloakPhase);
        if (sinVal <= -0.3) {
          ctx.globalAlpha = 0.08;
        } else if (sinVal < 0.2) {
          ctx.globalAlpha = 0.3 + (sinVal + 0.3) / 0.5 * 0.7;
        } else {
          ctx.globalAlpha = 1;
        }
      }

      ctx.font = e.enemyType === 'swarm' ? '10px monospace' : '16px monospace';

      let glowColor = COLORS.purple;
      let bgColor = `rgba(187,154,247,0.3)`;

      if (e.enemyType === 'splitter' && !e.isSplitterChild) {
        glowColor = COLORS.green;
        bgColor = `rgba(158,206,106,0.3)`;
      } else if (e.enemyType === 'swarm') {
        glowColor = COLORS.green;
        bgColor = `rgba(158,206,106,0.25)`;
      } else if (e.canShoot) {
        const atkDef = ATTACK_REGISTRY[e.attackType];
        if (atkDef) {
          glowColor = atkDef.glowColor;
          bgColor = atkDef.bgColor;
        }
      }

      if (gilded) {
        glowColor = COLORS.yellow;
        bgColor = `rgba(224,175,104,0.35)`;
      }

      if (e.isElite && !gilded) {
        glowColor = COLORS.orange;
        bgColor = `rgba(255,158,100,0.3)`;
      }

      if (flash) {
        ctx.shadowColor = COLORS.red;
        ctx.shadowBlur = 16;
      } else {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = e.isElite ? 24 : (gilded ? 20 : 6);
      }
      ctx.fillStyle = flash ? `rgba(247,118,142,0.5)` : bgColor;
      ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      ctx.strokeStyle = flash ? COLORS.red : glowColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      ctx.fillStyle = flash ? COLORS.red : COLORS.fgBright;
      ctx.fillText(e.word, e.x, e.y);

      if (e.maxHp > 1) {
        const barW = e.w - 4;
        const barH = 3;
        const barY = e.y - e.h / 2 - 6;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(e.x - barW / 2, barY, barW, barH);
        ctx.fillStyle = COLORS.green;
        ctx.fillRect(e.x - barW / 2, barY, barW * (e.hp / e.maxHp), barH);
      }

      if (e.canShoot) {
        ctx.font = '9px monospace';
        ctx.fillStyle = glowColor;
        const atkDef = ATTACK_REGISTRY[e.attackType];
        ctx.fillText(atkDef?.label ?? '', e.x, e.y + e.h / 2 + 8);
      }

      if (e.isElite && e.eliteModifier) {
        const modLetters: Record<EliteModifier, string> = { regenerating: 'R', bulletSponge: 'S', vengeful: 'V' };
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = COLORS.orange;
        ctx.fillText(modLetters[e.eliteModifier], e.x + e.w / 2 - 4, e.y - e.h / 2 - 2);
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  function drawLightning() {
    for (const bolt of lightningBolts) {
      const t = 1 - bolt.life / bolt.maxLife;
      const alpha = 1 - t * t * t;
      const segs = bolt.segments;
      ctx.save();
      ctx.strokeStyle = `rgba(125,207,255,${alpha * 0.5})`;
      ctx.lineWidth = 8;
      ctx.shadowColor = '#7dcfff';
      ctx.shadowBlur = 30 * alpha;
      ctx.beginPath();
      ctx.moveTo(segs[0].x, segs[0].y);
      for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i].x, segs[i].y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.9})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 16 * alpha;
      ctx.beginPath();
      ctx.moveTo(segs[0].x, segs[0].y);
      for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i].x, segs[i].y);
      ctx.stroke();
      if (t < 0.3) {
        const flashAlpha = (1 - t / 0.3);
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.6})`;
        ctx.shadowColor = '#7dcfff';
        ctx.shadowBlur = 40 * flashAlpha;
        ctx.beginPath();
        ctx.arc(segs[segs.length - 1].x, segs[segs.length - 1].y, 10 * flashAlpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawParticles() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.font = `${p.size}px monospace`;
      ctx.fillText(p.char, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    const hudPad = 20;
    const barW = 120;
    const barH = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(hudPad, hudPad, barW, barH);
    const hpRatio = player.hp / player.maxHp;
    ctx.fillStyle = hpRatio > 0.5 ? COLORS.green : hpRatio > 0.25 ? COLORS.orange : COLORS.red;
    ctx.fillRect(hudPad, hudPad, barW * hpRatio, barH);
    ctx.strokeStyle = COLORS.fgMuted;
    ctx.lineWidth = 1;
    ctx.strokeRect(hudPad, hudPad, barW, barH);
    ctx.fillStyle = COLORS.fgBright;
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`HP ${player.hp}/${player.maxHp}`, hudPad, hudPad + barH + 4);

    ctx.fillStyle = COLORS.yellow;
    ctx.fillText(`PTS: ${state.points}`, hudPad, hudPad + barH + 20);

    ctx.font = '11px monospace';
    let slotX = hudPad;
    for (let i = 0; i < 3; i++) {
      const slot = player.enhancementSlots[i];
      if (slot) {
        ctx.fillStyle = enhColor(slot.type);
        ctx.fillText(`[${enhAbbr(slot.type)}${slot.level}]`, slotX, hudPad + barH + 36);
      } else {
        ctx.fillStyle = COLORS.fgMuted;
        ctx.fillText('[ ]', slotX, hudPad + barH + 36);
      }
      slotX += 50;
    }

    ctx.textAlign = 'right';
    ctx.font = '16px monospace';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText(`${state.score}`, W - hudPad, hudPad);

    ctx.font = '12px monospace';
    ctx.fillStyle = COLORS.fgMuted;
    ctx.fillText(`Wave ${state.wave}`, W - hudPad, hudPad + 20);
  }

  function drawShop() {
    ctx.fillStyle = 'rgba(26,27,38,0.92)';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const startY = H * 0.12;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 20;
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText('UPGRADE SHOP', cx, startY);
    ctx.shadowBlur = 0;

    ctx.font = '16px monospace';
    ctx.fillStyle = COLORS.yellow;
    ctx.fillText(`Points: ${state.points}`, cx, startY + 40);

    ctx.font = '13px monospace';
    const slotLabels: string[] = [];
    for (let i = 0; i < 3; i++) {
      const slot = player.enhancementSlots[i];
      if (slot) {
        slotLabels.push(`${enhName(slot.type)} Lv${slot.level}`);
      } else {
        slotLabels.push('[ empty ]');
      }
    }
    let slotDrawX = cx - 150;
    for (let i = 0; i < 3; i++) {
      const slot = player.enhancementSlots[i];
      ctx.fillStyle = slot ? enhColor(slot.type) : COLORS.fgMuted;
      ctx.textAlign = 'center';
      ctx.fillText(slotLabels[i], slotDrawX + i * 150, startY + 65);
    }

    const itemStartY = startY + 90;
    const itemH = 56;
    const itemW = 380;

    for (let i = 0; i < shopItems.length; i++) {
      const item = shopItems[i];
      const y = itemStartY + i * itemH;
      const selected = i === state.shopSelection;
      const canBuy = item.available() && state.points >= item.cost;

      ctx.fillStyle = selected ? 'rgba(125,207,255,0.1)' : 'rgba(36,40,59,0.6)';
      ctx.fillRect(cx - itemW / 2, y, itemW, itemH - 6);
      ctx.strokeStyle = selected ? COLORS.cyan : COLORS.fgMuted;
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(cx - itemW / 2, y, itemW, itemH - 6);

      ctx.textAlign = 'left';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = canBuy ? COLORS.fgBright : COLORS.fgMuted;
      ctx.fillText(item.name, cx - itemW / 2 + 12, y + 18);

      ctx.font = '12px monospace';
      ctx.fillStyle = COLORS.fgMuted;
      ctx.fillText(item.desc, cx - itemW / 2 + 12, y + 36);

      ctx.textAlign = 'right';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = canBuy ? COLORS.yellow : COLORS.red;
      ctx.fillText(`${item.cost} pts`, cx + itemW / 2 - 12, y + 18);

      if (!item.available()) {
        ctx.fillStyle = COLORS.fgMuted;
        ctx.font = '11px monospace';
        ctx.fillText('MAX', cx + itemW / 2 - 12, y + 36);
      }
    }

    const contY = itemStartY + shopItems.length * itemH;
    const selected = state.shopSelection === shopItems.length;
    ctx.fillStyle = selected ? 'rgba(158,206,106,0.15)' : 'rgba(36,40,59,0.6)';
    ctx.fillRect(cx - itemW / 2, contY, itemW, itemH - 6);
    ctx.strokeStyle = selected ? COLORS.green : COLORS.fgMuted;
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(cx - itemW / 2, contY, itemW, itemH - 6);
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = selected ? COLORS.green : COLORS.fgMuted;
    let nextLabel = `>> WAVE ${state.wave} >>`;
    if (isBossWave()) {
      const bt = pickBossType();
      const bd = BOSS_TYPE_REGISTRY[bt];
      nextLabel = bd ? `>> ${bd.name} - WAVE ${state.wave} >>` : `>> BOSS WAVE ${state.wave} >>`;
    }
    ctx.fillText(nextLabel, cx, contY + 22);

    ctx.font = '12px monospace';
    ctx.fillStyle = COLORS.fgMuted;
    ctx.textAlign = 'center';
    ctx.fillText('W/S to select  |  ENTER/SPACE to buy', cx, contY + itemH + 16);
  }

  function waveIntroWarning(): string | null {
    if (isBossWave()) {
      const bossType = pickBossType();
      const def = BOSS_TYPE_REGISTRY[bossType];
      return def ? def.introWarning : 'PREPARE YOURSELF';
    }
    if (state.challenge.active && state.challenge.modifier) {
      const cm = CHALLENGE_MODIFIERS.find(c => c.id === state.challenge.modifier);
      if (cm) return `CHALLENGE: ${cm.label}`;
    }
    const w = state.wave;
    if (w === 3) return 'ENEMIES ARE SHOOTING BACK!';
    for (const def of Object.values(ENEMY_TYPE_REGISTRY)) {
      if (def.unlockWave === w && def.introWarning) return def.introWarning;
    }
    for (const def of Object.values(ATTACK_REGISTRY)) {
      if (def.unlockWave === w && def.introWarning) return def.introWarning;
    }
    return null;
  }

  function drawWaveIntro() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const isBoss = isBossWave();
    ctx.shadowColor = isBoss ? COLORS.red : COLORS.cyan;
    ctx.shadowBlur = isBoss ? 30 : 20;
    ctx.font = `bold ${isBoss ? 40 : 32}px monospace`;
    ctx.fillStyle = isBoss ? COLORS.red : COLORS.cyan;
    if (isBoss) {
      const bossType = pickBossType();
      const bossDef = BOSS_TYPE_REGISTRY[bossType];
      ctx.fillText(bossDef ? `${bossDef.name} - WAVE ${state.wave}` : `BOSS - WAVE ${state.wave}`, W / 2, H / 2 - 40);
    } else {
      ctx.fillText(`WAVE ${state.wave}`, W / 2, H / 2 - 40);
    }
    ctx.shadowBlur = 0;

    const warning = waveIntroWarning();
    if (warning) {
      ctx.font = '14px monospace';
      ctx.fillStyle = COLORS.orange;
      ctx.fillText(warning, W / 2, H / 2);
    }

    ctx.font = '14px monospace';
    ctx.fillStyle = COLORS.fgMuted;
    ctx.fillText('WASD to move  /  SPACE to shoot', W / 2, H / 2 + 30);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(26,27,38,0.8)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 30;
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = COLORS.red;
    ctx.fillText('GAME OVER', W / 2, H / 2 - 100);
    ctx.shadowBlur = 0;

    const elapsed = Math.floor((performance.now() - state.gameStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const accuracy = state.bulletsFired > 0 ? Math.round((state.bulletsHit / state.bulletsFired) * 100) : 0;

    ctx.font = '15px monospace';
    const stats = [
      `Score: ${state.score}`,
      `Wave: ${state.wave}`,
      `Kills: ${state.totalKills}  |  Accuracy: ${accuracy}%`,
      `Best Combo: ${state.bestCombo}x  |  Graze: ${state.grazeScore}`,
      `Time: ${mins}:${secs.toString().padStart(2, '0')}`,
    ];
    for (let i = 0; i < stats.length; i++) {
      ctx.fillStyle = i === 0 ? COLORS.cyan : COLORS.fg;
      ctx.fillText(stats[i], W / 2, H / 2 - 40 + i * 26);
    }

    ctx.fillStyle = COLORS.fgBright;
    ctx.font = '16px monospace';
    ctx.fillText('[ ENTER to restart ]', W / 2, H / 2 + 100);
  }

  function drawLootCrates(now: number) {
    for (const c of lootCrates) {
      if (!c.alive) continue;
      ctx.save();
      const pulse = 1 + Math.sin(now * 0.005) * 0.15;
      const size = 18 * pulse;
      ctx.translate(c.x, c.y);
      ctx.shadowColor = COLORS.yellow;
      ctx.shadowBlur = 14;
      ctx.fillStyle = COLORS.yellow;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 0);
      ctx.restore();
    }
  }

  function drawCrateOpening() {
    ctx.fillStyle = 'rgba(26,27,38,0.95)';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const startY = H * 0.2;
    const crate = state.pendingCrate;
    if (!crate) return;

    const enhType = crate.enhancement;
    const color = enhColor(enhType);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = COLORS.yellow;
    ctx.shadowBlur = 20;
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = COLORS.yellow;
    ctx.fillText('LOOT CRATE!', cx, startY);
    ctx.shadowBlur = 0;

    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = color;
    ctx.fillText(enhName(enhType).toUpperCase(), cx, startY + 60);
    ctx.shadowBlur = 0;

    ctx.font = '14px monospace';
    ctx.fillStyle = COLORS.fg;
    ctx.fillText(enhDesc(enhType), cx, startY + 95);

    ctx.font = '14px monospace';
    ctx.fillStyle = COLORS.fgMuted;
    ctx.fillText('Your Enhancement Slots:', cx, startY + 140);
    for (let i = 0; i < 3; i++) {
      const slot = player.enhancementSlots[i];
      const sy = startY + 165 + i * 28;
      if (slot) {
        ctx.fillStyle = enhColor(slot.type);
        ctx.fillText(`[${i + 1}] ${enhName(slot.type)} Lv${slot.level}`, cx, sy);
      } else {
        ctx.fillStyle = COLORS.fgMuted;
        ctx.fillText(`[${i + 1}] -- empty --`, cx, sy);
      }
    }

    const hasEmpty = player.enhancementSlots.some(s => s === null);
    const rerollCost = BAL.loot.rerollBaseCost + Math.floor(state.wave / BAL.loot.rerollCostPerWaveDivisor);
    const canReroll = state.points >= rerollCost;
    const options: string[] = [];
    if (hasEmpty) options.push('TAKE');
    if (canReroll) options.push('REROLL');
    options.push('SKIP');
    const optY = startY + 270;

    for (let i = 0; i < options.length; i++) {
      const sel = i === state.crateSelection;
      const y = optY + i * 40;
      ctx.fillStyle = sel ? 'rgba(125,207,255,0.15)' : 'rgba(36,40,59,0.6)';
      ctx.fillRect(cx - 100, y - 16, 200, 32);
      ctx.strokeStyle = sel ? COLORS.cyan : COLORS.fgMuted;
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(cx - 100, y - 16, 200, 32);
      ctx.fillStyle = sel ? COLORS.fgBright : COLORS.fgMuted;
      ctx.font = 'bold 16px monospace';
      if (options[i] === 'REROLL') {
        ctx.fillText(`REROLL (${rerollCost} pts)`, cx, y);
      } else {
        ctx.fillText(options[i], cx, y);
      }
    }

    ctx.font = '12px monospace';
    ctx.fillStyle = COLORS.fgMuted;
    ctx.fillText('W/S to select  |  ENTER/SPACE to confirm', cx, optY + options.length * 40 + 20);
  }

  function drawComboEffects() {
    if (state.combo < 5) return;
    ctx.save();
    let color: string;
    let alpha: number;
    if (state.combo >= 20) {
      color = COLORS.orange;
      alpha = 0.25;
    } else if (state.combo >= 10) {
      color = COLORS.purple;
      alpha = 0.18;
    } else {
      color = COLORS.cyan;
      alpha = 0.12;
    }
    const gradient = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.min(W, H) * 0.7);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, color);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawComboHUD() {
    if (state.combo < 3) return;
    ctx.save();
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.1;
    const size = Math.floor(18 * pulse);
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let color = COLORS.cyan;
    if (state.combo >= 20) color = COLORS.orange;
    else if (state.combo >= 10) color = COLORS.purple;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    const cm = comboMultiplier();
    const label = cm > 1 ? `${state.combo}x COMBO (${cm.toFixed(1)}x)` : `${state.combo}x COMBO`;
    ctx.fillText(label, W / 2, 20);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawChallengeHUD() {
    if (!state.challenge.active || !state.challenge.modifier) return;
    ctx.save();
    // noShoot countdown
    if (state.challenge.modifier === 'noShoot' && state.challenge.noShootTimer > 0) {
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.red;
      ctx.shadowColor = COLORS.red;
      ctx.shadowBlur = 15;
      ctx.fillText(`NO SHOOT: ${Math.ceil(state.challenge.noShootTimer)}s`, W / 2, 50);
      ctx.shadowBlur = 0;
    }
    // Challenge active indicator
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.orange;
    ctx.fillText('CHALLENGE', W - 10, 10);
    ctx.restore();
  }

  function drawDarknessOverlay() {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    const r = BAL.challenge.darkness.lightRadius;
    const gradient = ctx.createRadialGradient(player.x, player.y, r * 0.3, player.x, player.y, r);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  function drawSynergyNotifications() {
    if (state.synergyNotifications.length === 0) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < state.synergyNotifications.length; i++) {
      const n = state.synergyNotifications[i];
      const syn = SYNERGY_DEFS.find(s => s.id === n.id);
      if (!syn) continue;
      const alpha = Math.min(1, n.timer);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 16px monospace';
      ctx.shadowColor = syn.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = syn.color;
      const y = H / 2 - 80 - i * 30;
      ctx.fillText(`SYNERGY: ${syn.name}`, W / 2, y);
      ctx.font = '11px monospace';
      ctx.fillStyle = COLORS.fgBright;
      ctx.shadowBlur = 0;
      ctx.fillText(syn.desc, W / 2, y + 18);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPauseMenu(now: number) {
    ctx.fillStyle = 'rgba(26,27,38,0.85)';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 30;
    ctx.font = 'bold 40px monospace';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText('PAUSED', cx, H * 0.2);
    ctx.shadowBlur = 0;

    const elapsed = Math.floor((now - state.gameStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const accuracy = state.bulletsFired > 0 ? Math.round((state.bulletsHit / state.bulletsFired) * 100) : 0;

    const stats = [
      ['Wave', `${state.wave}`],
      ['Score', `${state.score}`],
      ['Kills', `${state.totalKills}`],
      ['Accuracy', `${accuracy}%`],
      ['Best Combo', `${state.bestCombo}x`],
      ['Graze Score', `${state.grazeScore}`],
      ['Time', `${mins}:${secs.toString().padStart(2, '0')}`],
    ];

    const statStartY = H * 0.35;
    ctx.font = '15px monospace';
    for (let i = 0; i < stats.length; i++) {
      const y = statStartY + i * 30;
      ctx.fillStyle = COLORS.fgMuted;
      ctx.textAlign = 'right';
      ctx.fillText(stats[i][0], cx - 10, y);
      ctx.fillStyle = COLORS.fgBright;
      ctx.textAlign = 'left';
      ctx.fillText(stats[i][1], cx + 10, y);
    }

    ctx.textAlign = 'center';
    ctx.font = '13px monospace';
    ctx.fillStyle = COLORS.fgMuted;
    const enhY = statStartY + stats.length * 30 + 20;
    ctx.fillText('Enhancements:', cx, enhY);
    for (let i = 0; i < 3; i++) {
      const slot = player.enhancementSlots[i];
      const sy = enhY + 25 + i * 22;
      if (slot) {
        ctx.fillStyle = enhColor(slot.type);
        ctx.fillText(`${enhName(slot.type)} Lv${slot.level}`, cx, sy);
      } else {
        ctx.fillStyle = COLORS.fgMuted;
        ctx.fillText('-- empty --', cx, sy);
      }
    }

    // Active synergies
    if (state.activeSynergies.size > 0) {
      let synY = enhY + 25 + 3 * 22 + 10;
      ctx.fillStyle = COLORS.fgMuted;
      ctx.fillText('Synergies:', cx, synY);
      for (const synId of state.activeSynergies) {
        synY += 22;
        const syn = SYNERGY_DEFS.find(s => s.id === synId);
        if (syn) {
          ctx.fillStyle = syn.color;
          ctx.fillText(syn.name, cx, synY);
        }
      }
    }

    ctx.font = '14px monospace';
    ctx.fillStyle = COLORS.fgMuted;
    ctx.textAlign = 'center';
    ctx.fillText('ESC to resume', cx, H * 0.85);
  }

  function draw(now: number) {
    ctx.clearRect(0, 0, W, H);

    if (state.phase === 'paused') {
      drawPauseMenu(now);
      return;
    }

    if (state.phase === 'shop') {
      drawShop();
      return;
    }

    if (state.phase === 'crateOpening') {
      drawCrateOpening();
      return;
    }

    const shaking = state.shakeIntensity > 0.5 && state.shakeTimer > 0;
    if (shaking) {
      ctx.save();
      const sx = (Math.random() - 0.5) * state.shakeIntensity * 2;
      const sy = (Math.random() - 0.5) * state.shakeIntensity * 2;
      ctx.translate(sx, sy);
    }

    drawPlayer(now);
    drawBullets(now);
    drawEnemies();
    drawLootCrates(now);
    drawLightning();
    drawParticles();
    drawComboEffects();
    drawHUD();
    drawComboHUD();
    drawChallengeHUD();
    drawSynergyNotifications();

    // Challenge: darkness overlay
    if (state.challenge.active && state.challenge.modifier === 'darkness' && state.phase === 'playing') {
      drawDarknessOverlay();
    }

    if (state.phase === 'waveIntro') drawWaveIntro();
    if (state.phase === 'gameOver') drawGameOver();

    if (shaking) {
      ctx.restore();
    }
  }

  // =========================================================================
  // EVENT HANDLERS & GAME LOOP
  // =========================================================================

  let lastTime = performance.now();
  let running = true;
  let pausedFrom: Phase = 'playing';

  function cleanup() {
    running = false;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.remove();
    if (pageContent) pageContent.style.visibility = '';
  }

  function handleRestart(e: KeyboardEvent) {
    if (state.phase === 'gameOver' && e.key === 'Enter') {
      cleanup();
      window.removeEventListener('keydown', handleRestart);
      location.reload();
    }
  }
  window.addEventListener('keydown', handleRestart);

  function handleEsc(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (state.phase === 'playing' || state.phase === 'waveIntro') {
        pausedFrom = state.phase;
        state.phase = 'paused';
      } else if (state.phase === 'paused') {
        state.phase = pausedFrom;
      } else {
        cleanup();
        window.removeEventListener('keydown', handleEsc);
        window.removeEventListener('keydown', handleRestart);
      }
    }
  }
  window.addEventListener('keydown', handleEsc);

  startWave();

  function loop() {
    if (!running) return;
    const now = performance.now();
    const rawDt = Math.min((now - lastTime) / 1000, 0.05);
    const dt = rawDt * state.timeScale;
    lastTime = now;
    update(dt, rawDt, now);
    draw(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
