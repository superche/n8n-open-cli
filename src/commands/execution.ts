import { Command } from 'commander';
import {
  ApiClient, validateConfig, output, outputError, filterFields,
  formatDate, TableColumn, buildDeleteDiff, emitDiff,
} from '../utils';

const columns: TableColumn[] = [
  { header: 'ID', key: 'id' },
  { header: 'Workflow ID', key: 'workflowId' },
  { header: 'Status', key: 'status' },
  { header: 'Finished', key: 'finished', formatter: (v) => (v ? 'Yes' : 'No') },
  { header: 'Started At', key: 'startedAt', formatter: formatDate },
  { header: 'Stopped At', key: 'stoppedAt', formatter: formatDate },
];

function rc() {
  const c = validateConfig();
  if (!c) { outputError('Not configured. Run: n8n-open-cli config set --base-url <url> --api-key <key>'); process.exit(1); }
  return c;
}

export function createExecutionCommand(): Command {
  const exec = new Command('execution').description('Manage executions');

  exec.command('list').alias('ls')
    .description('Retrieve all executions')
    .option('--workflow-id <id>', 'Filter by workflow ID')
    .option('--status <status>', 'Filter by status (error, success, waiting)')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--limit <n>', 'Results per page', '20')
    .option('--fields <fields>', 'Comma-separated fields to return')
    .action(async (opts) => {
      const client = new ApiClient(rc());
      const resp = await client.get('/executions', {
        workflowId: opts.workflowId, status: opts.status,
        cursor: opts.cursor, limit: opts.limit,
      });
      if (resp.ok && opts.fields) resp.data = filterFields(resp.data, opts.fields.split(','));
      output(resp, { columns });
    });

  exec.command('get <id>')
    .description('Retrieve an execution by ID')
    .option('--include-data', 'Include execution data')
    .option('--fields <fields>', 'Comma-separated fields to return')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      const resp = await client.get(`/executions/${id}`, { includeData: opts.includeData ? 'true' : undefined });
      if (resp.ok && opts.fields) resp.data = filterFields(resp.data, opts.fields.split(','));
      output(resp);
    });

  exec.command('delete <id>')
    .description('Delete an execution')
    .option('--dry-run', 'Preview deletion without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      if (opts.dryRun) {
        const cur = await client.get(`/executions/${id}`);
        if (!cur.ok) { output(cur); return; }
        emitDiff(buildDeleteDiff('execution', id, {
          id: cur.data.id, workflowId: cur.data.workflowId, status: cur.data.status,
        }));
        return;
      }
      output(await client.delete(`/executions/${id}`), { successMessage: `Execution ${id} deleted.` });
    });

  return exec;
}
