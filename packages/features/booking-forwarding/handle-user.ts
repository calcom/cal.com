import prisma from "@calcom/prisma";

interface HandleUserForwardingProps {
  username: string;
}

export const handleUserForwarding = async (props: HandleUserForwardingProps) => {
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
    // If user is found quickly verify bookingForwarding
    const bookingForwardingActive = await prisma.bookingForwarding.findFirst({
      select: {
        toUser: {
          select: {
            username: true,
          },
        },
        userId: true,
        status: true,
        start: true,
        end: true,
      },
      where: {
        status: "ACCEPTED",
        userId: fromUser.id,
        start: {
          lte: new Date(),
        },
        end: {
          gte: new Date(),
        },
      },
    });

    if (bookingForwardingActive && bookingForwardingActive.toUser?.username) {
      return {
        redirect: {
          destination: `/${bookingForwardingActive.toUser.username}?redirected=true&username=${username}`,
          permanent: false,
        },
      };
    }
    return {};
  }
};
