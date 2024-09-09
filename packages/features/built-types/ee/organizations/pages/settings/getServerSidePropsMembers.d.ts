import type { GetServerSidePropsContext } from "next";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
export type PageProps = inferSSRProps<typeof getServerSidePropsForMembers>;
export declare const getServerSidePropsForMembers: ({ req, res, }: GetServerSidePropsContext) => Promise<{
    redirect: {
        permanent: boolean;
        destination: string;
    };
    props?: undefined;
} | {
    props: {};
    redirect?: undefined;
}>;
//# sourceMappingURL=getServerSidePropsMembers.d.ts.map