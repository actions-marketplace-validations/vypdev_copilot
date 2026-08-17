export interface GithubErrorShape {
    status?: number;
    message?: string;
}

export const getGithubErrorStatus = (error: unknown): number | undefined => {
    if (typeof error !== "object" || error === null) return undefined;
    const status = (error as GithubErrorShape).status;
    return typeof status === "number" ? status : undefined;
};

export const isGithubNotFound = (error: unknown): boolean => getGithubErrorStatus(error) === 404;

export const isGithubAlreadyExists = (error: unknown): boolean => {
    const shape = typeof error === "object" && error !== null ? (error as GithubErrorShape) : undefined;
    return shape?.status === 422 && shape.message?.toLowerCase().includes("already exists") === true;
};
