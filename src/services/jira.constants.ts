/**
 * Jira issue type names — verified against connected Jira instance (2026-03-18).
 *
 * INSTANCE: mkumar-personal.atlassian.net / Project: SCRUM (DataEng)
 * PLAN: Standard Jira (not Premium) — hierarchy is Epic → Story/Task → Subtask
 *
 * For production enterprise Jira with Jira Premium/Advanced Roadmaps,
 * Initiative and Feature types would be present. Update these when migrating.
 * Set VITE_HIERARCHY_STRATEGY accordingly:
 *   - Current instance: use 'LABEL_BASED' or 'COMPONENT_BASED'
 *   - Enterprise with Premium: use 'JIRA_PREMIUM'
 */
export const ISSUE_TYPES = {
  INITIATIVE: 'Initiative', // NOT present in current instance — would need Premium
  DELIVERABLE: 'Feature',   // NOT present in current instance — would need Premium
  EPIC: 'Epic',             // ✅ confirmed present (hierarchyLevel=1)
  STORY: 'Story',           // ✅ confirmed present (hierarchyLevel=0)
  TASK: 'Task',             // ✅ confirmed present (hierarchyLevel=0)
  BUG: 'Bug',
  SUBTASK: 'Subtask',       // ✅ confirmed (hierarchyLevel=-1), note: no hyphen
} as const;

/**
 * Jira status category keys — these are stable across Jira instances.
 */
export const STATUS_CATEGORIES = {
  TODO: 'new',
  IN_PROGRESS: 'indeterminate',
  DONE: 'done',
} as const;

/**
 * Custom field IDs — MUST verify against your Jira instance.
 * To find your field IDs:
 *   1. Use MCP: get_issue(issueKey: "ANY-123") and look at the fields object
 *   2. Or: /rest/api/3/field endpoint lists all fields
 *
 * These are the most common defaults for Jira Cloud.
 */
export const CUSTOM_FIELDS = {
  STORY_POINTS: 'story_points', // Some orgs use 'customfield_10016'
  EPIC_LINK: 'customfield_10014', // Legacy epic link (pre Jira Next-gen)
  EPIC_NAME: 'customfield_10011', // Epic name field
  SPRINT: 'customfield_10020', // Sprint field
  INITIATIVE_LINK: 'customfield_10051', // Varies significantly by org
  START_DATE: 'customfield_10015', // Start date (Jira Premium)
  TEAM: 'customfield_10119', // Team field (if using Jira Premium teams)
} as const;

/**
 * Fields to fetch for different query types.
 * Only request what you need — reduces API response size.
 */
export const FIELD_SETS = {
  ROADMAP: [
    'summary',
    'status',
    'assignee',
    'duedate',
    'customfield_10015', // start date
    'issuetype',
    'project',
    'labels',
    'parent',
    'priority',
    'updated',
    'created',
    CUSTOM_FIELDS.STORY_POINTS,
    CUSTOM_FIELDS.SPRINT,
    CUSTOM_FIELDS.INITIATIVE_LINK,
  ],
  SPRINT: [
    'summary',
    'status',
    'assignee',
    'duedate',
    'issuetype',
    'project',
    CUSTOM_FIELDS.STORY_POINTS,
    CUSTOM_FIELDS.SPRINT,
    'parent',
    'priority',
  ],
  SLIPPAGE: [
    'summary',
    'status',
    'assignee',
    'duedate',
    'issuetype',
    'project',
    'labels',
    CUSTOM_FIELDS.STORY_POINTS,
    CUSTOM_FIELDS.SPRINT,
    'parent',
    'updated',
  ],
} as const;

export const PAGINATION = {
  MAX_RESULTS: 100,
  BOARD_MAX: 50,
} as const;

/**
 * Jira Cloud base URL builder
 */
export function jiraIssueUrl(host: string, issueKey: string): string {
  return `https://${host}/browse/${issueKey}`;
}
