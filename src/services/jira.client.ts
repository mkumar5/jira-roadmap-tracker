import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { JiraSearchResponse, JiraIssue } from '@/types';
import { PAGINATION } from './jira.constants';

const JIRA_EMAIL = import.meta.env.VITE_JIRA_EMAIL as string | undefined;
const JIRA_API_TOKEN = import.meta.env.VITE_JIRA_API_TOKEN as string | undefined;

function getCredentials(): string {
  // Runtime credentials may come from localStorage (Settings page) or env vars.
  // Use || (not ??) so empty strings fall through to env var fallback.
  try {
    const stored = localStorage.getItem('jira-roadmap-config');
    if (stored) {
      const parsed = JSON.parse(stored) as {
        state?: { jiraEmail?: string; jiraApiToken?: string };
      };
      const email = parsed.state?.jiraEmail || JIRA_EMAIL || '';
      const token = parsed.state?.jiraApiToken || JIRA_API_TOKEN || '';
      if (import.meta.env.DEV) {
        console.warn('[Jira Auth] using email:', email ? email.slice(0, 4) + '***' : '(empty)');
      }
      return btoa(`${email}:${token}`);
    }
  } catch {
    // localStorage unavailable or corrupt — fall through to env vars
  }
  return btoa(`${JIRA_EMAIL || ''}:${JIRA_API_TOKEN || ''}`);
}

// Primary Jira REST API v3 client (proxied via Vite dev server)
export const jiraClient: AxiosInstance = axios.create({
  baseURL: '/api/jira',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 20000,
});

// Jira Agile REST API client (for boards and sprints)
export const jiraAgileClient: AxiosInstance = axios.create({
  baseURL: '/api/jira/agile',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 20000,
});

// Add auth header dynamically (picks up Settings page changes without reload)
[jiraClient, jiraAgileClient].forEach((client) => {
  client.interceptors.request.use((config) => {
    config.headers['Authorization'] = `Basic ${getCredentials()}`;
    if (import.meta.env.DEV) {
      const jql = (config.params as Record<string, string> | undefined)?.['jql'];
      if (jql) console.warn('[Jira JQL]', jql);
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const method = error.config?.method?.toUpperCase();
        const url = (error.config?.baseURL ?? '') + (error.config?.url ?? '');
        const responseBody = error.response?.data as Record<string, unknown> | string | undefined;
        const jiraMsg = typeof responseBody === 'object'
          ? ((responseBody?.['message'] as string | undefined) ?? (responseBody?.['errorMessages'] as string[] | undefined)?.[0] ?? JSON.stringify(responseBody))
          : String(responseBody ?? '');
        console.error(`[Jira ${status}] ${method} ${url}`, { jiraMsg, responseBody });
        if (status === 401)
          throw new Error(`JIRA_AUTH_ERROR: Invalid credentials (${method} ${url}). Check Settings.`);
        if (status === 403)
          throw new Error(`JIRA_PERMISSION_ERROR: 403 on ${method} ${url} — ${jiraMsg || 'no body'}. Check project permissions.`);
        if (status === 429)
          throw new Error('JIRA_RATE_LIMIT: Too many requests. Will retry automatically.');
        if (status === 404) throw new Error(`JIRA_NOT_FOUND: ${method} ${url} not found.`);
      }
      throw error;
    }
  );
});

/**
 * Paginate through all Jira search results using POST /search/jql.
 * Sends X-Atlassian-Token: no-check to bypass Jira Cloud's XSRF check on POST requests.
 * Jira Cloud caps at 100 per page — this fetches all pages automatically.
 */
export async function paginateJiraSearch<T>(
  jql: string,
  fields: readonly string[],
  transform: (issue: JiraIssue) => T
): Promise<T[]> {
  const allItems: T[] = [];
  let nextPageToken: string | undefined;

  while (true) {
    const body: Record<string, unknown> = {
      jql,
      fields: [...fields],
      maxResults: PAGINATION.MAX_RESULTS,
    };
    if (nextPageToken) body['nextPageToken'] = nextPageToken;

    const { data } = await jiraClient.post<JiraSearchResponse>('/search/jql', body, {
      headers: { 'X-Atlassian-Token': 'no-check' },
    });
    allItems.push(...data.issues.map(transform));

    if (data.isLast || !data.nextPageToken || data.issues.length === 0) break;
    nextPageToken = data.nextPageToken;
  }

  return allItems;
}
