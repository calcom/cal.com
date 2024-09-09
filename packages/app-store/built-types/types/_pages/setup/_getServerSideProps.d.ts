import type { GetServerSidePropsContext } from "next";
export declare const AppSetupPageMap: {
    alby: Promise<typeof import("../../alby/pages/setup/_getServerSideProps")>;
    make: Promise<typeof import("../../make/pages/setup/_getServerSideProps")>;
    zapier: Promise<typeof import("../../zapier/pages/setup/_getServerSideProps")>;
    stripe: Promise<typeof import("../../stripepayment/pages/setup/_getServerSideProps")>;
};
export declare const getServerSideProps: (ctx: GetServerSidePropsContext) => Promise<{
    readonly notFound: true;
} | {
    redirect: {
        destination: string;
        permanent: boolean;
    };
} | {
    readonly redirect: {
        readonly permanent: false;
        readonly destination: "/auth/login";
    };
} | {
    props: import("../../alby/pages/setup").IAlbySetupProps;
} | {
    props: {
        inviteLink: string;
    };
} | {
    props: {};
}>;
//# sourceMappingURL=_getServerSideProps.d.ts.map