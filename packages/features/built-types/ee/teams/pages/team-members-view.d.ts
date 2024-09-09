/// <reference types="react" />
import type { AppCategories } from "@calcom/prisma/enums";
export type ConnectedAppsType = {
    name: string | null;
    logo: string | null;
    externalId: string | null;
    app: {
        slug: string;
        categories: AppCategories[];
    } | null;
};
declare const MembersView: {
    (): JSX.Element;
    getLayout: (page: import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>) => JSX.Element;
};
export default MembersView;
//# sourceMappingURL=team-members-view.d.ts.map