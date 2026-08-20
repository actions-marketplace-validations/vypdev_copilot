import { Labels } from '../../../model/labels';
import { IssueLabelProvisioningRepository } from '../issue_label_provisioning_repository';

jest.mock('../../../../utils/logger', () => ({
  logDebugInfo: jest.fn(),
  logError: jest.fn(),
}));

function createLabels(overrides: Partial<Record<keyof Labels, string>> = {}): Labels {
  return Object.assign(
    new Labels(
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '',
    ),
    overrides,
  );
}

describe('IssueLabelProvisioningRepository', () => {
  it('provisions configured and progress labels from one complete inventory', async () => {
    const listLabelsForRepo = jest.fn();
    const createLabel = jest.fn().mockResolvedValue({ data: { id: 1 } });
    const iterator = jest.fn(async function* () {
      yield {
        data: [{ name: 'unrelated', color: 'ffffff', description: 'other' }],
      };
      yield {
        data: [{ name: 'EXISTING', color: '000000', description: null }],
      };
    });
    const getClient = jest.fn(() => ({
      paginate: { iterator },
      rest: { issues: { listLabelsForRepo, createLabel } },
    }));
    const repository = new IssueLabelProvisioningRepository({ getClient } as never);
    const labels = createLabels({
      branchManagementLauncherLabel: 'existing',
      bug: 'Existing',
      feature: 'feature',
    });

    await expect(
      repository.ensureInitialLabels('owner', 'repo', labels, 'token'),
    ).resolves.toEqual({
      configured: { created: 1, existing: 1, errors: [] },
      progress: { created: 21, existing: 0, errors: [] },
    });

    expect(iterator).toHaveBeenCalledTimes(1);
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(iterator).toHaveBeenCalledWith(listLabelsForRepo, {
      owner: 'owner',
      repo: 'repo',
      per_page: 100,
    });
    expect(createLabel).toHaveBeenCalledTimes(22);
    expect(createLabel).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'existing' }),
    );
    expect(createLabel).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Existing' }),
    );
  });

  it('maps an already-existing provider race to existing and continues provisioning', async () => {
    const listLabelsForRepo = jest.fn();
    const raceError = Object.assign(new Error('Validation Failed: already exists'), {
      status: 422,
    });
    const createLabel = jest.fn(({ name }: { name: string }) =>
      name === 'feature'
        ? Promise.reject(raceError)
        : Promise.resolve({ data: { id: 1 } }),
    );
    const iterator = jest.fn(async function* () {
      yield { data: [] };
    });
    const repository = new IssueLabelProvisioningRepository({
      getClient: jest.fn(() => ({
        paginate: { iterator },
        rest: { issues: { listLabelsForRepo, createLabel } },
      })),
    } as never);

    await expect(
      repository.ensureInitialLabels(
        'owner',
        'repo',
        createLabels({ feature: 'feature' }),
        'token',
      ),
    ).resolves.toEqual({
      configured: { created: 0, existing: 1, errors: [] },
      progress: { created: 21, existing: 0, errors: [] },
    });
    expect(createLabel).toHaveBeenCalledTimes(22);
  });

  it('aggregates provider errors by category and continues with remaining labels', async () => {
    const listLabelsForRepo = jest.fn();
    const createLabel = jest.fn(({ name }: { name: string }) => {
      if (name === 'bug') return Promise.reject(new Error('bug unavailable'));
      if (name === '10%') return Promise.reject('progress unavailable');
      return Promise.resolve({ data: { id: 1 } });
    });
    const iterator = jest.fn(async function* () {
      yield { data: [] };
    });
    const repository = new IssueLabelProvisioningRepository({
      getClient: jest.fn(() => ({
        paginate: { iterator },
        rest: { issues: { listLabelsForRepo, createLabel } },
      })),
    } as never);

    await expect(
      repository.ensureInitialLabels(
        'owner',
        'repo',
        createLabels({ bug: 'bug', feature: 'feature' }),
        'token',
      ),
    ).resolves.toEqual({
      configured: {
        created: 1,
        existing: 0,
        errors: ['Error creating label "bug": bug unavailable'],
      },
      progress: {
        created: 20,
        existing: 0,
        errors: ['Error creating label "10%": progress unavailable'],
      },
    });
    expect(createLabel).toHaveBeenCalledTimes(23);
  });
});
