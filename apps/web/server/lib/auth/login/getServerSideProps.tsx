import type { GetServerSidePropsContext } from "next";

export async function getServerSideProps(_: GetServerSidePropsContext) {
  return { redirect: { permanent: false, destination: process.env.NEXT_PUBLIC_FUNNELHUB_URL } };
  // const { req, res, query } = context;

  // const session = await getServerSession({ req, res });
  // const ssr = await ssrInit(context);

  // const verifyJwt = (jwt: string) => {
  //   const secret = new TextEncoder().encode(process.env.CALENDSO_ENCRYPTION_KEY);

  //   return jwtVerify(jwt, secret, {
  //     issuer: WEBSITE_URL,
  //     audience: `${WEBSITE_URL}/auth/login`,
  //     algorithms: ["HS256"],
  //   });
  // };

  // let totpEmail = null;
  // if (context.query.totp) {
  //   try {
  //     const decryptedJwt = await verifyJwt(context.query.totp as string);
  //     if (decryptedJwt.payload) {
  //       totpEmail = decryptedJwt.payload.email as string;
  //     } else {
  //       return {
  //         redirect: {
  //           destination: "/auth/error?error=JWT%20Invalid%20Payload",
  //           permanent: false,
  //         },
  //       };
  //     }
  //   } catch (e) {
  //     return {
  //       redirect: {
  //         destination: "/auth/error?error=Invalid%20JWT%3A%20Please%20try%20again",
  //         permanent: false,
  //       },
  //     };
  //   }
  // }

  // if (session) {
  //   const { callbackUrl } = query;

  //   if (callbackUrl) {
  //     try {
  //       const destination = getSafeRedirectUrl(callbackUrl as string);
  //       if (destination) {
  //         return {
  //           redirect: {
  //             destination,
  //             permanent: false,
  //           },
  //         };
  //       }
  //     } catch (e) {
  //       console.warn(e);
  //     }
  //   }

  //   return {
  //     redirect: {
  //       destination: "/",
  //       permanent: false,
  //     },
  //   };
  // }

  // const userCount = await prisma.user.count();
  // if (userCount === 0) {
  //   // Proceed to new onboarding to create first admin user
  //   return {
  //     redirect: {
  //       destination: "/auth/setup",
  //       permanent: false,
  //     },
  //   };
  // }
  // return {
  //   props: {
  //     csrfToken: await getCsrfToken(context),
  //     trpcState: ssr.dehydrate(),
  //     isGoogleLoginEnabled: IS_GOOGLE_LOGIN_ENABLED,
  //     isSAMLLoginEnabled,
  //     samlTenantID,
  //     samlProductID,
  //     totpEmail,
  //   },
  // };
}
