import chalk from 'chalk';
import { isHumanMode } from './output';

export interface DiffEntry {
  field: string;
  before: any;
  after: any;
}

export interface DiffResult {
  resource: string;
  id: string;
  action: string;
  changes: DiffEntry[];
}

/**
 * Compute diff between two objects. Auto-detect changed keys if fields is empty.
 */
export function computeDiff(before: Record<string, any>, after: Record<string, any>, fields?: string[]): DiffEntry[] {
  const keys = fields && fields.length > 0
    ? fields
    : [...new Set([...Object.keys(before), ...Object.keys(after)])];

  const entries: DiffEntry[] = [];
  for (const key of keys) {
    const bStr = JSON.stringify(before[key]);
    const aStr = JSON.stringify(after[key]);
    if (bStr !== aStr) {
      entries.push({ field: key, before: before[key], after: after[key] });
    }
  }
  return entries;
}

export function buildCreateDiff(resource: string, data: Record<string, any>): DiffResult {
  return {
    resource, id: '(new)', action: 'create',
    changes: Object.entries(data).map(([field, value]) => ({ field, before: undefined, after: value })),
  };
}

export function buildDeleteDiff(resource: string, id: string, before: Record<string, any>): DiffResult {
  return {
    resource, id, action: 'delete',
    changes: Object.entries(before).map(([field, value]) => ({ field, before: value, after: undefined })),
  };
}

export function buildUpdateDiff(resource: string, id: string, before: Record<string, any>, after: Record<string, any>, fields?: string[]): DiffResult {
  return { resource, id, action: 'update', changes: computeDiff(before, after, fields) };
}

/**
 * Format diff for output. Returns JSON object (AI mode) or colored string (Human mode).
 */
export function formatDiffForOutput(diff: DiffResult): any {
  if (!isHumanMode()) {
    // AI mode: structured JSON
    return {
      ok: true,
      dryRun: true,
      resource: diff.resource,
      id: diff.id,
      action: diff.action,
      changes: diff.changes.map((c) => ({
        field: c.field,
        before: c.before ?? null,
        after: c.after ?? null,
      })),
    };
  }

  // Human mode: colored diff
  const lines: string[] = [];
  const icon = diff.action === 'delete' ? '🗑 ' : diff.action === 'create' ? '➕' : '✏️ ';
  lines.push(chalk.bold(`\n${icon} ${diff.action.toUpperCase()} ${diff.resource} ${diff.id}`));
  lines.push(chalk.dim('─'.repeat(50)));

  if (diff.changes.length === 0) {
    lines.push(chalk.dim('  (no changes)'));
  } else {
    for (const c of diff.changes) {
      lines.push(chalk.bold(`  ${c.field}:`));
      if (c.before !== undefined) lines.push(chalk.red(`    - ${fmtVal(c.before)}`));
      if (c.after !== undefined) lines.push(chalk.green(`    + ${fmtVal(c.after)}`));
    }
  }

  lines.push(chalk.dim('─'.repeat(50)));
  lines.push(chalk.yellow('  ⚠ Dry run — no changes applied. Remove --dry-run to execute.\n'));
  return lines.join('\n');
}

function fmtVal(val: any): string {
  if (val === undefined || val === null) return '(none)';
  if (typeof val !== 'object') return String(val);
  const s = JSON.stringify(val);
  return s.length > 120 ? s.substring(0, 117) + '...' : s;
}

/**
 * Write formatted diff to stdout.
 */
export function emitDiff(diff: DiffResult): void {
  const formatted = formatDiffForOutput(diff);
  if (isHumanMode()) {
    console.log(formatted);
  } else {
    process.stdout.write(JSON.stringify(formatted) + '\n');
  }
}
