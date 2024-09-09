/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
declare const ProfileView: {
    (): JSX.Element;
    getLayout: (page: import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>) => JSX.Element;
};
export type TeamProfileFormProps = {
    team: RouterOutputs["viewer"]["teams"]["getMinimal"];
};
export default ProfileView;
//# sourceMappingURL=team-profile-view.d.ts.map