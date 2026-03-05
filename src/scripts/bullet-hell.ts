// Bullet Hell Mini Game
// Words from the page become enemy waves in a top-down shooter

interface Vec2 {
  x: number;
  y: number;
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
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  alive: boolean;
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
  pattern: 'straight' | 'sine' | 'zigzag';
  phaseOffset: number;
  baseX: number;
  time: number;
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
}

interface GameState {
  phase: 'playing' | 'waveIntro' | 'gameOver';
  score: number;
  wave: number;
  waveTimer: number;
  enemiesRemaining: number;
  enemiesSpawned: number;
  enemiesPerWave: number;
  spawnTimer: number;
  spawnInterval: number;
  wordPool: string[];
  wordIndex: number;
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
  // dedupe and shuffle
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

  // Hide page content
  const pageContent = document.querySelector('.page-content') as HTMLElement;
  if (pageContent) pageContent.style.visibility = 'hidden';

  const keys: Record<string, boolean> = {};
  const onKeyDown = (e: KeyboardEvent) => {
    keys[e.key.toLowerCase()] = true;
    if (['w', 'a', 's', 'd', ' '].includes(e.key.toLowerCase())) {
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
  };

  const bullets: Bullet[] = [];
  const enemies: Enemy[] = [];
  const particles: Particle[] = [];

  const state: GameState = {
    phase: 'waveIntro',
    score: 0,
    wave: 1,
    waveTimer: 2,
    enemiesRemaining: 0,
    enemiesSpawned: 0,
    enemiesPerWave: 6,
    spawnTimer: 0,
    spawnInterval: 1.2,
    wordPool: words,
    wordIndex: 0,
  };

  function nextWord(): string {
    const word = state.wordPool[state.wordIndex % state.wordPool.length];
    state.wordIndex++;
    return word;
  }

  function getEnemyStats(word: string): { hp: number; speed: number } {
    const len = word.length;
    if (len <= 4) return { hp: 1, speed: 100 + Math.random() * 40 };
    if (len <= 8) return { hp: 2, speed: 70 + Math.random() * 30 };
    return { hp: 3, speed: 50 + Math.random() * 20 };
  }

  function spawnEnemy() {
    const word = nextWord();
    const stats = getEnemyStats(word);
    const patterns: Enemy['pattern'][] = ['straight', 'sine', 'zigzag'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    // measure word width
    ctx.font = '16px monospace';
    const measured = ctx.measureText(word);
    const ew = measured.width + 12;
    const eh = 24;
    const x = Math.random() * (W - ew) + ew / 2;
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
    });
  }

  function spawnParticles(x: number, y: number, word: string) {
    for (const char of word) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        char,
        color: COLORS.cyan,
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

  let lastTime = performance.now();
  let running = true;

  function cleanup() {
    running = false;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.remove();
    if (pageContent) pageContent.style.visibility = '';
  }

  function update(dt: number, now: number) {
    // Wave intro countdown
    if (state.phase === 'waveIntro') {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) {
        state.phase = 'playing';
      }
      // Still allow movement during intro
    }

    if (state.phase === 'gameOver') return;

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
    if (keys[' '] && now - player.lastShot > player.shootCooldown * 1000) {
      player.lastShot = now;
      bullets.push({
        x: player.x,
        y: player.y - player.h / 2,
        vx: 0,
        vy: -600,
        w: 4,
        h: 12,
        alive: true,
      });
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
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20 || b.y > H + 20) b.alive = false;
    }

    // Update enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      e.time += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt * 5);

      // Movement patterns
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

      // Off screen
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
        if (player.hp <= 0) {
          state.phase = 'gameOver';
        }
      }
    }

    // Bullet-enemy collision
    for (const b of bullets) {
      if (!b.alive) continue;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (
          Math.abs(b.x - e.x) < (b.w + e.w) / 2 &&
          Math.abs(b.y - e.y) < (b.h + e.h) / 2
        ) {
          b.alive = false;
          e.hp--;
          e.hitFlash = 1;
          if (e.hp <= 0) {
            e.alive = false;
            state.enemiesRemaining--;
            state.score += e.word.length * 10;
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
      p.vy += 100 * dt; // gravity
    }

    // Cleanup dead entities
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
      startWave();
    }
  }

  function draw(now: number) {
    ctx.clearRect(0, 0, W, H);

    // Draw player
    const invincible = now < player.invincibleUntil;
    const blink = invincible && Math.floor(now / 80) % 2 === 0;
    if (!blink) {
      ctx.save();
      ctx.translate(player.x, player.y);
      // Glow
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
      // Inner highlight
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

    // Draw bullets
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 8;
    ctx.fillStyle = COLORS.cyan;
    for (const b of bullets) {
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    }
    ctx.shadowBlur = 0;

    // Draw enemies
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '16px monospace';
    for (const e of enemies) {
      const flash = e.hitFlash > 0;
      ctx.save();
      if (flash) {
        ctx.shadowColor = COLORS.red;
        ctx.shadowBlur = 16;
      } else {
        ctx.shadowColor = COLORS.purple;
        ctx.shadowBlur = 6;
      }
      // Background rect
      const alpha = flash ? 0.5 : 0.3;
      ctx.fillStyle = flash ? `rgba(247,118,142,${alpha})` : `rgba(187,154,247,${alpha})`;
      ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      // Border
      ctx.strokeStyle = flash ? COLORS.red : COLORS.purple;
      ctx.lineWidth = 1;
      ctx.strokeRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      // Text
      ctx.fillStyle = flash ? COLORS.red : COLORS.fgBright;
      ctx.fillText(e.word, e.x, e.y);
      // HP bar for multi-hp enemies
      if (e.maxHp > 1) {
        const barW = e.w - 4;
        const barH = 3;
        const barY = e.y - e.h / 2 - 6;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(e.x - barW / 2, barY, barW, barH);
        ctx.fillStyle = COLORS.green;
        ctx.fillRect(e.x - barW / 2, barY, barW * (e.hp / e.maxHp), barH);
      }
      ctx.restore();
    }

    // Draw particles
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px monospace';
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillText(p.char, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // HUD - Health
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

    // HUD - Score
    ctx.textAlign = 'right';
    ctx.font = '16px monospace';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText(`${state.score}`, W - hudPad, hudPad);

    // Wave intro
    if (state.phase === 'waveIntro') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 32px monospace';
      ctx.shadowColor = COLORS.cyan;
      ctx.shadowBlur = 20;
      ctx.fillStyle = COLORS.cyan;
      ctx.fillText(`WAVE ${state.wave}`, W / 2, H / 2 - 40);
      ctx.shadowBlur = 0;
      ctx.font = '14px monospace';
      ctx.fillStyle = COLORS.fgMuted;
      ctx.fillText('WASD to move  /  SPACE to shoot', W / 2, H / 2 + 10);
    }

    // Game over
    if (state.phase === 'gameOver') {
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
  }

  // Restart on Enter during game over
  function handleRestart(e: KeyboardEvent) {
    if (state.phase === 'gameOver' && e.key === 'Enter') {
      cleanup();
      window.removeEventListener('keydown', handleRestart);
      location.reload();
    }
  }
  window.addEventListener('keydown', handleRestart);

  // ESC to quit
  function handleEsc(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cleanup();
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('keydown', handleRestart);
    }
  }
  window.addEventListener('keydown', handleEsc);

  // Start first wave
  startWave();

  // Game loop
  function loop() {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05); // cap dt
    lastTime = now;
    update(dt, now);
    draw(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
