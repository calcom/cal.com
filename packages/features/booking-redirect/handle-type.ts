import prisma from "@calcom/prisma";

interface HandleTypeRedirectionProps {
  userId: number;
  slug: string;
  username: string;
}

export const handleTypeRedirection = async (props: HandleTypeRedirectionProps) => {
  const { userId, slug, username } = props;
  const outOfOfficeEntryActive = await prisma.outOfOfficeEntry.findFirst({
    select: {
      userId: true,
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
  if (outOfOfficeEntryActive) {
    if (outOfOfficeEntryActive.toUserId === null) {
      return {
        outOfOffice: true,
      };
    }
    if (outOfOfficeEntryActive?.toUser) {
      const eventType = await prisma.eventType.findFirst({
        select: {
          slug: true,
          userId: true,
        },
        where: {
          slug,
          userId: outOfOfficeEntryActive.toUserId,
        },
      });

      if (eventType) {
        redirectToSameEventSlug = true;
      }

      return {
        redirect: {
          destination: `/${outOfOfficeEntryActive.toUser.username}${
            redirectToSameEventSlug ? `/${slug}` : ""
          }?redirected=true&username=${username}`,
          permanent: false,
        },
      };
    }
  }
  return {};
};
