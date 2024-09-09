import type { GetServerSidePropsContext } from "next";
export interface IMakeSetupProps {
    inviteLink: string;
}
export declare const getServerSideProps: (ctx: GetServerSidePropsContext) => Promise<{
    readonly notFound: true;
} | {
    props: {
        inviteLink: string;
    };
}>;
//# sourceMappingURL=_getServerSideProps.d.ts.map