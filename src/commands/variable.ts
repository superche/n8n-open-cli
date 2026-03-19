import { Command } from 'commander';
import {
  ApiClient, validateConfig, output, outputError, filterFields, TableColumn,
  buildCreateDiff, buildDeleteDiff, buildUpdateDiff, emitDiff,
} from '../utils';

const columns: TableColumn[] = [
  { header: 'ID', key: 'id' },
  { header: 'Key', key: 'key', width: 30 },
  { header: 'Value', key: 'value', width: 40 },
  { header: 'Type', key: 'type' },
];

function rc() {
  const c = validateConfig();
  if (!c) { outputError('Not configured. Run: n8n-open-cli config set --base-url <url> --api-key <key>'); process.exit(1); }
  return c;
}

/** Helper: find a variable by id from the list endpoint (no GET single). */
async function findVariable(client: ApiClient, id: string): Promise<any | null> {
  const resp = await client.get('/variables');
  if (!resp.ok || !Array.isArray(resp.data)) return null;
  return resp.data.find((v: any) => String(v.id) === String(id)) || null;
}

export function createVariableCommand(): Command {
  const v = new Command('variable').description('Manage variables');

  v.command('list').alias('ls')
    .description('Retrieve all variables')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--limit <n>', 'Results per page', '50')
    .option('--fields <fields>', 'Comma-separated fields to return')
    .action(async (opts) => {
      const client = new ApiClient(rc());
      const resp = await client.get('/variables', { cursor: opts.cursor, limit: opts.limit });
      if (resp.ok && opts.fields) resp.data = filterFields(resp.data, opts.fields.split(','));
      output(resp, { columns });
    });

  v.command('create')
    .description('Create a variable')
    .requiredOption('--key <key>', 'Variable key')
    .requiredOption('--value <value>', 'Variable value')
    .option('--type <type>', 'Variable type', 'string')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (opts) => {
      if (opts.dryRun) {
        emitDiff(buildCreateDiff('variable', { key: opts.key, value: opts.value, type: opts.type }));
        return;
      }
      output(await new ApiClient(rc()).post('/variables', { key: opts.key, value: opts.value, type: opts.type }),
        { columns, successMessage: `Variable "${opts.key}" created.` });
    });

  v.command('update <id>')
    .description('Update a variable')
    .option('--key <key>', 'New key')
    .option('--value <value>', 'New value')
    .option('--type <type>', 'New type')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (id, opts) => {
      const newBody: Record<string, string> = {};
      if (opts.key) newBody.key = opts.key;
      if (opts.value) newBody.value = opts.value;
      if (opts.type) newBody.type = opts.type;

      const client = new ApiClient(rc());
      if (opts.dryRun) {
        const cur = await findVariable(client, id);
        const before = cur ? { key: cur.key, value: cur.value, type: cur.type } : { key: '?', value: '?', type: '?' };
        emitDiff(buildUpdateDiff('variable', id, before, { ...before, ...newBody }, Object.keys(newBody)));
        return;
      }
      output(await client.put(`/variables/${id}`, newBody), { successMessage: `Variable ${id} updated.` });
    });

  v.command('delete <id>')
    .description('Delete a variable')
    .option('--dry-run', 'Preview deletion without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      if (opts.dryRun) {
        const cur = await findVariable(client, id);
        emitDiff(buildDeleteDiff('variable', id, cur ? { id: cur.id, key: cur.key, value: cur.value } : { id }));
        return;
      }
      output(await client.delete(`/variables/${id}`), { successMessage: `Variable ${id} deleted.` });
    });

  return v;
}
