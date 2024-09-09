/// <reference types="react" />
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { getServerSideProps } from "./getServerSideProps";
declare function RoutingForms({ appUrl, }: inferSSRProps<typeof getServerSideProps> & {
    appUrl: string;
}): JSX.Element;
declare namespace RoutingForms {
    var getLayout: (page: import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>) => JSX.Element;
}
export default RoutingForms;
export { getServerSideProps };
//# sourceMappingURL=%5B...appPages%5D.d.ts.map