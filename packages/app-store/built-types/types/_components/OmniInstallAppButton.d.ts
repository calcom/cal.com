/// <reference types="react" />
/**
 * Use this component to allow installing an app from anywhere on the app.
 * Use of this component requires you to remove custom InstallAppButtonComponent so that it can manage the redirection itself
 */
export default function OmniInstallAppButton({ appId, className, returnTo, teamId, }: {
    appId: string;
    className: string;
    returnTo?: string;
    teamId?: number;
}): JSX.Element | null;
//# sourceMappingURL=OmniInstallAppButton.d.ts.map