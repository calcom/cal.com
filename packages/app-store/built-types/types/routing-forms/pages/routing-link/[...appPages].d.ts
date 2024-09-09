/// <reference types="react" />
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { getServerSideProps } from "./getServerSideProps";
declare function RoutingLink(props: inferSSRProps<typeof getServerSideProps>): JSX.Element;
declare namespace RoutingLink {
    var isBookingPage: boolean;
}
export default RoutingLink;
export { getServerSideProps };
//# sourceMappingURL=%5B...appPages%5D.d.ts.map