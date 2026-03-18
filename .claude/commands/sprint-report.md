# /sprint-report

Generate an end-of-sprint status report for all active teams.

## Steps
1. Switch to the **reporter** sub-agent (`@reporter`)
2. Use MCP `jira` to fetch all boards and their most recently closed sprint
3. For each sprint/team, generate a `SprintReport` per the reporter agent spec
4. Aggregate into an `ExecutiveSummary`
5. Output:
   - Markdown summary to terminal (copy-paste ready)
   - Update `src/data/latest-sprint-report.json` with raw JSON
   - Log any items that are BLOCKED from fetching (permission errors)

## Output format
Print to terminal:
```
=== SPRINT REPORT [{DATE}] ===

EXECUTIVE HEALTH: {score}/100
ON TRACK: {N} | AT RISK: {N} | SLIPPED: {N}

--- Team: {TEAM_NAME} | Sprint {N} ---
DELIVERED: {count} stories ({points} pts)
CARRIED OVER: {count} stories
NEXT SPRINT: {count} committed
SLIPPED EPICS: {list}

[Markdown export saved to: sprint-reports/{date}-report.md]
```

## When to run
- End of every 2-week sprint (set up with `/loop 2w /sprint-report`)
- On demand for management updates
- Before quarterly planning sessions
