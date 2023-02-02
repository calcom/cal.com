import { GetServerSideProps, GetServerSidePropsContext } from "next";

import { csp } from "@lib/csp";

export type WithNonceProps = {
  nonce?: string;
};

/**
 * Make any getServerSideProps fn return the nonce so that it can be used by Components in the page to add any script tag.
 * Note that if the Components are not adding any script tag then this is not needed. Even in absence of this, Document.getInitialProps would be able to generate nonce itself which it needs to add script tags common to all pages
 * There is no harm in wrapping a `getServerSideProps` fn with this even if it doesn't add any script tag.
 */
export default function withNonce(getServerSideProps: GetServerSideProps) {
  return async (context: GetServerSidePropsContext) => {
    const ssrResponse = await getServerSideProps(context);
    const { nonce } = csp(context.req, context.res);

    // Skip nonce property if it's not available instead of setting it to undefined because undefined can't be serialized.
    const nonceProps = nonce
      ? {
          nonce,
        }
      : null;

    if (!("props" in ssrResponse)) {
      return ssrResponse;
    }

    // Helps in debugging that withNonce was used but a valid nonce couldn't be set
    context.res.setHeader("x-csp", nonce ? "ssr" : "false");

    return {
      ...ssrResponse,
      props: {
        ...ssrResponse.props,
        ...nonceProps,
      },
    };
  };
}
