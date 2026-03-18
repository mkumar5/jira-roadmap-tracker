import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { JiraSearchResponse, JiraIssue } from '@/types';
import { PAGINATION } from './jira.constants';

const JIRA_EMAIL = import.meta.env.VITE_JIRA_EMAIL as string | undefined;
const JIRA_API_TOKEN = import.meta.env.VITE_JIRA_API_TOKEN as string | undefined;

function getCredentials(): string {
  // Runtime credentials may come from localStorage (Settings page) or env vars
  const stored = localStorage.getItem('jira-roadmap-config');
  if (stored) {
    const parsed = JSON.parse(stored) as {
      state?: { jiraEmail?: string; jiraApiToken?: string };
    };
    const email = parsed.state?.jiraEmail ?? JIRA_EMAIL ?? '';
    const token = parsed.state?.jiraApiToken ?? JIRA_API_TOKEN ?? '';
    return btoa(`${email}:${token}`);
  }
  return btoa(`${JIRA_EMAIL ?? ''}:${JIRA_API_TOKEN ?? ''}`);
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
        if (status === 401)
          throw new Error('JIRA_AUTH_ERROR: Invalid credentials. Check Settings.');
        if (status === 403)
          throw new Error('JIRA_PERMISSION_ERROR: Access denied. Check project permissions.');
        if (status === 429)
          throw new Error('JIRA_RATE_LIMIT: Too many requests. Will retry automatically.');
        if (status === 404) throw new Error('JIRA_NOT_FOUND: Resource not found.');
      }
      throw error;
    }
  );
});

/**
 * Paginate through all Jira search results.
 * Jira Cloud caps at 100 per page — this fetches all pages automatically.
 */
export async function paginateJiraSearch<T>(
  jql: string,
  fields: readonly string[],
  transform: (issue: JiraIssue) => T
): Promise<T[]> {
  const allItems: T[] = [];
  let startAt = 0;
  let total = Infinity;

  while (startAt < total) {
    const { data } = await jiraClient.get<JiraSearchResponse>('/search', {
      params: {
        jql,
        fields: fields.join(','),
        startAt,
        maxResults: PAGINATION.MAX_RESULTS,
      },
    });
    total = data.total;
    const transformed = data.issues.map(transform);
    allItems.push(...transformed);
    startAt += data.issues.length;
    if (data.issues.length === 0) break;
  }

  return allItems;
}
