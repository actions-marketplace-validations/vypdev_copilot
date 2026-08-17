import { findPreviousIssueBranch } from '../find_previous_issue_branch';

describe('findPreviousIssueBranch', () => {
    it('returns the first branch matching the configured type priority', () => {
        expect(findPreviousIssueBranch(
            ['bugfix/42-fix', 'feature/42-feature'],
            42,
            ['feature', 'bugfix'],
        )).toBe('feature/42-feature');
    });

    it('returns undefined when no branch belongs to the issue', () => {
        expect(findPreviousIssueBranch(['feature/41-other'], 42, ['feature', 'bugfix'])).toBeUndefined();
    });
});
