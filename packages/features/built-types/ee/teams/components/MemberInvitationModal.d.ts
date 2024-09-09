/// <reference types="react" />
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc";
import type { PendingMember } from "../lib/types";
type MemberInvitationModalProps = {
    isOpen: boolean;
    onExit: () => void;
    orgMembers?: RouterOutputs["viewer"]["organizations"]["getMembers"];
    onSubmit: (values: NewMemberForm, resetFields: () => void) => void;
    onSettingsOpen?: () => void;
    teamId: number;
    members?: PendingMember[];
    token?: string;
    isPending?: boolean;
    disableCopyLink?: boolean;
    isOrg?: boolean;
    checkMembershipMutation?: boolean;
};
export interface NewMemberForm {
    emailOrUsername: string | string[];
    role: MembershipRole;
}
export default function MemberInvitationModal(props: MemberInvitationModalProps): JSX.Element;
export declare const MemberInvitationModalWithoutMembers: ({ hideInvitationModal, showMemberInvitationModal, teamId, token, onSettingsOpen, }: {
    hideInvitationModal: () => void;
    showMemberInvitationModal: boolean;
    teamId: number;
    token?: string | undefined;
    onSettingsOpen: () => void;
}) => JSX.Element;
export {};
//# sourceMappingURL=MemberInvitationModal.d.ts.map