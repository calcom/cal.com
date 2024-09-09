import type { GetServerSidePropsContext } from "next";
export declare const getServerSideProps: (ctx: GetServerSidePropsContext) => Promise<{
    readonly notFound: true;
} | {
    redirect: {
        destination: string;
        permanent: boolean;
    };
}>;
//# sourceMappingURL=_getServerSideProps.d.ts.map