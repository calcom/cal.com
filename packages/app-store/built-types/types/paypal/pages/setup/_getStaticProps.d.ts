import type { GetStaticPropsContext } from "next";
export declare const getStaticProps: (ctx: GetStaticPropsContext) => Promise<{
    readonly notFound: true;
    props?: undefined;
} | {
    props: {
        clientId: string;
        secretKey: string;
    };
    readonly notFound?: undefined;
}>;
//# sourceMappingURL=_getStaticProps.d.ts.map