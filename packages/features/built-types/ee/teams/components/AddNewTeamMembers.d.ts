/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
type TeamMember = RouterOutputs["viewer"]["teams"]["get"]["members"][number];
type FormValues = {
    members: TeamMember[];
};
declare const AddNewTeamMembers: ({ isOrg }: {
    isOrg?: boolean | undefined;
}) => JSX.Element;
export declare const AddNewTeamMembersForm: ({ defaultValues, teamId, isOrg, }: {
    defaultValues: FormValues;
    teamId: number;
    isOrg?: boolean | undefined;
}) => JSX.Element;
export default AddNewTeamMembers;
//# sourceMappingURL=AddNewTeamMembers.d.ts.map