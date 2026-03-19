/**
 * Report export utilities — markdown generation and browser download/clipboard.
 */
import type { SprintReport } from '@/types';
import { sprintReportService } from '@/services/sprint.service';

export function exportReportToMarkdown(report: SprintReport): string {
  return sprintReportService.exportToMarkdown(report);
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function buildReportFilename(report: SprintReport): string {
  const date = new Date(report.generatedAt).toISOString().slice(0, 10);
  const team = report.teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const sprint = report.sprint.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${date}-${team}-${sprint}.md`;
}
