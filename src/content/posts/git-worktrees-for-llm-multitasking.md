---
title: 'Git Worktrees for LLM Multitasking'
date: '2026-03-04'
excerpt: 'A tmux + git worktree workflow that gives each AI coding session its own isolated branch, editor, and terminal — so you can run multiple Claude conversations in parallel without losing context.'
tags: ['developer-tools', 'git', 'tmux', 'ai']
draft: false
---

I've been using Claude Code as my primary coding assistant for a while now. It's good at staying focused on a single task — but real work is rarely a single task. You're halfway through a feature when a bug report lands. You want to prototype something without derailing your current branch. You want three Claude sessions running in parallel, each working on something different.

The problem: switching branches mid-conversation blows up your AI context. The working tree changes, the files Claude was editing are gone or different, and you're starting from scratch. Even if you stash and restore, the LLM has no idea what happened.

I needed a way to give each task its own isolated environment — branch, editor, terminal, and Claude instance — with one command to spin up and one to tear down.

## The setup

The workflow pairs [git worktrees](https://git-scm.com/docs/git-worktree) with [tmux](https://github.com/tmux/tmux) sessions. Each worktree is a full checkout of the repo in a separate directory, sharing the same `.git` store. Each tmux session gets three windows: neovim, Claude Code, and a plain shell.

The commands are built on top of [git-town](https://www.git-town.com/) for stacked branch management. Here's how it works.

### `hack <branch>` — spin up a new task

```bash
hack feat/add-auth
```

This does four things:

1. Creates a stacked branch via `git town append` (so it tracks the parent branch for easy rebasing later)
2. Creates a worktree under `.worktrees/` with a random adjective-animal name (like `bold-falcon`)
3. Symlinks `.claude/` into the worktree so permissions and settings carry over
4. Launches a tmux session with three windows: `nvim`, `claude`, and `zsh`

The branch and worktree setup:

```bash
# Create stacked branch, then return to current branch
git town append "$BRANCH"
git checkout "$CURRENT"

# Generate a random worktree name like "bold-falcon"
ADJECTIVES=(amber bold bright calm clever cool cosmic crisp ...)
ANIMALS=(badger bear cat crane crow deer dolphin eagle ...)
WORKTREE_NAME="${adj}-${animal}"

mkdir -p "$REPO_ROOT/.worktrees"
git worktree add "$REPO_ROOT/.worktrees/$WORKTREE_NAME" "$BRANCH"

# Symlink .claude so the worktree inherits permissions and settings
if [ -d "$REPO_ROOT/.claude" ] && [ ! -e "$WORKTREE_PATH/.claude" ]; then
  ln -s "$REPO_ROOT/.claude" "$WORKTREE_PATH/.claude"
fi
```

The tmux session gets three windows — an editor, a Claude Code instance, and a shell:

```bash
# Name the session <parent>/<branch> for easy identification
PARENT_SESSION=$(tmux display-message -p '#S')
SESSION="${PARENT_SESSION}/${BRANCH}"

tmux new-session -d -s "$SESSION" -n "nvim" -c "$WORKTREE_PATH"
tmux send-keys -t "$SESSION:nvim" "nvim" Enter

tmux new-window -t "$SESSION" -n "claude" -c "$WORKTREE_PATH"
tmux send-keys -t "$SESSION:claude" "claude" Enter

tmux new-window -t "$SESSION" -n "zsh" -c "$WORKTREE_PATH"

tmux select-window -t "$SESSION:nvim"
```

The worktree directory naming is intentionally disconnected from the branch name. Branch names change, get long, and have slashes. A name like `bold-falcon` is easy to type and doesn't collide.

If the branch or worktree already exists, `hack` reuses them and just switches to the session. So it's safe to run repeatedly.

### `hacks` — see what's running

```bash
hacks
```

```
Branch                   Worktree           Session                        Status
------                   --------           -------                        ------
feat/add-auth            bold-falcon        work/feat/add-auth             active
fix/null-pointer         calm-otter         work/fix/null-pointer          active
refactor/api-client      swift-heron        -                              no session
```

Lists all worktrees with their branch, tmux session, and status. Quick way to see what you have going.

### `rehack` — restore after restart

```bash
rehack
```

After a reboot, your tmux sessions are gone but the worktrees survive on disk. `rehack` scans `.worktrees/`, finds any without a tmux session, and recreates the three-window layout for each one:

```bash
for wt_dir in "$WORKTREES_DIR"/*/; do
  wt_dir="${wt_dir%/}"
  [ -d "$wt_dir" ] || continue

  BRANCH=$(find_branch_for_worktree "$wt_dir" || true)

  # Skip worktrees that already have a tmux session
  EXISTING=$(find_sessions_for_worktree "$wt_dir")
  if [ -n "$EXISTING" ]; then
    echo "Skip: $WORKTREE_NAME ($BRANCH) — session already exists"
    continue
  fi

  # Recreate the same 3-window layout as hack
  tmux new-session -d -s "$SESSION" -n "nvim" -c "$wt_dir"
  tmux send-keys -t "$SESSION:nvim" "nvim" Enter
  tmux new-window -t "$SESSION" -n "claude" -c "$wt_dir"
  tmux send-keys -t "$SESSION:claude" "claude" Enter
  tmux new-window -t "$SESSION" -n "zsh" -c "$wt_dir"
done
```

It's idempotent — already-active sessions are skipped. This is the command that makes the whole workflow viable long-term. Without it, a restart would mean manually recreating every session.

### `swap` / `unswap` — for single-instance apps

```bash
swap feat/add-auth
# ... run dev server, test, etc.
unswap
```

Some projects can't run multiple instances — the dev server binds to a fixed port, or there's a lockfile. `swap` temporarily moves a worktree's branch into the main directory:

```bash
# Stash uncommitted changes in both locations
git stash push -m "swap: auto-stash for $MAIN_BRANCH"
git -C "$WORKTREE_PATH" stash push -m "swap: auto-stash for $BRANCH"

# Detach the worktree so the branch is free
git -C "$WORKTREE_PATH" checkout --detach

# Check out the feature branch in main
git checkout "$BRANCH"

# Save state so unswap knows how to reverse everything
cat > "$SWAP_STATE" << EOF
SWAP_BRANCH=$BRANCH
SWAP_WORKTREE_PATH=$WORKTREE_PATH
SWAP_MAIN_BRANCH=$MAIN_BRANCH
SWAP_MAIN_STASH_SHA=$MAIN_STASH_SHA
SWAP_WORKTREE_STASH_SHA=$WORKTREE_STASH_SHA
EOF
```

`unswap` reverses everything: restores the original branch in main, reattaches the worktree, and pops stashes back where they belong. Any new work done in the main directory during the swap gets stashed and transferred to the worktree automatically.

### `unhack <branch>` — clean teardown

```bash
unhack feat/add-auth
```

After a branch is merged:

```bash
# Guard against unhacking a swapped branch
if [ -f "$SWAP_STATE" ]; then
  source "$SWAP_STATE"
  if [ "$SWAP_BRANCH" = "$BRANCH" ]; then
    echo "Error: branch '$BRANCH' is currently swapped into the main directory."
    echo "Run 'unswap' before running 'unhack'."
    exit 1
  fi
fi

# Find and kill tmux sessions associated with this worktree
SESSIONS=$(find_sessions_for_worktree "$WORKTREE_PATH")
while IFS= read -r session; do
  # If we're inside the target session, switch away first
  if [ -n "$TMUX" ]; then
    CURRENT_SESSION=$(tmux display-message -p '#S')
    if [ "$CURRENT_SESSION" = "$session" ]; then
      OTHER=$(tmux list-sessions -F '#S' | grep -v "^${session}$" | head -1)
      tmux switch-client -t "$OTHER"
    fi
  fi
  tmux kill-session -t "$session"
done <<< "$SESSIONS"

# Remove worktree and optionally clean up the branch
git worktree remove "$WORKTREE_PATH"
git merged "$BRANCH"  # rebases children onto main, deletes merged branch
```

The teardown handles edge cases: it switches you out of the session before killing it, and delegates branch cleanup to `git merged` which rebases any child branches onto main before deleting.

## Why this matters for LLM workflows

The real payoff is context isolation for AI coding assistants. Each `hack` session gives Claude Code:

- **Its own working directory** — file edits in one session don't affect another
- **Its own branch** — commits are isolated, no merge conflicts between parallel work
- **Its own conversation** — each Claude instance maintains independent context about what it's working on
- **Instant switching** — `tmux switch-client` is instantaneous, no branch checkout needed

I regularly run three or four Claude sessions in parallel. One is building a feature, another is fixing a bug, a third is writing tests. I check in on each one, give feedback, and move on. The worktree isolation means they never step on each other.

The `rehack` command is especially important here. When you restart your machine, you don't want to re-explain context to every Claude session. The worktrees are intact on disk, so when Claude starts back up in the right directory, it can pick up where it left off (especially with conversation resumption).

## Try it out

The scripts are all in my [dotfiles repo](https://github.com/HoganMcDonald/system_settings) under `roles/zsh/files/bin/`. They're pure bash with no dependencies beyond git, tmux, and git-town.

The core idea is simple: worktrees give you directory-level isolation for free, and tmux gives you session management. The scripts just wire them together with sensible defaults. If you're using an LLM coding assistant and find yourself fighting branch switches, give worktrees a try.
