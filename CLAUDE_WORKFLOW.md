# Claude Code Workflow Guide

> How to design, plan, and execute a production app entirely with Claude Code —
> using the **Jira Roadmap Manager** as a working reference.

---

## Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [PRD — What to Build](#2-prd--what-to-build)
3. [Planning — Breaking Work into Tasks](#3-planning--breaking-work-into-tasks)
4. [CLAUDE.md — The Project Constitution](#4-claudemd--the-project-constitution)
5. [Agents & Sub-Agents](#5-agents--sub-agents)
6. [Slash Commands](#6-slash-commands)
7. [Loop Mode — Autonomous Execution](#7-loop-mode--autonomous-execution)
8. [Orchestration Pattern](#8-orchestration-pattern)
9. [Context Window Management](#9-context-window-management)
10. [Model Assignment Policy](#10-model-assignment-policy)
11. [Reference: This Repo](#11-reference-this-repo)

---

## 1. The Big Picture

Claude Code works best when treated like a **senior engineer joining your team** — not
a chatbot you prompt one message at a time. Give it a codebase, a spec, and a task
system, then let it run.

The workflow has three layers:

```
PRD (what to build)
  └── CLAUDE.md (how to build it — permanent rules)
        └── Task files (what to do next — numbered, self-contained)
              └── Agents (who does what — specialized sub-processes)
```

Every layer is a plain markdown file checked into the repo. Claude reads them,
executes, and updates status. You review diffs and unblock when needed.

---

## 2. PRD — What to Build

Before writing a single line of code, write a Product Requirements Document in
plain English. Include:

| Section | What to specify |
|---|---|
| **Problem** | What pain does this solve? For whom? |
| **Scope** | What's in v1? What's explicitly out? |
| **Data model** | Key entities and relationships |
| **User flows** | The 3–5 things a user actually does |
| **Tech constraints** | Stack, licenses, existing infra |
| **Success criteria** | How do you know it works? |

**In this repo:** The PRD lived as a conversation that produced `CLAUDE.md` +
the task files in `tasks/`. The key constraints were:
- React + TypeScript strict, Salt DS, AG Grid **Community** (no Enterprise)
- Jira Cloud via REST proxy — no server, pure browser app
- 5 screens: Dashboard, Roadmap, Sprint Tracking, Slippage, Sprint Reports

**Tip:** Hand the PRD to Claude Opus with the prompt:
> "Read this PRD and produce a CLAUDE.md with tech stack, conventions, and a
> numbered task list in `tasks/TASK_REGISTRY.md`. Each task should be self-contained
> with acceptance criteria."

---

## 3. Planning — Breaking Work into Tasks

### Task Registry

`tasks/TASK_REGISTRY.md` is the single source of truth for what's been done and
what's next. Every task has:

```markdown
| # | Task | Status | Agent | Notes |
|---|------|--------|-------|-------|
| 06 | Roadmap Hierarchy Grid | DONE | ui-developer | Tree grid, slippage colors, CSV export |
| 07 | Sprint Tracking View   | DONE | ui-developer | Team cards, carryover detection |
| 12 | CI/CD & Deployment     | PENDING | architect | — |
```

Statuses: `PENDING` → `IN_PROGRESS` → `DONE` | `BLOCKED`

### Individual Task Files

Each `tasks/NN-name.md` is fully self-contained:

```markdown
# Task 06 — Roadmap Hierarchy Grid

## Goal
Build a collapsible Epic → Story hierarchy in AG Grid with slippage colour coding.

## Inputs
- `src/types/roadmap.types.ts` (Epic, Story, HierarchyNode)
- `src/services/jira.service.ts` (fetchEpics, fetchStories)
- `src/hooks/useRoadmap.ts`

## Outputs
- `src/components/roadmap/RoadmapGrid.tsx`
- `src/pages/RoadmapPage.tsx`

## Acceptance Criteria
- [ ] Tree expands/collapses per epic
- [ ] Slippage severity shown as colour badge
- [ ] CSV export button works
- [ ] TypeScript strict: zero errors
- [ ] `npm run build` passes

## Agent
ui-developer

## Notes
AG Grid tree data is Enterprise-only — use manual expansion state instead.
```

**Why self-contained matters:** Claude's context window is finite. A task file
that lists its own inputs/outputs/AC means Claude never needs to re-read the whole
codebase to know what to do.

---

## 4. CLAUDE.md — The Project Constitution

`CLAUDE.md` is loaded automatically by Claude Code at the start of every session.
It answers: *"What are the permanent rules for this project?"*

### What goes in CLAUDE.md

```markdown
## Tech Stack          — exact versions, no ambiguity
## Model Assignment    — which model for which role
## Open-Source Only    — banned libraries list
## Code Conventions    — TypeScript strict, naming, component patterns
## Git Conventions     — branch naming, commit format, push auth
## Auth Instructions   — how to authenticate to Jira and GitHub
## Architecture        — data flow diagram, key decisions
## Domain Logic        — slippage severity thresholds, sprint report format
```

### What does NOT go in CLAUDE.md

- Task-specific details (those live in `tasks/`)
- Ephemeral state ("currently working on X")
- Code snippets that belong in source files

### Auth instructions (critical)

Always document how to authenticate to every external service. This prevents Claude
from guessing or failing silently. Example from this repo:

```markdown
### GitHub Push Authentication
source .env && git remote set-url origin \
  "https://mkumar5:${GITHUB_TOKEN}@github.com/mkumar5/jira-roadmap-tracker.git"
git push origin main

If push fails 401: token is expired. Regenerate at github.com/settings/tokens
```

---

## 5. Agents & Sub-Agents

Agents are **specialized Claude personas** defined as markdown files in `.claude/agents/`.
Each agent has a name, a description, and a focused system prompt.

### How agents work

When Claude executes a task, it reads the `Agent:` field from the task file and
adopts that agent's persona and constraints. This prevents scope creep — a
`ui-developer` agent won't redesign the service layer; a `tester` agent won't
refactor components.

### Agents in this repo

| Agent file | Role | Use when |
|---|---|---|
| `architect.md` | System design, data models, API contracts | New feature spans multiple layers |
| `ui-developer.md` | React, Salt DS, AG Grid, pages | Building or modifying UI |
| `jira-integrator.md` | Jira API, data transformation, MCP calls | Jira endpoints, field mapping |
| `tester.md` | Vitest, RTL, fixtures, MSW handlers | Writing or fixing tests |
| `reporter.md` | Sprint reports, slippage analysis | Report generation logic |

### Defining an agent

```markdown
---
name: ui-developer
description: Builds React components using Salt DS and AG Grid Community.
             Use for any page, component, or hook work.
---

# UI Developer Agent

You are the UI developer for this project.

## Constraints
- Salt DS tokens only — never hardcode hex colors
- AG Grid Community only — no Enterprise features
- One component per file, named exports match filename
- Props interface named {ComponentName}Props

## How to operate
1. Read the task file fully before writing any code
2. Read existing components in src/components/ to match patterns
3. Write the component, then the hook, then the page
4. Run `npm run type-check` and fix all errors before done
```

### Sub-agents (spawning agents from Claude Code)

In Claude Code CLI, you can spawn a sub-agent using the `Agent` tool. This runs
a focused task in a **separate context window**, protecting the main conversation
from context bloat.

Use sub-agents for:
- Long research tasks (searching many files)
- Parallel independent work (e.g., writing tests for 3 components simultaneously)
- Tasks that read a lot but write little (architecture exploration)

```
Main Claude (Opus) — reads task, plans approach
  └── Sub-agent (Sonnet) — writes the code
  └── Sub-agent (Sonnet) — writes the tests  [parallel]
  └── Sub-agent (Sonnet) — updates TASK_REGISTRY.md
```

---

## 6. Slash Commands

Slash commands in `.claude/commands/` are **reusable prompt templates** you can
invoke with `/command-name` in any Claude Code session.

### Commands in this repo

| Command | File | What it does |
|---|---|---|
| `/sprint-report` | `sprint-report.md` | Generate end-of-sprint status for all teams |
| `/sync-jira` | `sync-jira.md` | Force-refresh all Jira data |
| `/slippage-check` | `slippage-check.md` | Run slippage detection across all initiatives |
| `/build-all` | `build-all.md` | Full build + test + lint validation |

### Defining a slash command

```markdown
# /build-all

Run the full validation suite for this project:

1. `npm run type-check` — TypeScript strict mode, zero errors allowed
2. `npm run lint` — ESLint, zero warnings
3. `npm test -- --run` — all Vitest tests must pass
4. `npm run build` — production build must succeed

Report results in a table. If any step fails, stop and show the exact error.
Do NOT proceed to the next step if a previous one failed.
```

Slash commands are different from agents: agents define *who* Claude is;
commands define *what* Claude should do in one specific invocation.

---

## 7. Loop Mode — Autonomous Execution

Loop mode lets Claude work through the entire task registry autonomously,
stopping only when it needs human input.

### Invoking loop mode

```
/loop
```

Or with an interval:
```
/loop 10m
```

### What Claude does in loop mode

```
1. Read TASK_REGISTRY.md
2. Find next PENDING task
3. Read the task file fully
4. Switch to the correct agent
5. Execute all acceptance criteria
6. Mark task DONE in TASK_REGISTRY.md with a summary
7. Commit the changes
8. Go back to step 1
```

**Loop stops when:**
- A task is `BLOCKED` (needs human input)
- All tasks are `DONE`
- An unrecoverable error occurs

### Designing tasks for loop compatibility

Tasks must be **atomic and verifiable**. Each task should:

1. Have a clear `done` state (acceptance criteria are checkboxes)
2. Not depend on human decisions mid-task
3. Specify which files to read (inputs) and write (outputs)
4. Include a verification step (`npm run build`, `npm test`)

**Anti-pattern:** "Build the whole frontend" — too vague, no clear done state
**Good pattern:** "Build RoadmapGrid component — see task-06.md for AC" — concrete

---

## 8. Orchestration Pattern

This is how Claude Code, agents, loop mode, and MCP servers fit together:

```
┌─────────────────────────────────────────────────────┐
│                   Claude Code CLI                    │
│  (claude command in your terminal)                   │
│                                                      │
│  Reads:  CLAUDE.md, TASK_REGISTRY.md, task files    │
│  Writes: src/, tasks/, git commits                   │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │  Opus 4.6    │    │      Sonnet 4.6           │   │
│  │  (Architect) │    │  (Execution / Coding)     │   │
│  │              │    │                           │   │
│  │  - Plan      │───▶│  - Write code             │   │
│  │  - Design    │    │  - Run commands           │   │
│  │  - Review    │    │  - Edit files             │   │
│  └──────────────┘    │  - Run tests              │   │
│                      └──────────────────────────-┘   │
│                                                      │
│  MCP Servers (configured in .claude/settings.json)  │
│  ├── jira  → Jira Cloud queries, issue inspection   │
│  └── github → PR creation, branch management        │
└─────────────────────────────────────────────────────┘
```

### MCP servers

Model Context Protocol servers extend Claude Code with external tool access.
Configure in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-jira"],
      "env": {
        "JIRA_HOST": "yourorg.atlassian.net",
        "JIRA_EMAIL": "you@example.com",
        "JIRA_API_TOKEN": "your-token"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "your-pat" }
    }
  }
}
```

**When to use MCP vs REST:**
- MCP → exploratory queries, ad-hoc lookups, seeding test data
- REST API (in-app service layer) → production data fetching in the UI

---

## 9. Context Window Management

The context window is the biggest constraint in long Claude Code sessions.
Every file read, every tool output, every response consumes tokens.

### Strategies used in this repo

**1. Self-contained task files**
Each task declares its own inputs/outputs. Claude reads only what the task
needs — not the entire codebase.

**2. Sub-agents for research**
When exploring a large codebase, spawn a sub-agent with `subagent_type: Explore`.
It searches in isolation, returns a summary. The main context only sees the summary.

**3. CLAUDE.md as persistent memory**
Permanent rules live in CLAUDE.md (always loaded). Ephemeral state lives in
the conversation. Don't duplicate.

**4. Claude's auto-memory system**
Claude Code maintains a memory file at `~/.claude/projects/<project>/memory/MEMORY.md`.
Facts worth remembering across sessions (user preferences, project decisions,
auth patterns) are written there automatically.

**5. Task files as conversation checkpoints**
When a session ends (context limit or manual stop), the `TASK_REGISTRY.md`
with `IN_PROGRESS` tasks serves as the resume point. Start the next session with:
> "Read TASK_REGISTRY.md and resume from the current IN_PROGRESS task."

**6. One commit per task**
Commit after each task completes. Git history becomes the audit trail of what
was built and why — reducing the need to re-read code in future sessions.

### Signs you're burning context unnecessarily

- Reading the same file multiple times (cache it mentally, or use a sub-agent)
- Long error traces that don't add new information (summarise them)
- Exploring files not related to the current task
- Printing entire file contents when only a function is needed (use `offset`/`limit`)

---

## 10. Model Assignment Policy

Different models have different strengths and cost profiles. Assign deliberately.

| Role | Model | When |
|---|---|---|
| Planning / Architecture | `claude-opus-4-6` | Reading task files, designing solutions, making architectural decisions |
| Execution / Coding | `claude-sonnet-4-6` | Writing code, running commands, editing files, running tests |
| Quick lookups | `claude-haiku-4-5` | Single-file reads, simple grep searches, status checks |

**In Claude Code CLI:**
```
/model opus    ← before reading task files and planning
/model sonnet  ← before writing code
```

**Rule of thumb:** Opus thinks, Sonnet does. Never use Opus to write boilerplate;
never use Haiku to make architectural decisions.

---

## 11. Reference: This Repo

The Jira Roadmap Manager was built end-to-end using this exact workflow.
Here's how each piece maps:

| Concept | File/Location |
|---|---|
| PRD → CLAUDE.md | `CLAUDE.md` |
| Task registry | `tasks/TASK_REGISTRY.md` |
| Individual tasks | `tasks/01-foundation-setup.md` … `tasks/12-cicd.md` |
| Agents | `.claude/agents/architect.md`, `ui-developer.md`, etc. |
| Slash commands | `.claude/commands/build-all.md`, `sprint-report.md`, etc. |
| MCP config | `.claude/settings.json` |
| Auth pattern | `CLAUDE.md` → *GitHub Push Auth* + *Jira Authentication* sections |
| Persistent memory | `~/.claude/projects/.../memory/MEMORY.md` |
| Proxy config (Jira XSRF fix) | `vite.config.ts` — User-Agent replacement in configure handlers |

### Key lessons from building this repo

1. **XSRF is about User-Agent, not tokens.**
   Jira Cloud returns 403 on POST /search/jql from browsers even with correct auth.
   Fix: replace the UA in the Vite proxy `configure` handler. Document this in CLAUDE.md
   so future sessions don't re-debug it.

2. **Promise.all is fragile across microservices.**
   One failing board fetch kills the entire dashboard. Use `Promise.allSettled`
   when aggregating data from multiple independent sources.

3. **AG Grid React rejects non-JSX cell renderers.**
   `cellRenderer` functions must return JSX or null — never HTML strings or DOM elements.
   Document this as a convention in CLAUDE.md.

4. **Empty strings crash date-fns v4.**
   `parseISO('')` throws. Always guard date utility functions against empty input.
   A two-line guard in the util is cheaper than a debugging session.

5. **Task files are the best form of documentation.**
   After 12 tasks, `TASK_REGISTRY.md` is a complete changelog: what was built,
   when, by which agent, and what edge cases were found. More useful than a wiki.

---

## Quick-Start Checklist for a New Claude Code Project

```
[ ] Write a PRD (even one page is enough)
[ ] Ask Opus to generate CLAUDE.md from the PRD
[ ] Ask Opus to generate tasks/TASK_REGISTRY.md with numbered task files
[ ] Add model assignment policy to CLAUDE.md
[ ] Add auth instructions for every external service to CLAUDE.md
[ ] Create .claude/agents/ for each specialist role
[ ] Create .claude/commands/ for recurring operations (/build-all at minimum)
[ ] Configure MCP servers in .claude/settings.json
[ ] Set git author: git config user.name "Your Name"
[ ] Run /loop — review diffs, unblock BLOCKED tasks, repeat
```

---

*Built with Claude Code — https://claude.ai/claude-code*
