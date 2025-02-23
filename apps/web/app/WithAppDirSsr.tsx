import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import { notFound, redirect } from "next/navigation";

export const withAppDirSsr =
  <T extends Record<string, any>>(getServerSideProps: GetServerSideProps<T>) =>
  async (context: GetServerSidePropsContext) => {
    const ssrResponse = await getServerSideProps(context);

    if ("redirect" in ssrResponse) {
      redirect(ssrResponse.redirect.destination);
    }
    if ("notFound" in ssrResponse) {
      notFound();
    }

    const props = await Promise.resolve(ssrResponse.props);

    return {
      ...props,
    };
  };
