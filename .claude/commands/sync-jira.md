# /sync-jira

Force-refresh all Jira data by invalidating TanStack Query cache and re-fetching.

## Steps
1. Use MCP `jira` to verify connection is alive (fetch one test issue)
2. If connection OK: call the app's `/api/cache/invalidate` endpoint (dev) or
   trigger a browser-side `queryClient.invalidateQueries()` via the debug panel
3. Log what was refreshed and when
4. Report any fetch errors (missing permissions, rate limits)

## Manual fallback (when app is not running)
Use MCP `jira` directly:
```
search_issues(jql: "project in ({PROJECT_KEYS}) AND updated >= -1h ORDER BY updated DESC")
```
This surfaces all recently changed issues for manual review.

## Rate limit awareness
Jira Cloud: 10 requests/second per token. If syncing >500 issues, use batched JQL
with `startAt` pagination and 100ms delay between pages.
