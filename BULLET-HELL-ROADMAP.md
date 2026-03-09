# Bullet Hell Roadmap

## New Enemy Types

- [x] **Splitter** — enemies that break into 2-3 smaller, faster enemies on death (like asteroids)
- [ ] **Shielded** — front-facing shield that reflects bullets; must be hit from behind or sides
- [x] **Cloaker** — fades in/out of visibility, only damageable when visible
- [x] **Swarm** — tiny enemies that spawn in packs of 8-10, low HP but fast and erratic
- [ ] **Mimic** — disguises as a loot crate, attacks when the player gets close

## New Attack Patterns

- [x] **Spiral** — boss fires bullets in a rotating spiral pattern (classic bullet hell)
- [x] **Wall** — horizontal line of bullets with a small gap the player must thread through
- [ ] **Boomerang** — projectiles that curve back toward the player after passing
- [ ] **Shotgun** — close-range burst of bullets in a wide cone

## New Enhancements

- [ ] **Pierce** — bullets pass through enemies, hitting multiple in a line
- [ ] **Freeze** — chance to slow enemy movement/attack speed for a few seconds
- [ ] **Ricochet** — bullets bounce off screen edges (1-2 bounces)
- [ ] **Mirror** — spawns a phantom copy of the player that mirrors movement and shoots
- [ ] **Vampiric Burst** — on kill, emit a small healing AoE that also damages nearby enemies
- [ ] **Time Warp** — chance to briefly slow all bullets/enemies in a radius around the player

## Boss Ideas

- [x] **The Paragraph** — a boss made of an entire paragraph from the page, each word is a segment that must be destroyed individually; attacks change as segments are destroyed
- [x] **Echo** — boss that copies and replays the player's movement/shot patterns from 5 seconds ago
- [x] **The Cursor** — boss shaped like a mouse cursor, teleports around erratically, spawns "click" shockwaves

## Progression & Meta

- [x] **Combo system** — kills in quick succession build a multiplier that decays over time
- [x] **Elite enemies** — rare glowing variants with 2x HP, unique modifiers (e.g., "Regenerating", "Bullet Sponge", "Vengeful" — fires a burst on death)
- [x] **Synergy bonuses** — certain enhancement combos unlock bonus effects (e.g., Homing + Chain Lightning = lightning auto-targets, Exploding + Radial = cluster bombs)
- [x] **Challenge waves** — special waves with modifiers like "no shooting for 5s" or "screen is dark except near player"

## Visual / Juice

- [x] **Screen shake** on boss hits and explosions
- [x] **Bullet grazing** — near-miss particles + small point bonus for dodging close
- [x] **Kill streaks** — visual escalation (screen border glow, particle intensity) as combo builds
- [x] **Slow-mo on boss kill** — brief time dilation + dramatic particle burst

## Quality of Life

- [x] **Enhancement reroll** in shop — spend points to swap a crate drop
- [x] **Enhancement sacrifice** — destroy an equipped enhancement for a big point/heal boost
- [x] **Pause menu** with stats (enemies killed, accuracy, time survived)
