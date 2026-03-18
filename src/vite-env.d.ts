/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JIRA_HOST: string;
  readonly VITE_JIRA_EMAIL: string;
  readonly VITE_JIRA_API_TOKEN: string;
  readonly VITE_JIRA_PROJECT_KEYS: string;
  readonly VITE_HIERARCHY_STRATEGY: string;
  readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
