import { Command } from 'commander';
import {
  ApiClient, validateConfig, output, outputError, formatDate, TableColumn,
  buildCreateDiff, buildDeleteDiff, buildUpdateDiff, emitDiff,
} from '../utils';

const columns: TableColumn[] = [
  { header: 'ID', key: 'id' },
  { header: 'Name', key: 'name', width: 30 },
  { header: 'Created', key: 'createdAt', formatter: formatDate },
  { header: 'Updated', key: 'updatedAt', formatter: formatDate },
];

function rc() {
  const c = validateConfig();
  if (!c) { outputError('Not configured. Run: n8n-open-cli config set --base-url <url> --api-key <key>'); process.exit(1); }
  return c;
}

export function createTagCommand(): Command {
  const tag = new Command('tag').description('Manage tags');

  tag.command('list').alias('ls')
    .description('Retrieve all tags')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--limit <n>', 'Results per page', '50')
    .action(async (opts) => {
      const client = new ApiClient(rc());
      output(await client.get('/tags', { cursor: opts.cursor, limit: opts.limit }), { columns });
    });

  tag.command('get <id>')
    .description('Retrieve a tag by ID')
    .action(async (id) => {
      output(await new ApiClient(rc()).get(`/tags/${id}`));
    });

  tag.command('create')
    .description('Create a tag')
    .requiredOption('--name <name>', 'Tag name')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (opts) => {
      if (opts.dryRun) { emitDiff(buildCreateDiff('tag', { name: opts.name })); return; }
      output(await new ApiClient(rc()).post('/tags', { name: opts.name }),
        { columns, successMessage: `Tag "${opts.name}" created.` });
    });

  tag.command('update <id>')
    .description('Update a tag')
    .requiredOption('--name <name>', 'New tag name')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      if (opts.dryRun) {
        const cur = await client.get(`/tags/${id}`);
        if (!cur.ok) { output(cur); return; }
        emitDiff(buildUpdateDiff('tag', id, { name: cur.data.name }, { name: opts.name }, ['name']));
        return;
      }
      output(await client.put(`/tags/${id}`, { name: opts.name }), { successMessage: `Tag ${id} updated.` });
    });

  tag.command('delete <id>')
    .description('Delete a tag')
    .option('--dry-run', 'Preview deletion without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      if (opts.dryRun) {
        const cur = await client.get(`/tags/${id}`);
        if (!cur.ok) { output(cur); return; }
        emitDiff(buildDeleteDiff('tag', id, { id: cur.data.id, name: cur.data.name }));
        return;
      }
      output(await client.delete(`/tags/${id}`), { successMessage: `Tag ${id} deleted.` });
    });

  return tag;
}
