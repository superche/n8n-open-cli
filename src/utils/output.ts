import chalk from 'chalk';
import Table from 'cli-table3';
import { ApiResponse } from './api-client';

// ─── Global mode flag ────────────────────────────────────────────────
let _humanMode = false;

export function setHumanMode(enabled: boolean): void {
  _humanMode = enabled;
  if (enabled) {
    // Restore chalk colors for human mode
    chalk.level = 3;
  } else {
    // Disable colors in AI mode — no ANSI escape codes
    chalk.level = 0;
  }
}

export function isHumanMode(): boolean {
  return _humanMode;
}

// ─── Unified output ──────────────────────────────────────────────────

/**
 * The single output function used by ALL commands.
 *
 * AI mode (default): Always emits a single-line JSON to stdout.
 *   { "ok": true, "data": ... }
 *   { "ok": false, "error": "...", "code": 401 }
 *
 * Human mode (--human): Uses tables, colors, and friendly messages.
 */
export function output(response: ApiResponse, opts?: HumanOutputOpts): void {
  if (!_humanMode) {
    // AI mode: deterministic single JSON line
    const obj: Record<string, any> = { ok: response.ok };
    if (response.ok) {
      obj.data = response.data ?? null;
      if (response.nextCursor) obj.nextCursor = response.nextCursor;
    } else {
      obj.error = response.error ?? 'Unknown error';
      if (response.code) obj.code = response.code;
    }
    process.stdout.write(JSON.stringify(obj) + '\n');
    return;
  }

  // Human mode
  if (!response.ok) {
    console.error(chalk.red('✘ ') + (response.error || 'Unknown error'));
    return;
  }

  if (opts?.successMessage && !opts.columns) {
    console.log(chalk.green('✔ ') + opts.successMessage);
    return;
  }

  const data = response.data;
  if (opts?.columns && (Array.isArray(data) || opts.forceTable)) {
    const rows = Array.isArray(data) ? data : [data];
    printTable(rows, opts.columns);
    if (response.nextCursor) {
      console.log(chalk.dim(`\nNext cursor: ${response.nextCursor}`));
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Output for non-API responses (config commands, etc.)
 */
export function outputRaw(data: any): void {
  if (!_humanMode) {
    const obj = { ok: true, data };
    process.stdout.write(JSON.stringify(obj) + '\n');
  } else {
    if (typeof data === 'string') {
      console.log(data);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

export function outputError(message: string, code?: number): void {
  if (!_humanMode) {
    const obj: Record<string, any> = { ok: false, error: message };
    if (code) obj.code = code;
    process.stdout.write(JSON.stringify(obj) + '\n');
  } else {
    console.error(chalk.red('✘ ') + message);
  }
}

// ─── Human-mode helpers ──────────────────────────────────────────────

export interface TableColumn {
  header: string;
  key: string;
  formatter?: (value: any) => string;
  width?: number;
}

export interface HumanOutputOpts {
  columns?: TableColumn[];
  wideColumns?: TableColumn[];
  successMessage?: string;
  forceTable?: boolean;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((cur, key) => cur?.[key], obj);
}

function printTable(data: any[], columns: TableColumn[]): void {
  if (!data || data.length === 0) {
    console.log(chalk.dim('No results found.'));
    return;
  }

  const table = new Table({
    head: columns.map((c) => chalk.cyan(c.header)),
    style: { head: [], border: [] },
    wordWrap: true,
    colWidths: columns.map((c) => c.width || undefined) as any,
  });

  for (const row of data) {
    table.push(
      columns.map((col) => {
        const value = getNestedValue(row, col.key);
        if (col.formatter) return col.formatter(value);
        if (value === null || value === undefined) return chalk.dim('-');
        if (typeof value === 'boolean') return value ? chalk.green('true') : chalk.red('false');
        return String(value);
      })
    );
  }

  console.log(table.toString());
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return _humanMode ? chalk.dim('-') : '-';
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return dateStr;
  }
}

export function formatActive(active: boolean): string {
  if (!_humanMode) return String(active);
  return active ? chalk.green('● active') : chalk.dim('○ inactive');
}

// ─── Field filtering ─────────────────────────────────────────────────

/**
 * Filter object to only include specified fields.
 * Supports nested paths like "workflowData.name".
 */
export function filterFields(data: any, fields: string[]): any {
  if (!fields || fields.length === 0) return data;

  if (Array.isArray(data)) {
    return data.map((item) => pickFields(item, fields));
  }
  return pickFields(data, fields);
}

function pickFields(obj: any, fields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: Record<string, any> = {};
  for (const field of fields) {
    const value = getNestedValue(obj, field);
    if (value !== undefined) {
      result[field] = value;
    }
  }
  return result;
}
