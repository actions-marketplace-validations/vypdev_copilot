export interface OpenCodeModelReference {
    providerId: string;
    modelId: string;
}

export function resolveOpenCodeModelReference(modelReference: string): OpenCodeModelReference {
    const normalized = modelReference.trim();
    const separator = normalized.indexOf('/');
    const providerId = separator > 0 ? normalized.slice(0, separator) : 'opencode';
    const modelId = separator > 0 ? normalized.slice(separator + 1).trim() : normalized;

    if (!modelId) {
        throw new Error('OpenCode model must use provider/model format.');
    }

    return { providerId, modelId };
}
