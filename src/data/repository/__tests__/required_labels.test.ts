import { Labels } from '../../model/labels';
import { getRequiredLabels } from '../required_labels';

describe('getRequiredLabels', () => {
    it('maps configured labels to their creation metadata', () => {
        const labels = new Labels(
            'branched', 'bug', 'bugfix', 'hotfix', 'enhancement', 'feature', 'release', 'question', 'help',
            'deploy', 'deployed', 'docs', 'documentation', 'chore', 'maintenance', 'p0', 'p1', 'p2', 'none',
            'xxl', 'xl', 'l', 'm', 's', 'xs',
        );

        const result = getRequiredLabels(labels);

        expect(result).toHaveLength(25);
        expect(result[0]).toEqual({
            name: 'branched', color: '0E8A16', description: 'Label to trigger branch management actions',
        });
    });

    it('omits empty configured labels', () => {
        const labels = new Labels(
            'branched', 'bug', 'bugfix', 'hotfix', 'enhancement', '', 'release', 'question', 'help',
            'deploy', 'deployed', 'docs', 'documentation', 'chore', 'maintenance', 'p0', 'p1', 'p2', 'none',
            'xxl', 'xl', 'l', 'm', 's', 'xs',
        );
        expect(getRequiredLabels(labels).some(label => label.name === '')).toBe(false);
    });
});
