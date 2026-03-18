# /slippage-check

Run slippage detection across all active initiatives and output a severity-ranked report.

## Steps
1. Use MCP `jira` with JQL: `duedate < now() AND statusCategory not in (Done) AND issuetype in (Initiative, Feature, Epic)`
2. For each result, calculate `slippageSeverity` and `daysPastDue`
3. Group by severity: CRITICAL → HIGH → MEDIUM → LOW
4. Output ranked list with:
   - Issue key + summary
   - Due date → today's date (how many days overdue)
   - Assignee / team
   - Current status
   - Link to Jira issue

## Output
```
=== SLIPPAGE REPORT [{DATE}] ===

🔴 CRITICAL (>14 days overdue): {N} items
  - {KEY}: {summary} | Due: {date} | {N} days overdue | Owner: {name}

🟠 HIGH (8-14 days): {N} items
  ...

🟡 MEDIUM (1-7 days): {N} items
  ...

⚠️  AT RISK (due in next 3 days): {N} items
  ...
```

## Recommended schedule
Run daily via `/loop 24h /slippage-check` for proactive alerting.
