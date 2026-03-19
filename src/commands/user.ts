import { Command } from 'commander';
import {
  ApiClient, validateConfig, output, outputError, filterFields,
  formatDate, TableColumn,
  buildCreateDiff, buildDeleteDiff, buildUpdateDiff, emitDiff,
} from '../utils';

const columns: TableColumn[] = [
  { header: 'ID', key: 'id' },
  { header: 'Email', key: 'email', width: 30 },
  { header: 'First Name', key: 'firstName' },
  { header: 'Last Name', key: 'lastName' },
  { header: 'Role', key: 'role' },
  { header: 'Created', key: 'createdAt', formatter: formatDate },
];

function rc() {
  const c = validateConfig();
  if (!c) { outputError('Not configured. Run: n8n-open-cli config set --base-url <url> --api-key <key>'); process.exit(1); }
  return c;
}

export function createUserCommand(): Command {
  const user = new Command('user').description('Manage users');

  user.command('list').alias('ls')
    .description('Retrieve all users')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--limit <n>', 'Results per page', '50')
    .option('--include-role <bool>', 'Include role information')
    .option('--fields <fields>', 'Comma-separated fields to return')
    .action(async (opts) => {
      const client = new ApiClient(rc());
      const resp = await client.get('/users', { cursor: opts.cursor, limit: opts.limit, includeRole: opts.includeRole });
      if (resp.ok && opts.fields) resp.data = filterFields(resp.data, opts.fields.split(','));
      output(resp, { columns });
    });

  user.command('get <id>')
    .description('Get user by ID or email')
    .option('--fields <fields>', 'Comma-separated fields to return')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      const resp = await client.get(`/users/${id}`);
      if (resp.ok && opts.fields) resp.data = filterFields(resp.data, opts.fields.split(','));
      output(resp);
    });

  user.command('create')
    .description('Create/invite multiple users')
    .requiredOption('-f, --file <path>', 'JSON file with user data')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (opts) => {
      const fs = await import('fs');
      const body = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
      if (opts.dryRun) {
        const items = Array.isArray(body) ? body : [body];
        items.forEach((u: any) => emitDiff(buildCreateDiff('user', { email: u.email, role: u.role })));
        return;
      }
      output(await new ApiClient(rc()).post('/users', body), { columns, successMessage: 'Users created.' });
    });

  user.command('delete <id>')
    .description('Delete a user')
    .option('--dry-run', 'Preview deletion without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      if (opts.dryRun) {
        const cur = await client.get(`/users/${id}`);
        if (!cur.ok) { output(cur); return; }
        emitDiff(buildDeleteDiff('user', id, {
          id: cur.data.id, email: cur.data.email, firstName: cur.data.firstName, role: cur.data.role,
        }));
        return;
      }
      output(await client.delete(`/users/${id}`), { successMessage: `User ${id} deleted.` });
    });

  user.command('set-role <id>')
    .description("Change a user's global role")
    .requiredOption('--role <role>', 'New role (e.g., global:admin, global:member)')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (id, opts) => {
      const client = new ApiClient(rc());
      if (opts.dryRun) {
        const cur = await client.get(`/users/${id}`);
        if (!cur.ok) { output(cur); return; }
        emitDiff(buildUpdateDiff('user', id, { role: cur.data.role }, { role: opts.role }, ['role']));
        return;
      }
      output(await client.patch(`/users/${id}/role`, { newRoleName: opts.role }),
        { successMessage: `User ${id} role updated.` });
    });

  return user;
}
