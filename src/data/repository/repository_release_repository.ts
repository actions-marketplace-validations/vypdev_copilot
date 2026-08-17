import * as github from "@actions/github";
import { logDebugInfo, logError, logInfo } from "../../utils/logger";
import { hasReleaseContent, releasePayload } from "./release_content_policy";
import { findTargetRelease, releaseIdAsString } from "./release_transition_policy";
import { releaseName, tagReference, tagReferencePath } from "./release_tag_policy";
import type { RepositoryReleasePort } from "../../application/ports/repository_release_ports";

/** Adapter for GitHub repository tags, releases, and default-branch metadata. */
export class RepositoryReleaseRepository implements RepositoryReleasePort {
    private findTag = async (
        owner: string,
        repository: string,
        tag: string,
        token: string,
    ): Promise<{ object: { sha: string } } | undefined> => {
        const octokit = github.getOctokit(token);
        try {
            const { data: foundTag } = await octokit.rest.git.getRef({
                owner,
                repo: repository,
                ref: tagReference(tag),
            });
            return foundTag;
        } catch {
            return undefined;
        }
    };

    private getTagSha = async (
        owner: string,
        repository: string,
        tag: string,
        token: string,
    ): Promise<string | undefined> => {
        const foundTag = await this.findTag(owner, repository, tag, token);
        if (!foundTag) {
            logError(`The '${tag}' tag does not exist in the remote repository`);
            return undefined;
        }
        return foundTag.object.sha;
    };

    updateTag = async (
        owner: string,
        repository: string,
        sourceTag: string,
        targetTag: string,
        token: string,
    ): Promise<void> => {
        const sourceTagSha = await this.getTagSha(owner, repository, sourceTag, token);
        if (!sourceTagSha) {
            logError(`The '${sourceTag}' tag does not exist in the remote repository`);
            return;
        }

        const foundTargetTag = await this.findTag(owner, repository, targetTag, token);
        const octokit = github.getOctokit(token);
        if (foundTargetTag) {
            logDebugInfo(`Updating the '${targetTag}' tag to point to the '${sourceTag}' tag`);
            await octokit.rest.git.updateRef({
                owner,
                repo: repository,
                ref: tagReference(targetTag),
                sha: sourceTagSha,
                force: true,
            });
        } else {
            logDebugInfo(`Creating the '${targetTag}' tag from the '${sourceTag}' tag`);
            await octokit.rest.git.createRef({
                owner,
                repo: repository,
                ref: tagReferencePath(targetTag),
                sha: sourceTagSha,
            });
        }
    };

    updateRelease = async (
        owner: string,
        repository: string,
        sourceTag: string,
        targetTag: string,
        token: string,
    ): Promise<string | undefined> => {
        const octokit = github.getOctokit(token);
        const { data: sourceRelease } = await octokit.rest.repos.getReleaseByTag({
            owner,
            repo: repository,
            tag: sourceTag,
        });
        if (!hasReleaseContent(sourceRelease)) {
            logError(`The '${sourceTag}' tag does not exist in the remote repository`);
            return undefined;
        }

        const { data: releases } = await octokit.rest.repos.listReleases({ owner, repo: repository });
        const targetRelease = findTargetRelease(releases, targetTag, (release) => release.tag_name);
        let targetReleaseId: number;
        if (targetRelease) {
            await octokit.rest.repos.updateRelease({
                owner,
                repo: repository,
                release_id: targetRelease.id,
                name: sourceRelease.name,
                body: sourceRelease.body,
                draft: sourceRelease.draft,
                prerelease: sourceRelease.prerelease,
            });
            targetReleaseId = targetRelease.id;
        } else {
            const payload = releasePayload(targetTag, sourceRelease);
            const { data: newRelease } = await octokit.rest.repos.createRelease({
                owner,
                repo: repository,
                ...payload,
            });
            targetReleaseId = newRelease.id;
        }

        logInfo(`Updated release for targetTag '${targetTag}'`);
        return releaseIdAsString(targetReleaseId);
    };

    createRelease = async (
        owner: string,
        repository: string,
        version: string,
        title: string,
        changelog: string,
        token: string,
    ): Promise<string | undefined> => {
        try {
            const octokit = github.getOctokit(token);
            const { data: release } = await octokit.rest.repos.createRelease({
                owner,
                repo: repository,
                tag_name: version,
                name: releaseName(version, title),
                body: changelog,
                draft: false,
                prerelease: false,
            });
            return release.html_url;
        } catch (error) {
            logError(`Error creating release: ${error}`);
            return undefined;
        }
    };

    getDefaultBranch = async (
        owner: string,
        repository: string,
        token: string,
    ): Promise<string | undefined> => {
        try {
            const octokit = github.getOctokit(token);
            const { data } = await octokit.rest.repos.get({ owner, repo: repository });
            logDebugInfo(`Default branch for ${owner}/${repository}: ${data.default_branch}`);
            return data.default_branch;
        } catch (error) {
            logError(`Error getting default branch for ${owner}/${repository}: ${error}`);
            return undefined;
        }
    };

    createTag = async (
        owner: string,
        repository: string,
        branch: string,
        tag: string,
        token: string,
    ): Promise<string | undefined> => {
        const octokit = github.getOctokit(token);
        try {
            const existingTag = await this.findTag(owner, repository, tag, token);
            if (existingTag) {
                logInfo(`Tag '${tag}' already exists in repository ${owner}/${repository}`);
                return existingTag.object.sha;
            }

            const { data: ref } = await octokit.rest.git.getRef({
                owner,
                repo: repository,
                ref: `heads/${branch}`,
            });
            await octokit.rest.git.createRef({
                owner,
                repo: repository,
                ref: `refs/tags/${tag}`,
                sha: ref.object.sha,
            });
            logInfo(`Created tag '${tag}' in repository ${owner}/${repository} from branch '${branch}'`);
            return ref.object.sha;
        } catch (error) {
            logError(`Error creating tag '${tag}': ${JSON.stringify(error, null, 2)}`);
            return undefined;
        }
    };
}
