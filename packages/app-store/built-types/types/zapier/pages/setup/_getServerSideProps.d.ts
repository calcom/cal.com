import type { GetServerSidePropsContext } from "next";
export interface IZapierSetupProps {
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