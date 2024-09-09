import React from "react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { getServerSidePropsForSingleFormView as getServerSideProps } from "../../components/SingleForm";
import "../../components/react-awesome-query-builder/styles.css";
export { getServerSideProps };
declare function RouteBuilder({ form, appUrl, enrichedWithUserProfileForm, }: inferSSRProps<typeof getServerSideProps> & {
    appUrl: string;
}): JSX.Element;
declare namespace RouteBuilder {
    var getLayout: (page: React.ReactElement<any, string | React.JSXElementConstructor<any>>) => JSX.Element;
}
export default RouteBuilder;
//# sourceMappingURL=%5B...appPages%5D.d.ts.map