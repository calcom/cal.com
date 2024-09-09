import type { GetServerSidePropsContext } from "next";
import React from "react";
import type { AppPrisma, AppSsrInit, AppUser } from "@calcom/types/AppGetServerSideProps";
type GetServerSidePropsRestArgs = [AppPrisma, AppUser, AppSsrInit];
declare function LayoutHandler(props: {
    [key: string]: unknown;
}): JSX.Element;
declare namespace LayoutHandler {
    var getLayout: (page: React.ReactElement<any, string | React.JSXElementConstructor<any>>) => any;
}
export default LayoutHandler;
export declare function getServerSideProps(context: GetServerSidePropsContext, ...rest: GetServerSidePropsRestArgs): Promise<{
    props: {};
}>;
//# sourceMappingURL=%5B...appPages%5D.d.ts.map