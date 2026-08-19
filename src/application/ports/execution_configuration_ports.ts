import type { Config } from '../../data/model/config';
import type { Execution } from '../../data/model/execution';

export interface ExecutionConfigurationPort {
    get(execution: Execution): Promise<Config | undefined>;
}
