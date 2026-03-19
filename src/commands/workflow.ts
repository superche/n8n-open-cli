import { Command } from 'commander';
import {
  ApiClient, validateConfig, output, outputError, filterFields,
  formatDate, formatActive, TableColumn,
  buildUpdateDiff, buildDeleteDiff, buildCreateDiff, emitDiff,
} from '../utils';

const columns: TableColumn[] = [
  { header: 'ID', key: 'id' },
  { header: 'Name', key: 'name', width: 40 },
  { header: 'Active', key: 'active', formatter: formatActive },
  { header: 'Created', key: 'createdAt', formatter: formatDate },
  { header: 'Updated', key: 'updatedAt', formatter: formatDate },
];

function rc() {
  const c = validateConfig();
  if (!c) { outputError('Not configured. Run: n8n-open-cli config set --base-url <url> --api-key <key>'); process.exit(1); }
  return c;
}

export function createWorkflowCommand(): Command {
  const wf = new Command('workflow').description('Manage workflows');

  // ── Read-only ─────────────────────────────────────────────────
  wf.command('list').alias('ls')
    .description('Retrieve all workflows')
    .option('--active <bool>', 'Filter by active status')
    .option('--tags <tags>', 'Filter by tag names (comma-separated)')
    .option('--name <name>', 'Filter by workflow name')
    .option('--project-id <id>', 'Filter by project ID')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--limit <n>', 'Results per page', '50')
    .option('--fields <fields>', 'Comma-separated fields to return')
    .action(async (opts) => {
      const client = new ApiClient(rc());
      const resp = await client.get('/workflows', {
        active: opts.active, tags: opts.tags, name: opts.name,
        projectId: opts.projectId, cursor: opts.cursor, limit: opts.limit,
      });
      if (resp.ok && opts.fields) resp.data = filterFields(resp.data, opts.fields.split(','));
      output(resp, { columns });
    });

  wf.command('get <id>')
    .description('Retrieve a workflow by ID')
    .option('--fields <fields>', 'Comma-separated fields to return')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      const resp = await client.get(`/workflows/${id}`);
      if (resp.ok && opts.fields) resp.data = filterFields(resp.data, opts.fields.split(','));
      output(resp);
    });

  wf.command('get-tags <id>')
    .description('Get tags of a workflow')
    .action(async (id) => {
      const client = new ApiClient(rc());
      const resp = await client.get(`/workflows/${id}/tags`);
      output(resp, { columns: [
        { header: 'ID', key: 'id' }, { header: 'Name', key: 'name' },
        { header: 'Created', key: 'createdAt', formatter: formatDate },
      ]});
    });

  // ── Mutations with --dry-run ──────────────────────────────────

  wf.command('create')
    .description('Create a workflow')
    .requiredOption('-f, --file <path>', 'Workflow JSON file path')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (opts) => {
      const fs = await import('fs');
      const body = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
      if (opts.dryRun) {
        emitDiff(buildCreateDiff('workflow', {
          name: body.name, active: body.active ?? false,
          nodeCount: (body.nodes || []).length,
        }));
        return;
      }
      const client = new ApiClient(rc());
      output(await client.post('/workflows', body), { columns, successMessage: 'Workflow created.' });
    });

  wf.command('update <id>')
    .description('Update a workflow')
    .requiredOption('-f, --file <path>', 'Workflow JSON file path')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      const fs = await import('fs');
      const body = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
      if (opts.dryRun) {
        const cur = await client.get(`/workflows/${id}`);
        if (!cur.ok) { output(cur); return; }
        emitDiff(buildUpdateDiff('workflow', id, cur.data, body, ['name', 'active', 'settings', 'tags']));
        return;
      }
      output(await client.put(`/workflows/${id}`, body), { successMessage: `Workflow ${id} updated.` });
    });

  wf.command('delete <id>')
    .description('Delete a workflow')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      if (opts.dryRun) {
        const cur = await client.get(`/workflows/${id}`);
        if (!cur.ok) { output(cur); return; }
        emitDiff(buildDeleteDiff('workflow', id, { id: cur.data.id, name: cur.data.name, active: cur.data.active }));
        return;
      }
      output(await client.delete(`/workflows/${id}`), { successMessage: `Workflow ${id} deleted.` });
    });

  wf.command('activate <id>')
    .description('Activate a workflow')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      if (opts.dryRun) {
        const cur = await client.get(`/workflows/${id}`);
        if (!cur.ok) { output(cur); return; }
        emitDiff(buildUpdateDiff('workflow', id, { active: cur.data.active }, { active: true }, ['active']));
        return;
      }
      output(await client.post(`/workflows/${id}/activate`), { successMessage: `Workflow ${id} activated.` });
    });

  wf.command('deactivate <id>')
    .description('Deactivate a workflow')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      if (opts.dryRun) {
        const cur = await client.get(`/workflows/${id}`);
        if (!cur.ok) { output(cur); return; }
        emitDiff(buildUpdateDiff('workflow', id, { active: cur.data.active }, { active: false }, ['active']));
        return;
      }
      output(await client.post(`/workflows/${id}/deactivate`), { successMessage: `Workflow ${id} deactivated.` });
    });

  wf.command('transfer <id>')
    .description('Transfer a workflow to another project')
    .requiredOption('--destination-project-id <projectId>', 'Destination project ID')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      if (opts.dryRun) {
        const cur = await client.get(`/workflows/${id}`);
        if (!cur.ok) { output(cur); return; }
        const diff = buildUpdateDiff('workflow', id,
          { projectId: cur.data.projectId || '(current)' },
          { projectId: opts.destinationProjectId }, ['projectId']);
        diff.action = 'transfer';
        emitDiff(diff);
        return;
      }
      output(await client.put(`/workflows/${id}/transfer`, { destinationProjectId: opts.destinationProjectId }),
        { successMessage: `Workflow ${id} transferred.` });
    });

  wf.command('set-tags <id>')
    .description('Update tags of a workflow')
    .requiredOption('--tag-ids <ids>', 'Comma-separated tag IDs')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      const newIds = opts.tagIds.split(',').map((s: string) => s.trim());
      if (opts.dryRun) {
        const cur = await client.get(`/workflows/${id}/tags`);
        if (!cur.ok) { output(cur); return; }
        const oldIds = Array.isArray(cur.data) ? cur.data.map((t: any) => t.id) : [];
        emitDiff(buildUpdateDiff('workflow.tags', id, { tagIds: oldIds }, { tagIds: newIds }, ['tagIds']));
        return;
      }
      output(await client.put(`/workflows/${id}/tags`, newIds.map((tid: string) => ({ id: tid }))),
        { successMessage: `Tags updated for workflow ${id}.` });
    });

  return wf;
}
