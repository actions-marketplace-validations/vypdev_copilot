import { RepositoryReleaseRepository } from './repository_release_repository';
import { ProjectBoardRepository } from './project_board_repository';
import { OrganizationRepository } from './organization_repository';

export class ProjectRepository {
    private readonly releaseRepository = new RepositoryReleaseRepository();
    private readonly projectBoardRepository = new ProjectBoardRepository();
    private readonly organizationRepository = new OrganizationRepository();
  
    private readonly priorityLabel = "Priority"  
    private readonly sizeLabel = "Size"
    private readonly statusLabel = "Status"
    
    getProjectDetail = this.projectBoardRepository.getProjectDetail;

    getContentId = this.projectBoardRepository.getContentId;

    isContentLinked = this.projectBoardRepository.isContentLinked;

    linkContentId = this.projectBoardRepository.linkContentId;

    setTaskPriority = this.projectBoardRepository.setTaskPriority;

    setTaskSize = this.projectBoardRepository.setTaskSize;

    moveIssueToColumn = this.projectBoardRepository.moveIssueToColumn;

    getRandomMembers = this.organizationRepository.getRandomMembers;

    getAllMembers = this.organizationRepository.getAllMembers;

    getUserFromToken = this.organizationRepository.getUserFromToken;

    getTokenUserDetails = this.organizationRepository.getTokenUserDetails;

    isActorAllowedToModifyFiles = this.organizationRepository.isActorAllowedToModifyFiles;

    updateTag = this.releaseRepository.updateTag;

    updateRelease = this.releaseRepository.updateRelease;

    createRelease = this.releaseRepository.createRelease;

    getDefaultBranch = this.releaseRepository.getDefaultBranch;

    createTag = this.releaseRepository.createTag;
}
