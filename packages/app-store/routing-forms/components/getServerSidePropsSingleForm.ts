import type {
  AppGetServerSidePropsContext,
  AppPrisma,
  AppSsrInit,
  AppUser,
} from "@calcom/types/AppGetServerSideProps";

import { getSerializableForm } from "../lib/getSerializableForm";

export const getServerSidePropsForSingleFormView = async function getServerSidePropsForSingleFormView(
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma,
  user: AppUser,
  ssrInit: AppSsrInit
) {
  const ssr = await ssrInit(context);

  if (!user) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }
  const { params } = context;
  if (!params) {
    return {
      notFound: true,
    };
  }
  const formId = params.appPages[0];
  if (!formId || params.appPages.length > 1) {
    return {
      notFound: true,
    };
  }

  const isFormCreateEditAllowed = (await import("../lib/isFormCreateEditAllowed")).isFormCreateEditAllowed;
  if (!(await isFormCreateEditAllowed({ userId: user.id, formId, targetTeamId: null }))) {
    return {
      notFound: true,
    };
  }

  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: formId,
    },
    include: {
      team: {
        select: {
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });
  if (!form) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      trpcState: await ssr.dehydrate(),
      form: await getSerializableForm({ form }),
    },
  };
};
