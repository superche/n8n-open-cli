import { Command } from 'commander';
import { ApiClient, validateConfig, output, outputError } from '../utils';

function requireConfig() {
  const config = validateConfig();
  if (!config) { outputError('Not configured. Run: n8n-open-cli config set --base-url <url> --api-key <key>'); process.exit(1); }
  return config;
}

export function createAuditCommand(): Command {
  const audit = new Command('audit').description('Security audit operations');

  audit.command('generate')
    .description('Generate a security audit report')
    .option('--categories <categories>', 'Comma-separated categories (credentials,database,nodes,filesystem,instance)')
    .option('--days-abandoned-workflows <n>', 'Days to consider a workflow abandoned')
    .action(async (opts) => {
      const config = requireConfig();
      const client = new ApiClient(config);
      const body: Record<string, any> = {};
      if (opts.categories) {
        body.additionalOptions = { categories: opts.categories.split(',').map((c: string) => c.trim()) };
      }
      if (opts.daysAbandonedWorkflows) {
        body.additionalOptions = body.additionalOptions || {};
        body.additionalOptions.daysAbandonedWorkflows = parseInt(opts.daysAbandonedWorkflows, 10);
      }
      const resp = await client.post('/audit', Object.keys(body).length ? body : undefined);
      output(resp);
    });

  return audit;
}
