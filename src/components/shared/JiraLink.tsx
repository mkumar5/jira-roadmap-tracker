import type { FC } from 'react';
import { Link } from '@salt-ds/core';

interface JiraLinkProps {
  issueKey: string;
  url: string;
  showKey?: boolean;
}

export const JiraLink: FC<JiraLinkProps> = ({ issueKey, url, showKey = true }) => (
  <Link href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${issueKey} in Jira`}>
    {showKey ? issueKey : 'Open in Jira'}
  </Link>
);
