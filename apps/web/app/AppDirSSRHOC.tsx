import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import { notFound, redirect } from "next/navigation";

export const withAppDir =
  (getServerSideProps: GetServerSideProps) => async (context: GetServerSidePropsContext) => {
    const ssrResponse = await getServerSideProps(context);

    if ("redirect" in ssrResponse) {
      redirect(ssrResponse.redirect.destination);
    }

    if ("notFound" in ssrResponse) {
      notFound();
    }

    return ssrResponse.props;
  };
