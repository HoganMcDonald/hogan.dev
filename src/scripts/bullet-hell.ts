// Bullet Hell Mini Game
// Words from the page become enemy waves in a top-down shooter

type BulletOwner = 'player' | 'enemy';
type EnemyPattern = 'straight' | 'sine' | 'zigzag';
type EnemyAttack = 'aimed' | 'radial' | 'laser' | 'mine';
type Phase = 'playing' | 'waveIntro' | 'shop' | 'gameOver';

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
  homingChance: number;
  explodingChance: number;
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
  homing: boolean;
  exploding: boolean;
  target?: Enemy;
  // mine fields
  isMine: boolean;
  fuseTimer: number;
  // laser fields
  isLaser: boolean;
  laserLife: number;
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
}

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
  homing: false,
  exploding: false,
  isMine: false,
  fuseTimer: 0,
  isLaser: false,
  laserLife: 0,
};

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
    homingChance: 0,
    explodingChance: 0,
  };

  const bullets: Bullet[] = [];
  const enemies: Enemy[] = [];
  const particles: Particle[] = [];

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
  };

  function enemiesShootThisWave(): boolean {
    return state.wave >= 3;
  }

  function enemyHpBonus(): number {
    return Math.floor(state.wave / 5);
  }

  // Determine which attack types are available at this wave
  // Wave 3: aimed, Wave 6: radial, Wave 9: laser, Wave 12: mine
  function availableAttacks(): EnemyAttack[] {
    const attacks: EnemyAttack[] = ['aimed'];
    if (state.wave >= 6) attacks.push('radial');
    if (state.wave >= 9) attacks.push('laser');
    if (state.wave >= 12) attacks.push('mine');
    return attacks;
  }

  function pickAttack(): EnemyAttack {
    const attacks = availableAttacks();
    return attacks[Math.floor(Math.random() * attacks.length)];
  }

  function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
  }

  function buildShopItems(): ShopItem[] {
    return [
      {
        id: 'hp_up',
        name: '+1 Max HP',
        desc: 'Increase maximum health by 1',
        cost: 3,
        available: () => true,
        apply: () => {
          player.maxHp++;
          player.hp++;
        },
      },
      {
        id: 'heal',
        name: 'Full Heal',
        desc: 'Restore all health',
        cost: 2,
        available: () => player.hp < player.maxHp,
        apply: () => {
          player.hp = player.maxHp;
        },
      },
      {
        id: 'fire_rate',
        name: 'Faster Firing',
        desc: `Reduce shot cooldown (current: ${Math.round(player.shootCooldown * 1000)}ms)`,
        cost: 3,
        available: () => player.shootCooldown > 0.04,
        apply: () => {
          player.shootCooldown = Math.max(0.04, player.shootCooldown - 0.02);
        },
      },
      {
        id: 'max_bullets',
        name: '+1 Bullet Count',
        desc: `More bullets on screen (current: ${player.maxBullets})`,
        cost: 2,
        available: () => player.maxBullets < 12,
        apply: () => {
          player.maxBullets++;
        },
      },
      {
        id: 'gun_exploding',
        name: 'Exploding Rounds',
        desc: `+15% chance to explode on hit (current: ${pct(player.explodingChance)})`,
        cost: 3,
        available: () => player.explodingChance < 1,
        apply: () => {
          player.explodingChance = Math.min(1, player.explodingChance + 0.15);
        },
      },
      {
        id: 'gun_homing',
        name: 'Homing Rounds',
        desc: `+15% chance to track enemies (current: ${pct(player.homingChance)})`,
        cost: 3,
        available: () => player.homingChance < 1,
        apply: () => {
          player.homingChance = Math.min(1, player.homingChance + 0.15);
        },
      },
    ];
  }

  let shopItems: ShopItem[] = [];

  function playerBulletCount(): number {
    let count = 0;
    for (const b of bullets) {
      if (b.owner === 'player' && b.alive) count++;
    }
    return count;
  }

  function nextWord(): string {
    const word = state.wordPool[state.wordIndex % state.wordPool.length];
    state.wordIndex++;
    return word;
  }

  function getEnemyStats(word: string): { hp: number; speed: number } {
    const len = word.length;
    const bonus = enemyHpBonus();
    if (len <= 4) return { hp: 1 + bonus, speed: 100 + Math.random() * 40 };
    if (len <= 8) return { hp: 2 + bonus, speed: 70 + Math.random() * 30 };
    return { hp: 3 + bonus, speed: 50 + Math.random() * 20 };
  }

  function spawnEnemy() {
    const word = nextWord();
    const stats = getEnemyStats(word);
    const patterns: EnemyPattern[] = ['straight', 'sine', 'zigzag'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    ctx.font = '16px monospace';
    const measured = ctx.measureText(word);
    const ew = measured.width + 12;
    const eh = 24;
    const x = Math.random() * (W - ew) + ew / 2;
    const canShoot = enemiesShootThisWave() && Math.random() < 0.5;
    enemies.push({
      x,
      y: -eh,
      vx: 0,
      vy: stats.speed,
      w: ew,
      h: eh,
      word,
      hp: stats.hp,
      maxHp: stats.hp,
      alive: true,
      hitFlash: 0,
      pattern,
      phaseOffset: Math.random() * Math.PI * 2,
      baseX: x,
      time: 0,
      canShoot,
      attackType: canShoot ? pickAttack() : 'aimed',
      shootTimer: 1 + Math.random() * 2,
      shootInterval: Math.max(1.5, 3 - state.wave * 0.1),
    });
  }

  // --- Enemy attack functions ---

  function fireAimed(e: Enemy) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    const speed = 180 + state.wave * 5;
    bullets.push({
      x: e.x,
      y: e.y + e.h / 2,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      w: 6,
      h: 6,
      alive: true,
      owner: 'enemy',
      ...BULLET_DEFAULTS,
    });
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

  function fireLaser(e: Enemy) {
    // Laser: a tall thin beam that spawns below the enemy, aimed at player's current x
    const lx = player.x;
    const ly = e.y + e.h / 2;
    bullets.push({
      x: lx,
      y: ly,
      vx: 0,
      vy: 0,
      w: 12,
      h: H - ly,
      alive: true,
      owner: 'enemy',
      ...BULLET_DEFAULTS,
      isLaser: true,
      laserLife: 0.4,
    });
    // Warning particles along beam
    for (let py = ly; py < H; py += 40) {
      particles.push({
        x: lx + (Math.random() - 0.5) * 10,
        y: py,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 30,
        life: 0.3,
        maxLife: 0.3,
        char: '|',
        color: COLORS.red,
        size: 16,
      });
    }
  }

  function dropMine(e: Enemy) {
    bullets.push({
      x: e.x,
      y: e.y + e.h / 2,
      vx: 0,
      vy: 0,
      w: 14,
      h: 14,
      alive: true,
      owner: 'enemy',
      ...BULLET_DEFAULTS,
      isMine: true,
      fuseTimer: 3 + Math.random() * 2,
    });
  }

  function enemyShoot(e: Enemy) {
    switch (e.attackType) {
      case 'aimed': fireAimed(e); break;
      case 'radial': fireRadial(e); break;
      case 'laser': fireLaser(e); break;
      case 'mine': dropMine(e); break;
    }
  }

  function spawnExplosion(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      particles.push({
        x, y,
        vx: Math.cos(angle) * 150,
        vy: Math.sin(angle) * 150,
        life: 0.4,
        maxLife: 0.4,
        char: '*',
        color: COLORS.orange,
        size: 14,
      });
    }
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        e.hp--;
        e.hitFlash = 1;
        if (e.hp <= 0) {
          e.alive = false;
          state.enemiesRemaining--;
          state.score += e.word.length * 10;
          state.points++;
          spawnParticles(e.x, e.y, e.word);
        }
      }
    }
  }

  function spawnMineExplosion(x: number, y: number) {
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      particles.push({
        x, y,
        vx: Math.cos(angle) * 120,
        vy: Math.sin(angle) * 120,
        life: 0.5,
        maxLife: 0.5,
        char: '#',
        color: COLORS.yellow,
        size: 12,
      });
    }
  }

  function spawnParticles(x: number, y: number, word: string) {
    for (const char of word) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        char,
        color: COLORS.cyan,
        size: 14,
      });
    }
  }

  function startWave() {
    state.phase = 'waveIntro';
    state.waveTimer = 2;
    state.enemiesSpawned = 0;
    state.enemiesPerWave = 6 + state.wave * 2;
    state.enemiesRemaining = state.enemiesPerWave;
    state.spawnInterval = Math.max(0.3, 1.2 - state.wave * 0.08);
    state.spawnTimer = 0;
  }

  function enterShop() {
    state.phase = 'shop';
    shopItems = buildShopItems();
    state.shopSelection = 0;
  }

  let lastTime = performance.now();
  let running = true;

  function cleanup() {
    running = false;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.remove();
    if (pageContent) pageContent.style.visibility = '';
  }

  function findNearestEnemy(x: number, y: number): Enemy | undefined {
    let best: Enemy | undefined;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  function firePlayerBullet(now: number) {
    if (playerBulletCount() >= player.maxBullets) return;
    if (now - player.lastShot < player.shootCooldown * 1000) return;
    player.lastShot = now;

    // Roll homing and exploding independently — both can be true
    const isHoming = Math.random() < player.homingChance;
    const isExploding = Math.random() < player.explodingChance;

    const bx = player.x;
    const by = player.y - player.h / 2;
    const target = isHoming ? findNearestEnemy(bx, by) : undefined;

    bullets.push({
      x: bx,
      y: by,
      vx: 0,
      vy: isHoming ? -500 : -600,
      w: isHoming ? 5 : 4,
      h: isHoming ? 10 : 12,
      alive: true,
      owner: 'player',
      homing: isHoming,
      exploding: isExploding,
      target,
      isMine: false,
      fuseTimer: 0,
      isLaser: false,
      laserLife: 0,
    });
  }

  function update(dt: number, now: number) {
    // Shop phase
    if (state.phase === 'shop') {
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
      for (const k in keyJustPressed) delete keyJustPressed[k];
      return;
    }

    // Wave intro countdown
    if (state.phase === 'waveIntro') {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) {
        state.phase = 'playing';
      }
    }

    if (state.phase === 'gameOver') {
      for (const k in keyJustPressed) delete keyJustPressed[k];
      return;
    }

    // Player movement
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

    // Shooting
    if (keys[' ']) {
      firePlayerBullet(now);
    }

    // Spawn enemies
    if (state.phase === 'playing' && state.enemiesSpawned < state.enemiesPerWave) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy();
        state.enemiesSpawned++;
        state.spawnTimer = state.spawnInterval;
      }
    }

    // Update bullets
    for (const b of bullets) {
      if (!b.alive) continue;

      // Laser lifetime
      if (b.isLaser) {
        b.laserLife -= dt;
        if (b.laserLife <= 0) b.alive = false;
        continue; // lasers don't move
      }

      // Mine fuse
      if (b.isMine) {
        b.fuseTimer -= dt;
        if (b.fuseTimer <= 0) {
          b.alive = false;
          spawnMineExplosion(b.x, b.y);
          // Damage player if nearby
          if (
            now > player.invincibleUntil &&
            Math.abs(b.x - player.x) < 60 &&
            Math.abs(b.y - player.y) < 60
          ) {
            player.hp--;
            player.invincibleUntil = now + 1500;
            if (player.hp <= 0) state.phase = 'gameOver';
          }
        }
        continue; // mines don't move
      }

      // Homing logic (player bullets only)
      if (b.homing && b.owner === 'player') {
        if (!b.target || !b.target.alive) b.target = findNearestEnemy(b.x, b.y);
        if (b.target) {
          const tdx = b.target.x - b.x;
          const tdy = b.target.y - b.y;
          const dist = Math.sqrt(tdx * tdx + tdy * tdy);
          if (dist > 0) {
            const turnRate = 8 * dt;
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 500;
            b.vx += (tdx / dist) * speed * turnRate;
            b.vy += (tdy / dist) * speed * turnRate;
            const newSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            b.vx = (b.vx / newSpeed) * speed;
            b.vy = (b.vy / newSpeed) * speed;
          }
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20 || b.y > H + 20 || b.x < -20 || b.x > W + 20) b.alive = false;
    }

    // Update enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      e.time += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt * 5);

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
      }

      // Enemy shooting
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

      // Collision with player
      if (
        now > player.invincibleUntil &&
        Math.abs(e.x - player.x) < (e.w + player.w) / 2 &&
        Math.abs(e.y - player.y) < (e.h + player.h) / 2
      ) {
        player.hp--;
        player.invincibleUntil = now + 1500;
        if (player.hp <= 0) state.phase = 'gameOver';
      }
    }

    // Enemy bullet vs player
    for (const b of bullets) {
      if (!b.alive || b.owner !== 'enemy') continue;
      // Mines don't collide directly, they explode on fuse
      if (b.isMine) continue;
      // Laser uses its full height as hitbox
      const bw = b.isLaser ? b.w : b.w;
      const bh = b.isLaser ? b.h : b.h;
      const by = b.isLaser ? b.y + b.h / 2 : b.y;
      if (
        now > player.invincibleUntil &&
        Math.abs(b.x - player.x) < (bw + player.w) / 2 &&
        Math.abs(by - player.y) < (bh + player.h) / 2
      ) {
        if (!b.isLaser) b.alive = false; // lasers persist through hits
        player.hp--;
        player.invincibleUntil = now + 1500;
        if (player.hp <= 0) state.phase = 'gameOver';
      }
    }

    // Player bullet vs enemy collision
    for (const b of bullets) {
      if (!b.alive || b.owner !== 'player') continue;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (
          Math.abs(b.x - e.x) < (b.w + e.w) / 2 &&
          Math.abs(b.y - e.y) < (b.h + e.h) / 2
        ) {
          b.alive = false;
          e.hp--;
          e.hitFlash = 1;
          if (b.exploding) {
            spawnExplosion(b.x, b.y);
          }
          if (e.hp <= 0) {
            e.alive = false;
            state.enemiesRemaining--;
            state.score += e.word.length * 10;
            state.points++;
            spawnParticles(e.x, e.y, e.word);
          }
          break;
        }
      }
    }

    // Update particles
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vy += 100 * dt;
    }

    // Cleanup
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (!bullets[i].alive) bullets.splice(i, 1);
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (!enemies[i].alive) enemies.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Check wave complete
    if (
      state.phase === 'playing' &&
      state.enemiesRemaining <= 0 &&
      state.enemiesSpawned >= state.enemiesPerWave
    ) {
      state.wave++;
      enterShop();
    }

    for (const k in keyJustPressed) delete keyJustPressed[k];
  }

  // --- Drawing ---

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

  function drawBullets() {
    for (const b of bullets) {
      ctx.save();

      if (b.owner === 'player') {
        // Combo bullet: homing+exploding = yellow-green
        if (b.homing && b.exploding) {
          ctx.shadowColor = COLORS.yellow;
          ctx.shadowBlur = 12;
          ctx.fillStyle = COLORS.yellow;
        } else if (b.exploding) {
          ctx.shadowColor = COLORS.orange;
          ctx.shadowBlur = 10;
          ctx.fillStyle = COLORS.orange;
        } else if (b.homing) {
          ctx.shadowColor = COLORS.green;
          ctx.shadowBlur = 10;
          ctx.fillStyle = COLORS.green;
        } else {
          ctx.shadowColor = COLORS.cyan;
          ctx.shadowBlur = 8;
          ctx.fillStyle = COLORS.cyan;
        }
        ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      } else if (b.isLaser) {
        // Laser beam
        ctx.shadowColor = COLORS.red;
        ctx.shadowBlur = 20;
        ctx.fillStyle = `rgba(247,118,142,${0.4 + Math.random() * 0.3})`;
        ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
        // Bright core
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.2})`;
        ctx.fillRect(b.x - 2, b.y, 4, b.h);
      } else if (b.isMine) {
        // Mine: pulsing diamond
        const pulse = 1 + Math.sin(b.fuseTimer * 6) * 0.2;
        ctx.shadowColor = b.fuseTimer < 1 ? COLORS.red : COLORS.yellow;
        ctx.shadowBlur = b.fuseTimer < 1 ? 16 : 8;
        ctx.fillStyle = b.fuseTimer < 1 ? COLORS.red : COLORS.yellow;
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.PI / 4);
        const s = (b.w / 2) * pulse;
        ctx.fillRect(-s, -s, s * 2, s * 2);
      } else {
        // Normal enemy bullet
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
    ctx.font = '16px monospace';
    for (const e of enemies) {
      const flash = e.hitFlash > 0;
      ctx.save();

      // Color based on attack type when shooting
      let glowColor = COLORS.purple;
      let bgColor = `rgba(187,154,247,0.3)`;
      if (e.canShoot) {
        switch (e.attackType) {
          case 'aimed':
            glowColor = COLORS.orange;
            bgColor = `rgba(255,158,100,0.3)`;
            break;
          case 'radial':
            glowColor = COLORS.red;
            bgColor = `rgba(247,118,142,0.3)`;
            break;
          case 'laser':
            glowColor = COLORS.blue;
            bgColor = `rgba(122,162,247,0.3)`;
            break;
          case 'mine':
            glowColor = COLORS.yellow;
            bgColor = `rgba(224,175,104,0.3)`;
            break;
        }
      }

      if (flash) {
        ctx.shadowColor = COLORS.red;
        ctx.shadowBlur = 16;
      } else {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 6;
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

      // Attack type indicator for shooting enemies
      if (e.canShoot) {
        ctx.font = '9px monospace';
        ctx.fillStyle = glowColor;
        const labels: Record<EnemyAttack, string> = {
          aimed: 'AIM', radial: 'RAD', laser: 'LAS', mine: 'MIN',
        };
        ctx.fillText(labels[e.attackType], e.x, e.y + e.h / 2 + 8);
        ctx.font = '16px monospace';
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

    if (player.homingChance > 0 || player.explodingChance > 0) {
      ctx.fillStyle = COLORS.fgMuted;
      const parts: string[] = [];
      if (player.homingChance > 0) parts.push(`HMG ${pct(player.homingChance)}`);
      if (player.explodingChance > 0) parts.push(`EXP ${pct(player.explodingChance)}`);
      ctx.fillText(parts.join('  '), hudPad, hudPad + barH + 36);
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

    if (player.homingChance > 0 || player.explodingChance > 0) {
      ctx.font = '13px monospace';
      ctx.fillStyle = COLORS.fgMuted;
      const parts: string[] = [];
      if (player.homingChance > 0) parts.push(`Homing: ${pct(player.homingChance)}`);
      if (player.explodingChance > 0) parts.push(`Exploding: ${pct(player.explodingChance)}`);
      ctx.fillText(parts.join('  |  '), cx, startY + 65);
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
    ctx.fillText(`>> WAVE ${state.wave} >>`, cx, contY + 22);

    ctx.font = '12px monospace';
    ctx.fillStyle = COLORS.fgMuted;
    ctx.textAlign = 'center';
    ctx.fillText('W/S to select  |  ENTER/SPACE to buy', cx, contY + itemH + 16);
  }

  function waveIntroWarning(): string | null {
    const w = state.wave;
    if (w === 3) return 'ENEMIES ARE SHOOTING BACK!';
    if (w === 6) return 'NEW THREAT: RADIAL SHOTS';
    if (w === 9) return 'NEW THREAT: LASER BEAMS';
    if (w === 12) return 'NEW THREAT: LAND MINES';
    return null;
  }

  function drawWaveIntro() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 20;
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText(`WAVE ${state.wave}`, W / 2, H / 2 - 40);
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
    ctx.fillText('GAME OVER', W / 2, H / 2 - 50);
    ctx.shadowBlur = 0;
    ctx.font = '20px monospace';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText(`Score: ${state.score}`, W / 2, H / 2 + 10);
    ctx.fillStyle = COLORS.fgMuted;
    ctx.font = '14px monospace';
    ctx.fillText(`Wave ${state.wave}`, W / 2, H / 2 + 40);
    ctx.fillStyle = COLORS.fgBright;
    ctx.font = '16px monospace';
    ctx.fillText('[ ENTER to restart ]', W / 2, H / 2 + 80);
  }

  function draw(now: number) {
    ctx.clearRect(0, 0, W, H);

    if (state.phase === 'shop') {
      drawShop();
      return;
    }

    drawPlayer(now);
    drawBullets();
    drawEnemies();
    drawParticles();
    drawHUD();

    if (state.phase === 'waveIntro') drawWaveIntro();
    if (state.phase === 'gameOver') drawGameOver();
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
      cleanup();
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('keydown', handleRestart);
    }
  }
  window.addEventListener('keydown', handleEsc);

  startWave();

  function loop() {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt, now);
    draw(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
