// Bullet Hell Mini Game
// Words from the page become enemy waves in a top-down shooter

type BulletOwner = 'player' | 'enemy';
type EnemyPattern = 'straight' | 'sine' | 'zigzag' | 'erratic';
type EnemyAttack = 'aimed' | 'radial' | 'laser' | 'mine' | 'spiral' | 'wall';
type EnemyType = 'normal' | 'splitter' | 'swarm' | 'cloaker';
type Phase = 'playing' | 'waveIntro' | 'shop' | 'crateOpening' | 'gameOver' | 'paused';
type EnhancementType = 'homing' | 'exploding' | 'radial' | 'orbital' | 'chainLightning' | 'golden' | 'gravityWell' | 'lifeDrain';

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
  bossAttackIndex: number;
  bossAttackTimer: number;
  gildedTimer: number;
  enemyType: EnemyType;
  isSplitterChild: boolean;
  cloakPhase: number;
  cloakVisible: boolean;
  spiralAngle: number;
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
    w: 20,
    h: 24,
    hp: 5,
    maxHp: 5,
    speed: 320,
    invincibleUntil: 0,
    shootCooldown: 0.12,
    lastShot: 0,
    maxBullets: 3,
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
    enemiesPerWave: 6,
    spawnTimer: 0,
    spawnInterval: 1.2,
    wordPool: words,
    wordIndex: 0,
    shopSelection: 0,
    bossActive: false,
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
  };

  // --- Shared helpers ---

  function enemiesShootThisWave(): boolean {
    return state.wave >= 3;
  }

  function enemyHpBonus(): number {
    return Math.floor(state.wave / 2);
  }

  function isBossWave(): boolean {
    return state.wave % 10 === 0;
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
    const waveInflation = Math.floor(state.wave / 3);
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
    const speedBonus = state.wave * 4;
    if (len <= 4) return { hp: 1 + bonus, speed: 100 + speedBonus + Math.random() * 40 };
    if (len <= 8) return { hp: 2 + bonus, speed: 70 + speedBonus + Math.random() * 30 };
    return { hp: 3 + bonus, speed: 50 + speedBonus + Math.random() * 20 };
  }

  const ENEMY_DEFAULTS = {
    isBoss: false,
    bossAttackIndex: 0,
    bossAttackTimer: 0,
    gildedTimer: 0,
    enemyType: 'normal' as EnemyType,
    isSplitterChild: false,
    cloakPhase: 0,
    cloakVisible: true,
    spiralAngle: 0,
  };

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
    baseChance: 0.15,
    chancePerLevel: 0.10,
    onCreate: (b) => {
      b.vy = -500;
      b.w = 5;
      b.h = 10;
      b.target = findNearestEnemy(b.x, b.y);
    },
    onUpdate: (b, dt) => {
      if (!b.target || !b.target.alive) b.target = findNearestEnemy(b.x, b.y);
      if (b.target) {
        const tdx = b.target.x - b.x;
        const tdy = b.target.y - b.y;
        const d = dist(b.x, b.y, b.target.x, b.target.y);
        if (d > 0) {
          const turnRate = 8 * dt;
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 500;
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
    desc: 'Bullets explode on hit (80px AoE)',
    color: COLORS.orange,
    baseChance: 0.15,
    chancePerLevel: 0.10,
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
    baseChance: 0.15,
    chancePerLevel: 0.10,
    replacesDefault: true,
    onCreate: (_b, slot) => {
      const bx = player.x;
      const by = player.y - player.h / 2;
      const sideCount = 2 + slot.level;
      const result: Bullet[] = [
        {
          x: bx, y: by, vx: 0, vy: -600, w: 4, h: 12,
          alive: true, owner: 'player', ...BULLET_DEFAULTS,
        },
      ];
      const spread = Math.PI / 4;
      for (let i = 0; i < sideCount; i++) {
        const angle = -Math.PI / 2 + spread * ((i + 1) / (sideCount + 1) - 0.5) * 2;
        const speed = 550;
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
    baseChance: 0.15,
    chancePerLevel: 0.10,
    replacesDefault: true,
    onCreate: (_b, slot) => {
      const bx = player.x;
      const by = player.y - player.h / 2;
      const maxRot = 2 + slot.level * 0.5;
      return [{
        x: bx, y: by, vx: 0, vy: 0, w: 6, h: 6,
        alive: true, owner: 'player', ...BULLET_DEFAULTS,
        enhancement: 'orbital',
        orbitAngle: 0, orbitRadius: 60, orbitRotations: maxRot,
      }];
    },
    onUpdate: (b, dt) => {
      const angularVelocity = 4;
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
    baseChance: 0.15,
    chancePerLevel: 0.10,
    onHit: (_b, e) => {
      const slot = player.enhancementSlots.find(s => s?.type === 'chainLightning');
      const arcRange = 120 + (slot ? slot.level * 20 : 0);
      const maxChains = 1 + Math.floor((slot ? slot.level : 0) / 2);
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
            x: cx + (nearest.x - cx) * t + (Math.random() - 0.5) * 30,
            y: cy + (nearest.y - cy) * t + (Math.random() - 0.5) * 30,
          });
        }
        segs.push({ x: nearest.x, y: nearest.y });
        lightningBolts.push({ segments: segs, life: 0.4, maxLife: 0.4 });
        nearest.hp--;
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
    desc: '5x points on kill',
    color: COLORS.yellow,
    baseChance: 0.05,
    chancePerLevel: 0.05,
    onHit: (_b, e) => {
      e.gildedTimer = 3;
    },
  });

  registerEnhancement({
    id: 'gravityWell',
    name: 'Gravity Well',
    abbr: 'GRV',
    desc: 'Slow orb that pulls enemies in',
    color: '#9d7cd8',
    baseChance: 0.15,
    chancePerLevel: 0.10,
    replacesDefault: true,
    onCreate: (_b, slot) => {
      const bx = player.x;
      const by = player.y - player.h / 2;
      const wellLife = 2 + slot.level * 0.5;
      return [{
        x: bx, y: by, vx: 0, vy: -120, w: 14, h: 14,
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
      b.vx *= (1 - 2 * dt);
      b.vy *= (1 - 2 * dt);
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
    baseChance: 0.15,
    chancePerLevel: 0.10,
    onHit: () => {
      const slot = player.enhancementSlots.find(s => s?.type === 'lifeDrain');
      const healChance = 0.25 + (slot ? slot.level * 0.1 : 0);
      if (Math.random() < healChance && player.hp < player.maxHp) {
        const healAmt = (slot && slot.level >= 3 && Math.random() < 0.3) ? 2 : 1;
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
    const speed = 180 + state.wave * 5;
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
    const speed = 200 + state.wave * 5;
    const baseAngle = Math.atan2(dy, dx);
    for (let i = -2; i <= 2; i++) {
      const angle = baseAngle + i * 0.15;
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
    const count = 8 + Math.floor(state.wave / 3);
    const speed = 140 + state.wave * 3;
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
    const speed = 120 + state.wave * 2;
    for (let v = 0; v < 5; v++) {
      const baseAngle = e.spiralAngle + v * 0.4;
      for (let i = 0; i < 3; i++) {
        const angle = baseAngle + (i * Math.PI * 2) / 3;
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
    e.spiralAngle += 2.0;
  }

  function fireWall(e: Enemy) {
    const gapX = W * 0.15 + Math.random() * W * 0.7;
    const gapW = 70;
    const speed = 150 + state.wave * 3;
    for (let x = 15; x < W; x += 30) {
      if (Math.abs(x - gapX) < gapW / 2) continue;
      bullets.push({
        x, y: e.y + e.h / 2,
        vx: 0, vy: speed,
        w: 20, h: 8,
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
      isLaserWarning: true, warningTimer: 0.8, warningX: lx, warningSourceY: ly,
    });
  }

  function fireLaserBeam(x: number, sourceY: number) {
    bullets.push({
      x, y: sourceY, vx: 0, vy: 0, w: 14, h: H - sourceY,
      alive: true, owner: 'enemy', ...BULLET_DEFAULTS,
      isLaser: true, laserLife: 0.35,
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
    const targetX = player.x + (Math.random() - 0.5) * 80;
    const targetY = player.y + (Math.random() - 0.5) * 60;
    const dx = targetX - e.x;
    const dy = targetY - e.y;
    const d = dist(e.x, e.y, targetX, targetY);
    const speed = e.isBoss ? (400 + Math.random() * 150) : (250 + Math.random() * 100);
    bullets.push({
      x: e.x, y: e.y + e.h / 2,
      vx: d > 0 ? (dx / d) * speed : 0,
      vy: d > 0 ? (dy / d) * speed : speed,
      w: 14, h: 14,
      alive: true, owner: 'enemy', ...BULLET_DEFAULTS,
      isMine: true, fuseTimer: -1,
    });
  }

  registerAttack({
    id: 'aimed',
    unlockWave: 1,
    label: 'AIM',
    glowColor: COLORS.orange,
    bgColor: 'rgba(255,158,100,0.3)',
    fire: fireAimed,
    bossFire: fireAimedBurst,
  });

  registerAttack({
    id: 'radial',
    unlockWave: 6,
    label: 'RAD',
    glowColor: COLORS.red,
    bgColor: 'rgba(247,118,142,0.3)',
    introWarning: 'NEW THREAT: RADIAL SHOTS',
    fire: fireRadial,
  });

  registerAttack({
    id: 'laser',
    unlockWave: 9,
    label: 'LAS',
    glowColor: COLORS.blue,
    bgColor: 'rgba(122,162,247,0.3)',
    introWarning: 'NEW THREAT: LASER BEAMS',
    fire: fireLaserWarning,
    bossFire: (e: Enemy) => {
      fireLaserWarning(e);
      const offsets = [-100, 100];
      for (const ox of offsets) {
        const lx = Math.max(20, Math.min(W - 20, player.x + ox));
        const ly = e.y + e.h / 2;
        bullets.push({
          x: lx, y: ly, vx: 0, vy: 0, w: 4, h: H - ly,
          alive: true, owner: 'enemy', ...BULLET_DEFAULTS,
          isLaserWarning: true, warningTimer: 0.8, warningX: lx, warningSourceY: ly,
        });
      }
    },
  });

  registerAttack({
    id: 'mine',
    unlockWave: 12,
    label: 'MIN',
    glowColor: COLORS.yellow,
    bgColor: 'rgba(224,175,104,0.3)',
    introWarning: 'NEW THREAT: LAND MINES',
    fire: throwMine,
    bossFire: (e: Enemy) => {
      for (let i = 0; i < 4; i++) throwMine(e);
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

  const BOSS_ATTACKS: EnemyAttack[] = ['aimed', 'radial', 'spiral', 'laser', 'mine', 'wall'];

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
    const shootChance = Math.min(0.9, 0.3 + state.wave * 0.05);
    const canShoot = enemiesShootThisWave() && Math.random() < shootChance;
    return {
      x, y: -eh, vx: 0, vy: stats.speed,
      w: ew, h: eh, word,
      hp: stats.hp, maxHp: stats.hp,
      alive: true, hitFlash: 0,
      pattern, phaseOffset: Math.random() * Math.PI * 2,
      baseX: x, time: 0,
      canShoot, attackType: canShoot ? pickAttack() : 'aimed',
      shootTimer: 1 + Math.random() * 2,
      shootInterval: Math.max(1.5, 3 - state.wave * 0.1),
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
        e.x = e.baseX + Math.sin(e.time * 2 + e.phaseOffset) * 80;
        break;
      case 'zigzag':
        e.y += e.vy * dt;
        e.x = e.baseX + ((Math.floor(e.time * 2) % 2 === 0 ? 1 : -1) * 60 * (e.time % 0.5)) / 0.5;
        break;
      case 'erratic':
        e.y += e.vy * dt;
        e.x = e.baseX + Math.sin(e.time * 6 + e.phaseOffset) * 40
            + Math.cos(e.time * 4.3 + e.phaseOffset * 2) * 25;
        break;
    }
  }

  registerEnemyType({
    id: 'normal',
    unlockWave: 1,
    weight: 3,
    spawn: () => {
      const word = nextWord();
      const stats = getEnemyStats(word);
      const x = Math.random() * (W - 60) + 30;
      enemies.push(makeBaseEnemy(x, word, stats, { enemyType: 'normal' }));
    },
  });

  registerEnemyType({
    id: 'splitter',
    unlockWave: 5,
    weight: 1,
    introWarning: 'NEW ENEMY: SPLITTERS',
    spawn: () => {
      const word = nextWord();
      const stats = getEnemyStats(word);
      const x = Math.random() * (W - 60) + 30;
      enemies.push(makeBaseEnemy(x, word, { hp: stats.hp + 1, speed: stats.speed }, {
        enemyType: 'splitter',
      }));
    },
    onKill: (e) => {
      if (!e.isSplitterChild) spawnSplitterChildren(e);
    },
  });

  registerEnemyType({
    id: 'swarm',
    unlockWave: 8,
    weight: 1,
    introWarning: 'NEW ENEMY: SWARM',
    spawn: () => {
      const count = 8 + Math.floor(Math.random() * 3);
      const clusterX = Math.random() * (W - 100) + 50;
      const chars = ['*', '#', '~', '!', '@'];
      for (let i = 0; i < count; i++) {
        const x = clusterX + (Math.random() - 0.5) * 80;
        const ch = chars[Math.floor(Math.random() * chars.length)];
        enemies.push({
          x, y: -(Math.random() * 40), vx: 0,
          vy: 150 + state.wave * 6 + Math.random() * 60,
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
    unlockWave: 11,
    weight: 1,
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
      e.cloakPhase += dt * 1.5;
      e.cloakVisible = Math.sin(e.cloakPhase) > -0.3;
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
    const typeId = pickEnemyType();
    ENEMY_TYPE_REGISTRY[typeId].spawn();
  }

  function spawnSplitterChildren(parent: Enemy) {
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const offsetX = (i - (count - 1) / 2) * 30;
      enemies.push({
        x: parent.x + offsetX, y: parent.y, vx: 0, vy: parent.vy * 1.5,
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
  // SPAWN / KILL / EFFECTS
  // =========================================================================

  function spawnBoss() {
    state.bossActive = true;
    const bossHp = 30 + state.wave * 5;
    const bossWord = '< BOSS >';
    ctx.font = 'bold 24px monospace';
    const measured = ctx.measureText(bossWord);
    const bw = measured.width + 40;
    const bh = 40;
    enemies.push({
      x: W / 2, y: -bh, vx: 0, vy: 40,
      w: bw, h: bh, word: bossWord,
      hp: bossHp, maxHp: bossHp,
      alive: true, hitFlash: 0,
      pattern: 'sine', phaseOffset: 0,
      baseX: W / 2, time: 0,
      canShoot: true, attackType: 'aimed',
      shootTimer: 1, shootInterval: 0.8,
      isBoss: true, bossAttackIndex: 0, bossAttackTimer: 0,
      gildedTimer: 0,
      enemyType: 'normal' as EnemyType,
      isSplitterChild: false,
      cloakPhase: 0, cloakVisible: true,
      spiralAngle: 0,
    });
    state.enemiesRemaining = 1;
    state.enemiesSpawned = state.enemiesPerWave;
  }

  function killEnemy(e: Enemy) {
    e.alive = false;
    state.enemiesRemaining--;

    const typeDef = ENEMY_TYPE_REGISTRY[e.enemyType];
    if (typeDef?.onKill) typeDef.onKill(e);

    state.totalKills++;
    const gilded = e.gildedTimer > 0;
    const mult = gilded ? 5 : 1;
    state.score += e.word.length * 10 * mult;
    state.points += 1 * mult;

    state.combo++;
    state.comboTimer = 3;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;

    if (e.isBoss) {
      state.bossActive = false;
      state.points += 10 * mult;
      spawnBossDeathEffect(e.x, e.y);
      triggerShake(12, 0.6);
      state.timeScale = 0.15;
      state.timeScaleTimer = 1.5;
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
    if (Math.random() < (e.isBoss ? 0.5 : 0.12)) {
      lootCrates.push({ x: e.x, y: e.y, vy: 30, alive: true, enhancement: randomEnhancementType() });
    }
  }

  function spawnExplosion(x: number, y: number) {
    triggerShake(5, 0.2);
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      particles.push({
        x, y,
        vx: Math.cos(angle) * 150, vy: Math.sin(angle) * 150,
        life: 0.4, maxLife: 0.4, char: '*', color: COLORS.orange, size: 14,
      });
    }
    for (const e of enemies) {
      if (!e.alive) continue;
      const typeDef = ENEMY_TYPE_REGISTRY[e.enemyType];
      if (typeDef?.canBeHit && !typeDef.canBeHit(e)) continue;
      if (dist(x, y, e.x, e.y) < 80) {
        e.hp--;
        e.hitFlash = 1;
        if (e.hp <= 0) killEnemy(e);
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
        cost: shopCost(3, 'hp_up'),
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
        cost: shopCost(2, 'heal'),
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
        cost: shopCost(3, 'fire_rate'),
        available: () => player.shootCooldown > 0.04,
        apply: () => {
          player.shootCooldown = Math.max(0.04, player.shootCooldown - 0.02);
          purchaseCounts['fire_rate'] = (purchaseCounts['fire_rate'] || 0) + 1;
        },
      },
      {
        id: 'max_bullets',
        name: '+1 Bullet Count',
        desc: `More bullets on screen (current: ${player.maxBullets})`,
        cost: shopCost(2, 'max_bullets'),
        available: () => player.maxBullets < 12,
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
        cost: shopCost(3 + slot.level, slotId),
        available: () => slot.level < 5,
        apply: () => {
          slot.level++;
          slot.chance = Math.min(1, slot.chance + def.chancePerLevel);
          purchaseCounts[slotId] = (purchaseCounts[slotId] || 0) + 1;
        },
      });

      const sacrificeId = `sacrifice_${i}`;
      const reward = 3 + slot.level * 2;
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
          shopItems = buildShopItems();
        },
      });
    }

    return items;
  }

  let shopItems: ShopItem[] = [];

  function startWave() {
    state.phase = 'waveIntro';
    state.waveTimer = isBossWave() ? 3 : 2;
    state.enemiesSpawned = 0;
    state.enemiesPerWave = isBossWave() ? 0 : 6 + state.wave * 2;
    state.enemiesRemaining = state.enemiesPerWave;
    state.spawnInterval = Math.max(0.3, 1.2 - state.wave * 0.08);
    state.spawnTimer = 0;
    state.bossActive = false;
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
        x: bx, y: by, vx: 0, vy: -600, w: 4, h: 12,
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
      x: bx, y: by, vx: 0, vy: -600, w: 4, h: 12,
      alive: true, owner: 'player', ...BULLET_DEFAULTS,
    });
  }

  function checkGrazing() {
    for (const b of bullets) {
      if (!b.alive || b.owner !== 'enemy' || b.isMine || b.isLaser || b.isLaserWarning || b.grazed) continue;
      const d = dist(b.x, b.y, player.x, player.y);
      const collisionDist = (b.w + player.w) / 2;
      if (d < 30 && d > collisionDist) {
        b.grazed = true;
        state.grazeScore += 5;
        state.score += 5;
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
    const rerollCost = 3 + Math.floor(state.wave / 2);
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
          b.vx *= (1 - 3 * dt);
          b.vy *= (1 - 3 * dt);
          if (Math.abs(b.vx) < 10 && Math.abs(b.vy) < 10) {
            b.vx = 0;
            b.vy = 0;
            b.fuseTimer = 2.5 + Math.random() * 1.5;
          }
          if (b.x < -20 || b.x > W + 20 || b.y > H + 20) b.alive = false;
        } else {
          b.fuseTimer -= dt;
          if (b.fuseTimer <= 0) {
            b.alive = false;
            spawnMineExplosion(b.x, b.y);
            if (
              performance.now() > player.invincibleUntil &&
              aabb(b.x, b.y, 120, 120, player.x, player.y, 0, 0)
            ) {
              player.hp--;
              player.invincibleUntil = performance.now() + 1500;
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
      e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
      if (e.gildedTimer > 0) e.gildedTimer -= dt;

      const typeDef = ENEMY_TYPE_REGISTRY[e.enemyType];

      if (e.isBoss) {
        if (e.y < 80) {
          e.y += e.vy * dt;
        } else {
          e.y = 80;
          e.x = W / 2 + Math.sin(e.time * 0.8) * (W * 0.3);
        }
        e.bossAttackTimer += dt;
        if (e.bossAttackTimer >= 1.5) {
          bossShoot(e);
          e.bossAttackTimer = 0;
          e.bossAttackIndex++;
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
      const pullRadius = 100 + (gravSlot ? gravSlot.level * 20 : 0);
      const pullForce = 80 + (gravSlot ? gravSlot.level * 15 : 0);
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
      const maxPull = pullForce * 1.2;
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
        player.invincibleUntil = now + 1500;
        triggerShake(10, 0.4);
        if (player.hp <= 0) state.phase = 'gameOver';
      }
    }
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
        player.invincibleUntil = now + 1500;
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
          const typeDef = ENEMY_TYPE_REGISTRY[e.enemyType];
          if (typeDef?.canBeHit && !typeDef.canBeHit(e)) continue;
          if (aabb(b.x, b.y, b.w, b.h, e.x, e.y, e.w, e.h, 10)) {
            if (e.hitFlash <= 0) {
              e.hp--;
              e.hitFlash = 0.5;
              if (e.hp <= 0) killEnemy(e);
            }
          }
        }
        continue;
      }

      for (const e of enemies) {
        if (!e.alive) continue;
        const typeDef = ENEMY_TYPE_REGISTRY[e.enemyType];
        if (typeDef?.canBeHit && !typeDef.canBeHit(e)) continue;
        if (aabb(b.x, b.y, b.w, b.h, e.x, e.y, e.w, e.h)) {
          b.alive = false;
          state.bulletsHit++;
          e.hp--;
          e.hitFlash = 1;

          if (b.enhancement) {
            const def = ENHANCEMENT_REGISTRY[b.enhancement];
            def?.onHit?.(b, e);
          }

          if (e.hp <= 0) killEnemy(e);
          break;
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
      if (aabb(c.x, c.y, 0, 0, player.x, player.y, 60, 60)) {
        c.alive = false;
        const allFull = player.enhancementSlots.every(s => s !== null);
        if (allFull) {
          const bonus = 5;
          state.points += bonus;
          state.score += bonus * 10;
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
    if (state.phase === 'gameOver') { clearKeys(); return; }

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

      if (e.isBoss) {
        ctx.font = 'bold 24px monospace';
        const glowColor = gilded ? COLORS.yellow : COLORS.red;
        ctx.shadowColor = flash ? '#fff' : glowColor;
        ctx.shadowBlur = flash ? 30 : gilded ? 24 : 16;
        ctx.fillStyle = flash ? `rgba(255,255,255,0.3)` : `rgba(247,118,142,0.2)`;
        ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
        ctx.strokeStyle = flash ? '#fff' : glowColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
        ctx.fillStyle = flash ? '#fff' : COLORS.fgBright;
        ctx.fillText(e.word, e.x, e.y);
        const barW = e.w;
        const barH = 6;
        const barY = e.y - e.h / 2 - 12;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(e.x - barW / 2, barY, barW, barH);
        const hpRatio = e.hp / e.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? COLORS.red : hpRatio > 0.25 ? COLORS.orange : COLORS.yellow;
        ctx.fillRect(e.x - barW / 2, barY, barW * hpRatio, barH);
        ctx.strokeStyle = COLORS.fgMuted;
        ctx.lineWidth = 1;
        ctx.strokeRect(e.x - barW / 2, barY, barW, barH);
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

      if (flash) {
        ctx.shadowColor = COLORS.red;
        ctx.shadowBlur = 16;
      } else {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = gilded ? 20 : 6;
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
    const nextLabel = isBossWave() ? `>> BOSS WAVE ${state.wave} >>` : `>> WAVE ${state.wave} >>`;
    ctx.fillText(nextLabel, cx, contY + 22);

    ctx.font = '12px monospace';
    ctx.fillStyle = COLORS.fgMuted;
    ctx.textAlign = 'center';
    ctx.fillText('W/S to select  |  ENTER/SPACE to buy', cx, contY + itemH + 16);
  }

  function waveIntroWarning(): string | null {
    if (isBossWave()) return 'BOSS FIGHT!';
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
    ctx.fillText(isBoss ? `BOSS - WAVE ${state.wave}` : `WAVE ${state.wave}`, W / 2, H / 2 - 40);
    ctx.shadowBlur = 0;

    const warning = waveIntroWarning();
    if (warning && !isBoss) {
      ctx.font = '14px monospace';
      ctx.fillStyle = COLORS.orange;
      ctx.fillText(warning, W / 2, H / 2);
    }
    if (isBoss) {
      ctx.font = '14px monospace';
      ctx.fillStyle = COLORS.orange;
      ctx.fillText('PREPARE YOURSELF', W / 2, H / 2);
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
    const rerollCost = 3 + Math.floor(state.wave / 2);
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
    ctx.fillText(`${state.combo}x COMBO`, W / 2, 20);
    ctx.shadowBlur = 0;
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
