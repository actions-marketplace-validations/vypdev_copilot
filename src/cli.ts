#!/usr/bin/env node

import * as dotenv from 'dotenv';
import { Command } from 'commander';
import { registerThinkCommand } from './cli/commands/think';
import { registerDoCommand } from './cli/commands/do';
import { registerCheckProgressCommand } from './cli/commands/check_progress';
import { registerRecommendStepsCommand } from './cli/commands/recommend_steps';
import { registerDetectPotentialProblemsCommand } from './cli/commands/detect_potential_problems';
import { registerSetupCommand } from './cli/commands/setup';

dotenv.config();

const program = new Command();
registerThinkCommand(program);
registerDoCommand(program);
registerCheckProgressCommand(program);
registerRecommendStepsCommand(program);
registerDetectPotentialProblemsCommand(program);
registerSetupCommand(program);

if (typeof process.env.JEST_WORKER_ID === 'undefined') {
  program.parse(process.argv);
}

export { program };
