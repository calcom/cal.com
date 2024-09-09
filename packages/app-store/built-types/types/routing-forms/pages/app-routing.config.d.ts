import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";
import * as formEdit from "./form-edit/[...appPages]";
import * as forms from "./forms/[...appPages]";
import * as LayoutHandler from "./layout-handler/[...appPages]";
import * as Reporting from "./reporting/[...appPages]";
import * as RouteBuilder from "./route-builder/[...appPages]";
import * as Router from "./router/[...appPages]";
import * as RoutingLink from "./routing-link/[...appPages]";
declare const routingConfig: {
    "form-edit": typeof formEdit;
    "route-builder": typeof RouteBuilder;
    forms: typeof forms;
    "routing-link": typeof RoutingLink;
    router: typeof Router;
    reporting: typeof Reporting;
    layoutHandler: typeof LayoutHandler;
};
export declare const serverSidePropsConfig: Record<string, AppGetServerSideProps>;
export default routingConfig;
//# sourceMappingURL=app-routing.config.d.ts.map