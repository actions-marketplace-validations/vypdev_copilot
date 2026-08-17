import { Labels } from '../../data/model/labels';

export interface RequiredLabel {
    name: string;
    color: string;
    description: string;
}

export function getRequiredLabels(labels: Labels): RequiredLabel[] {
    return [
        ['branchManagementLauncherLabel', '0E8A16', 'Label to trigger branch management actions'],
        ['bug', 'D73A4A', 'Label to indicate a bug type'],
        ['bugfix', 'D73A4A', 'Label to manage bugfix branches'],
        ['hotfix', 'B60205', 'Label to manage hotfix branches'],
        ['enhancement', 'A2EEEF', 'Label to indicate an enhancement type'],
        ['feature', '0E8A16', 'Label to manage feature branches'],
        ['release', '1D76DB', 'Label to manage release branches'],
        ['question', 'CC317C', 'Label to detect issues marked as questions'],
        ['help', 'CC317C', 'Label to detect help request issues'],
        ['deploy', '7057FF', 'Label to detect deploy actions'],
        ['deployed', '0E8A16', 'Label to detect the deployed status'],
        ['docs', 'C5DEF5', 'Label to manage docs branches'],
        ['documentation', 'C5DEF5', 'Label to manage documentation branches'],
        ['chore', '5319E7', 'Label to manage chore branches'],
        ['maintenance', '5319E7', 'Label to manage maintenance branches'],
        ['priorityHigh', 'B60205', 'Label to indicate a priority high'],
        ['priorityMedium', 'FBBD0C', 'Label to indicate a priority medium'],
        ['priorityLow', '0E8A16', 'Label to indicate a priority low'],
        ['priorityNone', 'B4B4B4', 'Label to indicate no priority'],
        ['sizeXxl', '8E44AD', 'Label to indicate a task of size XXL'],
        ['sizeXl', '9B59B6', 'Label to indicate a task of size XL'],
        ['sizeL', '3498DB', 'Label to indicate a task of size L'],
        ['sizeM', '1ABC9C', 'Label to indicate a task of size M'],
        ['sizeS', 'F39C12', 'Label to indicate a task of size S'],
        ['sizeXs', 'E67E22', 'Label to indicate a task of size XS'],
    ].map(([key, color, description]) => ({
        name: labels[key as keyof Labels] as string,
        color,
        description,
    })).filter(label => label.name?.trim());
}
