#!/usr/bin/env node

import { Command } from 'commander';
import { setHumanMode, outputError } from './utils';
import {
  createConfigCommand,
  createWorkflowCommand,
  createExecutionCommand,
  createUserCommand,
  createTagCommand,
  createCredentialCommand,
  createVariableCommand,
  createProjectCommand,
  createAuditCommand,
  createSourceControlCommand,
} from './commands';

const program = new Command();

program
  .name('n8n-open-cli')
  .description(
    'CLI for n8n Public API.\n\n' +
    'Default: AI-friendly mode (structured JSON, no colors, no decorations).\n' +
    'Use --human for human-friendly output (tables, colors, icons).'
  )
  .version('2.0.0')
  .option('--human', 'Enable human-friendly output (tables, colors, icons)')
  .configureHelp({ sortSubcommands: true, sortOptions: true })
  .hook('preAction', (thisCommand) => {
    // Resolve the --human flag from the root command
    const rootOpts = program.opts();
    setHumanMode(!!rootOpts.human);
  });

// Register all subcommands
program.addCommand(createConfigCommand());
program.addCommand(createWorkflowCommand());
program.addCommand(createExecutionCommand());
program.addCommand(createUserCommand());
program.addCommand(createTagCommand());
program.addCommand(createCredentialCommand());
program.addCommand(createVariableCommand());
program.addCommand(createProjectCommand());
program.addCommand(createAuditCommand());
program.addCommand(createSourceControlCommand());

// Global error handling
program.exitOverride();

(async () => {
  try {
    await program.parseAsync(process.argv);
  } catch (err: any) {
    if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
      process.exit(0);
    }
    if (err.code === 'commander.missingArgument' || err.code === 'commander.missingMandatoryOptionValue') {
      process.exit(1);
    }
    // In AI mode, errors go as structured JSON too
    outputError(err.message || String(err));
    process.exit(1);
  }
})();
