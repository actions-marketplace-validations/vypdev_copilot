import { OctokitGraphqlTransportClientAdapter, OctokitRepositoryContextClientAdapter, OctokitOwnerTypeClientAdapter } from "../github/octokit_client";
export const createGraphqlTransportClient = () => new OctokitGraphqlTransportClientAdapter();
export const createRepositoryContextClient = () => new OctokitRepositoryContextClientAdapter();
export const createOwnerTypeClient = () => new OctokitOwnerTypeClientAdapter();
