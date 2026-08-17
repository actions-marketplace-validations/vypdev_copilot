export type ActionInputValues = Record<string, unknown>;

/**
 * Resolves one action input without coupling the caller to a specific lifecycle.
 * Explicit runtime parameters always override YAML/environment defaults.
 */
export function resolveActionInput<T>(
    additionalParams: ActionInputValues,
    actionInputs: ActionInputValues,
    key: string,
): T | undefined {
    return (additionalParams[key] ?? actionInputs[key]) as T | undefined;
}
