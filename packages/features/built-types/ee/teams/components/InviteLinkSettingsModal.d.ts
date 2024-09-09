/// <reference types="react" />
type InvitationLinkSettingsModalProps = {
    isOpen: boolean;
    teamId: number;
    token: string;
    expiresInDays?: number;
    onExit: () => void;
};
export interface LinkSettingsForm {
    expiresInDays: number | undefined;
}
export default function InviteLinkSettingsModal(props: InvitationLinkSettingsModalProps): JSX.Element;
export {};
//# sourceMappingURL=InviteLinkSettingsModal.d.ts.map