export interface OrganizationTeam {
    slug: string;
}

export interface OrganizationMember {
    login: string;
}

export type ListTeamMembers = (teamSlug: string) => Promise<OrganizationMember[]>;

export async function collectOrganizationMembers(
    teams: OrganizationTeam[],
    listTeamMembers: ListTeamMembers,
): Promise<string[]> {
    const members = new Set<string>();
    for (const team of teams) {
        const teamMembers = await listTeamMembers(team.slug);
        teamMembers.forEach((member) => members.add(member.login));
    }
    return [...members];
}

export function selectAvailableMembers(
    members: string[],
    currentMembers: string[],
    requested: number,
): string[] {
    const available = members.filter((member) => !currentMembers.includes(member));
    if (requested >= available.length) return available;
    return available.sort(() => Math.random() - 0.5).slice(0, requested);
}
