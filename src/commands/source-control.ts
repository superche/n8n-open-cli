import { Command } from 'commander';
import { ApiClient, validateConfig, output, outputError } from '../utils';

function requireConfig() {
  const config = validateConfig();
  if (!config) { outputError('Not configured. Run: n8n-open-cli config set --base-url <url> --api-key <key>'); process.exit(1); }
  return config;
}

export function createSourceControlCommand(): Command {
  const sc = new Command('source-control').description('Source control operations');

  sc.command('pull')
    .description('Pull changes from the remote repository')
    .option('--force', 'Force pull (overwrite local changes)')
    .action(async (opts) => {
      const config = requireConfig();
      const client = new ApiClient(config);
      const body: Record<string, any> = {};
      if (opts.force) body.force = true;
      const resp = await client.post('/source-control/pull', Object.keys(body).length ? body : undefined);
      output(resp, { successMessage: 'Source control pull completed.' });
    });

  return sc;
}
