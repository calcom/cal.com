import prisma from "@calcom/prisma";

interface HandleTypeForwardingProps {
  userId: number;
  slug: string;
  username: string;
}

export const handleTypeForwarding = async (props: HandleTypeForwardingProps) => {
  const { userId, slug, username } = props;
  const bookingForwardingActive = await prisma.bookingForwarding.findFirst({
    select: {
      userId: true,
      status: true,
      start: true,
      end: true,
      toUserId: true,
      toUser: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    where: {
      status: "ACCEPTED",
      userId: userId,
      start: {
        lte: new Date(),
      },
      end: {
        gte: new Date(),
      },
    },
  });

  let redirectToSameEventSlug = false;

  // @TODO: Should I validate if new user has same type as slug?
  if (bookingForwardingActive && bookingForwardingActive?.toUser) {
    const eventType = await prisma.eventType.findFirst({
      select: {
        slug: true,
        userId: true,
      },
      where: {
        slug,
        userId: bookingForwardingActive.toUserId,
      },
    });

    if (eventType) {
      redirectToSameEventSlug = true;
    }

    return {
      redirect: {
        destination: `/${bookingForwardingActive.toUser.username}${
          redirectToSameEventSlug ? `/${slug}` : ""
        }?redirected=true&username=${username}`,
        permanent: false,
      },
    };
  }
  return {};
};
