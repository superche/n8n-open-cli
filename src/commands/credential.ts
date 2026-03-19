import { Command } from 'commander';
import {
  ApiClient, validateConfig, output, outputError, TableColumn,
  buildCreateDiff, buildDeleteDiff, buildUpdateDiff, emitDiff,
} from '../utils';

const columns: TableColumn[] = [
  { header: 'ID', key: 'id' },
  { header: 'Name', key: 'name', width: 30 },
  { header: 'Type', key: 'type', width: 30 },
];

function rc() {
  const c = validateConfig();
  if (!c) { outputError('Not configured. Run: n8n-open-cli config set --base-url <url> --api-key <key>'); process.exit(1); }
  return c;
}

export function createCredentialCommand(): Command {
  const cred = new Command('credential').description('Manage credentials');

  cred.command('create')
    .description('Create a credential')
    .requiredOption('-f, --file <path>', 'Credential JSON file path')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (opts) => {
      const fs = await import('fs');
      const body = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
      if (opts.dryRun) { emitDiff(buildCreateDiff('credential', { name: body.name, type: body.type })); return; }
      output(await new ApiClient(rc()).post('/credentials', body),
        { columns, successMessage: 'Credential created.' });
    });

  cred.command('delete <id>')
    .description('Delete a credential by ID')
    .option('--dry-run', 'Preview deletion without executing')
    .action(async (id, opts) => {
      if (opts.dryRun) { emitDiff(buildDeleteDiff('credential', id, { id })); return; }
      output(await new ApiClient(rc()).delete(`/credentials/${id}`),
        { successMessage: `Credential ${id} deleted.` });
    });

  cred.command('transfer <id>')
    .description('Transfer a credential to another project')
    .requiredOption('--destination-project-id <projectId>', 'Destination project ID')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (id, opts) => {
      if (opts.dryRun) {
        const d = buildUpdateDiff('credential', id,
          { projectId: '(current)' }, { projectId: opts.destinationProjectId }, ['projectId']);
        d.action = 'transfer';
        emitDiff(d);
        return;
      }
      output(await new ApiClient(rc()).put(`/credentials/${id}/transfer`,
        { destinationProjectId: opts.destinationProjectId }),
        { successMessage: `Credential ${id} transferred.` });
    });

  cred.command('schema <typeName>')
    .description('Show credential data schema for a type')
    .action(async (typeName) => {
      output(await new ApiClient(rc()).get(`/credentials/schema/${typeName}`));
    });

  return cred;
}
