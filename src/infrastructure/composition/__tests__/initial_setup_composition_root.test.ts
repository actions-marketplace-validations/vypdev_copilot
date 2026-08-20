const mockComposeInitialSetupUseCase = jest.fn(
  (..._dependencies: unknown[]) => ({ taskId: 'composed' }),
);

jest.mock('../initial_setup_use_case_composition', () => ({
  composeInitialSetupUseCase: (...dependencies: unknown[]) =>
    mockComposeInitialSetupUseCase(...dependencies),
}));

jest.mock('../../../data/repository/issue/issue_label_provisioning_repository', () => ({
  IssueLabelProvisioningRepository: jest.fn().mockImplementation(() => ({
    ensureInitialLabels: jest.fn(),
  })),
}));

jest.mock('../../../data/repository/issue/issue_progress_label_repository', () => ({
  IssueProgressLabelRepository: jest.fn(() => {
    throw new Error('initial setup must not compose progress-label assignment');
  }),
}));

import { createInitialSetupCompositionRoot } from '../initial_setup_composition_root';

describe('initial setup composition root', () => {
  it('injects one initial-label provisioning capability', () => {
    const composed = createInitialSetupCompositionRoot();

    expect(composed).toEqual({ taskId: 'composed' });
    expect(mockComposeInitialSetupUseCase).toHaveBeenCalledTimes(1);
    const dependencies = mockComposeInitialSetupUseCase.mock.calls[0];
    expect(dependencies).toHaveLength(7);
    expect(dependencies[1]).toEqual({
      ensureInitialLabels: expect.any(Function),
    });
  });
});
