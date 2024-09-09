import type { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";
export declare const getServerSideProps: (context: AppGetServerSidePropsContext, prisma: AppPrisma, user: AppUser, ssrInit: ssrInit) => Promise<{
    redirect: {
        permanent: boolean;
        destination: string;
    };
    props?: undefined;
} | {
    props: {
        trpcState: any;
    };
    redirect?: undefined;
}>;
//# sourceMappingURL=getServerSideProps.d.ts.map