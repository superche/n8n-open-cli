import { Command } from 'commander';
import {
  ApiClient, validateConfig, output, outputError, formatDate, TableColumn,
  buildCreateDiff, buildDeleteDiff, buildUpdateDiff, emitDiff,
} from '../utils';

const columns: TableColumn[] = [
  { header: 'ID', key: 'id' },
  { header: 'Name', key: 'name', width: 30 },
  { header: 'Type', key: 'type' },
  { header: 'Created', key: 'createdAt', formatter: formatDate },
  { header: 'Updated', key: 'updatedAt', formatter: formatDate },
];

function rc() {
  const c = validateConfig();
  if (!c) { outputError('Not configured. Run: n8n-open-cli config set --base-url <url> --api-key <key>'); process.exit(1); }
  return c;
}

export function createProjectCommand(): Command {
  const proj = new Command('project').description('Manage projects');

  proj.command('list').alias('ls')
    .description('Retrieve all projects')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--limit <n>', 'Results per page', '50')
    .action(async (opts) => {
      output(await new ApiClient(rc()).get('/projects', { cursor: opts.cursor, limit: opts.limit }), { columns });
    });

  proj.command('create')
    .description('Create a project')
    .requiredOption('--name <name>', 'Project name')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (opts) => {
      if (opts.dryRun) { emitDiff(buildCreateDiff('project', { name: opts.name })); return; }
      output(await new ApiClient(rc()).post('/projects', { name: opts.name }),
        { columns, successMessage: `Project "${opts.name}" created.` });
    });

  proj.command('update <projectId>')
    .description('Update a project')
    .requiredOption('--name <name>', 'New project name')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (projectId, opts) => {
      if (opts.dryRun) {
        // Projects API has no GET single — use list and find
        const client = new ApiClient(rc());
        const listResp = await client.get('/projects');
        const cur = listResp.ok && Array.isArray(listResp.data)
          ? listResp.data.find((p: any) => String(p.id) === String(projectId))
          : null;
        emitDiff(buildUpdateDiff('project', projectId,
          { name: cur?.name || '(unknown)' }, { name: opts.name }, ['name']));
        return;
      }
      output(await new ApiClient(rc()).put(`/projects/${projectId}`, { name: opts.name }),
        { successMessage: `Project ${projectId} updated.` });
    });

  proj.command('delete <projectId>')
    .description('Delete a project')
    .option('--dry-run', 'Preview deletion without executing')
    .action(async (projectId, opts) => {
      if (opts.dryRun) {
        const client = new ApiClient(rc());
        const listResp = await client.get('/projects');
        const cur = listResp.ok && Array.isArray(listResp.data)
          ? listResp.data.find((p: any) => String(p.id) === String(projectId))
          : null;
        emitDiff(buildDeleteDiff('project', projectId, cur ? { id: cur.id, name: cur.name } : { id: projectId }));
        return;
      }
      output(await new ApiClient(rc()).delete(`/projects/${projectId}`),
        { successMessage: `Project ${projectId} deleted.` });
    });

  proj.command('add-user <projectId>')
    .description('Add users to a project')
    .requiredOption('-f, --file <path>', 'JSON file with [{userId, role}]')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (projectId, opts) => {
      const fs = await import('fs');
      const body = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
      if (opts.dryRun) {
        const items = Array.isArray(body) ? body : [body];
        items.forEach((u: any) => emitDiff(buildCreateDiff(`project(${projectId}).user`, { userId: u.userId, role: u.role })));
        return;
      }
      output(await new ApiClient(rc()).post(`/projects/${projectId}/users`, body),
        { successMessage: `Users added to project ${projectId}.` });
    });

  proj.command('remove-user <projectId> <userId>')
    .description('Remove a user from a project')
    .option('--dry-run', 'Preview deletion without executing')
    .action(async (projectId, userId, opts) => {
      if (opts.dryRun) {
        emitDiff(buildDeleteDiff(`project(${projectId}).user`, userId, { userId }));
        return;
      }
      output(await new ApiClient(rc()).delete(`/projects/${projectId}/users/${userId}`),
        { successMessage: `User ${userId} removed from project ${projectId}.` });
    });

  proj.command('set-user-role <projectId> <userId>')
    .description("Change a user's role in a project")
    .requiredOption('--role <role>', 'New role')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (projectId, userId, opts) => {
      if (opts.dryRun) {
        emitDiff(buildUpdateDiff(`project(${projectId}).user`, userId,
          { role: '(current)' }, { role: opts.role }, ['role']));
        return;
      }
      output(await new ApiClient(rc()).patch(`/projects/${projectId}/users/${userId}`, { role: opts.role }),
        { successMessage: `User ${userId} role updated in project ${projectId}.` });
    });

  return proj;
}
