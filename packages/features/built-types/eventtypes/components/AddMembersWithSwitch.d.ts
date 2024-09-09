import type { Dispatch, SetStateAction } from "react";
import type { Host, TeamMember } from "@calcom/features/eventtypes/lib/types";
interface IUserToValue {
    id: number | null;
    name: string | null;
    username: string | null;
    avatar: string;
    email: string;
}
export declare const mapUserToValue: ({ id, name, username, avatar, email }: IUserToValue, pendingString: string) => {
    value: string;
    label: string;
    avatar: string;
    email: string;
};
declare const AddMembersWithSwitch: ({ teamMembers, value, onChange, assignAllTeamMembers, setAssignAllTeamMembers, automaticAddAllEnabled, onActive, isFixed, placeholder, containerClassName, isRRWeightsEnabled, }: {
    value: Host[];
    onChange: (hosts: Host[]) => void;
    teamMembers: TeamMember[];
    assignAllTeamMembers: boolean;
    setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
    automaticAddAllEnabled: boolean;
    onActive: () => void;
    isFixed: boolean;
    placeholder?: string | undefined;
    containerClassName?: string | undefined;
    isRRWeightsEnabled?: boolean | undefined;
}) => JSX.Element;
export default AddMembersWithSwitch;
//# sourceMappingURL=AddMembersWithSwitch.d.ts.map