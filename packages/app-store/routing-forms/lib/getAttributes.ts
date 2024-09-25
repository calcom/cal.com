import prisma from "@calcom/prisma";

export async function getAttributesForTeam({ teamId }: { teamId: number }) {
    const allOrganizationAttributes = await prisma.attribute.findMany({
        where: {
            team: {
                // The team here is the organization and not the team
                children: {
                    some: {
                        id: teamId
                    }
                }
            },
            enabled: true
        },
        select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            options: {
                select: {
                    id: true,
                    assignedUsers: true,
                    value: true,
                    slug: true
                }
            }
        }
    });
    //FIXME: Filter just the team's attributes here
    const teamAttributes = allOrganizationAttributes;
    return teamAttributes;
}

export async function getAttributesMappedWithTeamMembers({  teamId }: { teamId: number }) {
    const attributesToUser = await prisma.attributeToUser.findMany({
        where: {
            member: {
                // The membership here is of the organization, not the team
                team: {
                    children: {
                        some: {
                            id: teamId
                        }
                    }
                }
            }
        },
        select: {
            member: {
                select: {
                    userId: true
                }
            },
            attributeOption: {
                select: {
                    id: true,
                    value: true,
                    slug: true,
                    attribute:{
                        select: {id:true}
                    }
                }
            }
        }
    });
    console.log("attributesToUser", {attributesToUser, where: {
        member: {
            teamId
        }
    }});

    const teamMembers = attributesToUser.map((attributeToUser) => {
        return {
            userId: attributeToUser.member.userId,
            attributes: {
                [attributeToUser.attributeOption.attribute.id]: attributeToUser.attributeOption.slug
            }
        }
    })
    return teamMembers;
}