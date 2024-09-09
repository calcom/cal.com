/// <reference types="react" />
import * as templates from "./templates";
declare function renderEmail<K extends keyof typeof templates>(template: K, props: React.ComponentProps<(typeof templates)[K]>): Promise<string>;
export default renderEmail;
//# sourceMappingURL=renderEmail.d.ts.map