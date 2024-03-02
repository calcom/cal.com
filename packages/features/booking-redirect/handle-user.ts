import prisma from "@calcom/prisma";

interface HandleUserRedirectionProps {
  username: string;
}

export const handleUserRedirection = async (props: HandleUserRedirectionProps) => {
  const { username } = props;
  const fromUser = await prisma.user.findFirst({
    where: {
      username,
    },
    select: {
      id: true,
    },
  });

  if (fromUser) {
    // If user is found quickly verify bookingRedirect
    const outOfOfficeEntryActive = await prisma.outOfOfficeEntry.findFirst({
      select: {
        toUser: {
          select: {
            username: true,
          },
        },
        toUserId: true,
        userId: true,
        start: true,
        end: true,
      },
      where: {
        userId: fromUser.id,
        start: {
          lte: new Date(),
        },
        end: {
          gte: new Date(),
        },
      },
    });

    if (outOfOfficeEntryActive && outOfOfficeEntryActive.toUserId === null) {
      return {
        outOfOffice: true,
      };
    }

    if (outOfOfficeEntryActive && outOfOfficeEntryActive.toUser?.username) {
      return {
        redirect: {
          destination: `/${outOfOfficeEntryActive.toUser.username}?redirected=true&username=${username}`,
          permanent: false,
        },
      };
    }
  }
  return {};
};
