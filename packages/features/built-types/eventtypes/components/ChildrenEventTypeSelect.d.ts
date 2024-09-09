/// <reference types="react" />
import type { Props } from "react-select";
import { MembershipRole } from "@calcom/prisma/enums";
import type { UserProfile } from "@calcom/types/UserProfile";
export type ChildrenEventType = {
    value: string;
    label: string;
    created: boolean;
    owner: {
        avatar: string;
        id: number;
        email: string;
        name: string;
        username: string;
        membership: MembershipRole;
        eventTypeSlugs: string[];
        profile: UserProfile;
    };
    slug: string;
    hidden: boolean;
};
export declare const ChildrenEventTypeSelect: ({ options, value, ...props }: Omit<Props<ChildrenEventType, true, import("react-select").GroupBase<ChildrenEventType>>, "value" | "onChange"> & {
    value?: ChildrenEventType[] | undefined;
    onChange: (value: readonly ChildrenEventType[]) => void;
}) => JSX.Element;
export default ChildrenEventTypeSelect;
//# sourceMappingURL=ChildrenEventTypeSelect.d.ts.map