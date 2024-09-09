import type { GetServerSidePropsContext } from "next";
export declare const getServerSideProps: ({ req, res }: GetServerSidePropsContext) => Promise<{
    notFound: boolean;
    props?: undefined;
} | {
    props: {};
    readonly notFound?: undefined;
}>;
//# sourceMappingURL=organization.d.ts.map