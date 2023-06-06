import type { App_RoutingForms_Form, Membership, PrismaClient, Team } from "@prisma/client";

import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getSerializableForm } from "../lib/getSerializableForm";
import type { TFormSchema } from "./forms.schema";

interface FormsHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TFormSchema;
}

// export async function getRolesInTeams({
//   teamIds,
//   userId,
// }: {
//   userId: User["id"];
//   teamIds?: App_RoutingForms_Form["teamId"][];
// }) {
//   if (!teamIds) {
//     return null;
//   }
//   const validTeamIds = teamIds.filter((teamId): teamId is number => !!teamId);
//   const matchingTeamsOfLoggedinUser = teamIds
//     ? await prisma.team.findMany({
//         where: {
//           id: {
//             in: validTeamIds,
//           },
//           members: {
//             some: {
//               userId,
//               accepted: true,
//             },
//           },
//         },
//         select: {
//           id: true,
//           members: true,
//         },
//       })
//     : null;

//   return matchingTeamsOfLoggedinUser
//     ? matchingTeamsOfLoggedinUser.map((team) => {
//         return {
//           [team.id]: team.members.map((member) => ({ role: member.role, userId: member.userId })),
//         };
//       })
//     : null;
// }

export const formsHandler = async ({ ctx, input }: FormsHandlerOptions) => {
  const { prisma, user } = ctx;

  const where = getPrismaWhereFromFilters(user, input.filters);

  const forms = await prisma.app_RoutingForms_Form.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      team: {
        include: {
          members: true,
        },
      },
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });

  const serializableForms = [];
  for (let i = 0; i < forms.length; i++) {
    const form = forms[i];
    const hasWriteAccess = hasWriteAccessToForm(form, user);
    serializableForms.push({
      form: await getSerializableForm(forms[i]),
      readOnly: !hasWriteAccess,
    });
  }
  return serializableForms;
};

export default formsHandler;
export function getPrismaWhereFromFilters(
  user: {
    id: number;
  },
  filters: TFormSchema["filters"]
) {
  if (!Object.keys(filters).length) {
    filters.all = true;
  }
  const where = {
    OR: [],
  };
  const prismaQueries = {
    userIds: (userIds: number[]) => ({
      userId: {
        in: userIds,
      },
      teamId: null,
    }),
    teamIds: (teamIds: number[]) => ({
      team: {
        id: {
          in: teamIds ?? [],
        },
        members: {
          some: {
            userId: user.id,
            accepted: true,
            role: {
              in: [MembershipRole.ADMIN, MembershipRole.OWNER],
            },
          },
        },
      },
    }),
    all: () => ({
      OR: [
        {
          userId: user.id,
        },
        {
          team: {
            members: {
              some: {
                userId: user.id,
                accepted: true,
                role: {
                  in: [MembershipRole.ADMIN, MembershipRole.OWNER],
                },
              },
            },
          },
        },
      ],
    }),
  };
  console.log("filters", filters);
  for (const [filterName, filter] of Object.entries(filters)) {
    const prismaQuery = prismaQueries[filterName];
    if (!prismaQuery) {
      continue;
    }
    where.OR.push(prismaQueries[filterName](filter));
  }

  return where;
}

export function hasWriteAccessToForm(
  form: App_RoutingForms_Form & {
    team: (Team & { members: Membership[] }) | null;
    _count: { responses: number };
  },
  user: {
    id: number;
  }
) {
  const ownedByUser = form.userId === user.id;
  let hasWriteAccess = ownedByUser ? true : false;
  if (form.team) {
    const roleForTeamMember = form.team.members.find((member) => member.userId === user.id)?.role;
    if (roleForTeamMember) {
      //TODO: Remove type assertion
      hasWriteAccess =
        hasWriteAccess ||
        !([MembershipRole.ADMIN, MembershipRole.OWNER] as unknown as MembershipRole).includes(
          roleForTeamMember
        );
    }
  }
  return hasWriteAccess;
}
