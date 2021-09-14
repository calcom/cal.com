import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";

export default function Async(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  console.log(props);
  return <div>hello</div>;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  // get query params and typecast them to string
  // (would be even better to assert them instead of typecasting)
  const userParam = context.query.user as string;

  const user = await prisma.user.findFirst({
    where: {
      username: userParam.toLowerCase(),
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      startTime: true,
      endTime: true,
      timeZone: true,
      weekStart: true,
      availability: true,
      hideBranding: true,
      theme: true,
    },
  });

  if (!user) {
    return {
      notFound: true,
    } as const;
  }

  return {
    props: {
      user,
    },
  };
};
