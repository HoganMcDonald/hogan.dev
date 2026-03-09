# hogan.dev

Personal blog built with Astro, TypeScript, and Tailwind CSS.

## Commands

```sh
npm run dev        # Start dev server
npm run build      # Production build (static output)
npx tsc --noEmit   # Type-check (use --skipLibCheck to ignore @types/mdx errors)
```

## Project Structure

```
src/
  content/posts/   # Blog posts (MDX/MD with YAML frontmatter)
  pages/           # Astro page routes
  components/      # Astro components
  layouts/         # Page layouts
  styles/          # Global CSS
  scripts/         # Client-side TypeScript (bullet-hell game, etc.)
```

## Content

Posts use frontmatter: `title`, `date`, `excerpt` (required), `tags`, `draft`, `coverImage` (optional).

## Bullet Hell Game

`src/scripts/bullet-hell.ts` — a canvas-based bullet hell mini-game embedded in blog posts. Architecture uses **data-driven registries** inside a single `startGame()` closure.

### Registries

- **ENHANCEMENT_REGISTRY** — Player bullet enhancements (homing, exploding, radial, orbital, chainLightning, golden, gravityWell, lifeDrain). Each entry defines `onCreate`, `onUpdate`, `onHit`, `onRender` hooks.
- **ATTACK_REGISTRY** — Enemy attack patterns (aimed, radial, laser, mine, spiral, wall). Each entry defines `fire` and optional `bossFire` functions.
- **ENEMY_TYPE_REGISTRY** — Enemy types (normal, splitter, swarm, cloaker). Each entry defines `spawn`, optional `move`, `onKill`, `canBeHit`.

### Adding New Content

**New enhancement**: Call `registerEnhancement({ id, name, abbr, desc, color, baseChance, chancePerLevel, ... })` with behavior hooks. Add the type to the `EnhancementType` union.

**New attack**: Call `registerAttack({ id, unlockWave, label, glowColor, bgColor, fire, ... })`. Add to `EnemyAttack` union. For boss-only, set `bossOnly: true` and add to `BOSS_ATTACKS` array.

**New enemy type**: Call `registerEnemyType({ id, unlockWave, weight, spawn, ... })`. Add to `EnemyType` union.

### Update Loop

`update()` dispatches to focused subsystem functions: `updatePlayerMovement`, `updatePlayerShooting`, `updateSpawning`, `updateBullets`, `updateEnemies`, `updateCollisions`, `updateDecay`, `updateEffects`, `cleanupDead`, `checkWaveComplete`.

### Balance Constants

`src/scripts/bullet-hell-balance.ts` — single `BAL` export (`as const`) containing all gameplay-affecting numbers. Organized into groups: `player`, `wave`, `enemyTiers`, `boss`, `enemyTypes`, `movement`, `enhancements`, `attacks`, `loot`, `shop`, `timing`. To adjust balance, edit values in this file — the game reads all tuning knobs from `BAL.*`. Visual/rendering values (shadow blur, particle colors, font sizes) stay inline in `bullet-hell.ts`.

### Key Design Decisions

- Single file, no module splitting (it's a blog script) — balance constants are the one exception
- All functions share closure scope (no GameContext passing)
- `BOSS_ATTACKS` array is explicit ordering, not derived from registry
- Gravity well pull stays in `updateEnemies()` (cross-cutting concern)
- Boss spawning is explicit (`spawnBoss()`), not through enemy type registry

See `BULLET-HELL-ROADMAP.md` for planned features.
