import type { GetServerSidePropsContext } from "next";
import type { IAlbySetupProps } from "./index";
export declare const getServerSideProps: (ctx: GetServerSidePropsContext) => Promise<{
    readonly notFound: true;
} | {
    readonly redirect: {
        readonly permanent: false;
        readonly destination: "/auth/login";
    };
} | {
    props: IAlbySetupProps;
}>;
//# sourceMappingURL=_getServerSideProps.d.ts.map