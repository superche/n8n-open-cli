import { Command } from 'commander';
import { setConfig, clearConfig, getConfig, getConfigPath, outputRaw, outputError, isHumanMode } from '../utils';
import chalk from 'chalk';

export function createConfigCommand(): Command {
  const config = new Command('config').description('Manage CLI configuration');

  config
    .command('set')
    .description('Set n8n instance configuration')
    .requiredOption('--base-url <url>', 'n8n instance base URL')
    .requiredOption('--api-key <key>', 'n8n API key')
    .action((opts) => {
      setConfig(opts.baseUrl, opts.apiKey);

      if (isHumanMode()) {
        console.log(chalk.green('✔') + ' Configuration saved.');
        console.log(chalk.dim(`  Base URL: ${opts.baseUrl}`));
        console.log(chalk.dim(`  API Key:  ${opts.apiKey.substring(0, 8)}...`));
        console.log(chalk.dim(`  Path:     ${getConfigPath()}`));
      } else {
        outputRaw({
          action: 'config.set',
          baseUrl: opts.baseUrl,
          apiKeyPrefix: opts.apiKey.substring(0, 8),
          configPath: getConfigPath(),
        });
      }
    });

  config
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const { baseUrl, apiKey } = getConfig();
      const data = {
        baseUrl: baseUrl || null,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 8) : null,
        configPath: getConfigPath(),
        envOverrides: {
          N8N_BASE_URL: process.env.N8N_BASE_URL || null,
          N8N_API_KEY: process.env.N8N_API_KEY ? process.env.N8N_API_KEY.substring(0, 8) + '...' : null,
        },
      };

      if (isHumanMode()) {
        console.log(chalk.bold('Current Configuration:'));
        console.log(`  Base URL:    ${baseUrl ? chalk.green(baseUrl) : chalk.red('(not set)')}`);
        console.log(`  API Key:     ${apiKey ? chalk.green(apiKey.substring(0, 8) + '...') : chalk.red('(not set)')}`);
        console.log(`  Config Path: ${chalk.dim(getConfigPath())}`);
        if (process.env.N8N_BASE_URL || process.env.N8N_API_KEY) {
          console.log(chalk.yellow('\n  Env overrides active:'));
          if (process.env.N8N_BASE_URL) console.log(`    N8N_BASE_URL = ${process.env.N8N_BASE_URL}`);
          if (process.env.N8N_API_KEY) console.log(`    N8N_API_KEY  = ${process.env.N8N_API_KEY.substring(0, 8)}...`);
        }
      } else {
        outputRaw(data);
      }
    });

  config
    .command('clear')
    .description('Clear stored configuration')
    .action(() => {
      clearConfig();
      if (isHumanMode()) {
        console.log(chalk.green('✔') + ' Configuration cleared.');
      } else {
        outputRaw({ action: 'config.clear' });
      }
    });

  return config;
}
