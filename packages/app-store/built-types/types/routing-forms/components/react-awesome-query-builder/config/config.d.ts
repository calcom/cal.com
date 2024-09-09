import type { Settings, Widgets } from "react-awesome-query-builder";
declare const config: {
    conjunctions: any;
    operators: any;
    types: any;
    widgets: Widgets & {
        [x: string]: import("react-awesome-query-builder").Widget & {
            type: string;
        };
    };
    settings: Settings;
};
export default config;
//# sourceMappingURL=config.d.ts.map