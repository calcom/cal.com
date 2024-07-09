import type { ButtonProps } from "@calcom/ui";

export type IntegrationOAuthCallbackState = {
  returnTo?: string;
  onErrorReturnTo: string;
  fromApp: boolean;
  installGoogleVideo?: boolean;
  teamId?: number;
  defaultInstall?: boolean;
};

type AppScript = { attrs?: Record<string, string> } & { src?: string; content?: string };

export type Tag = {
  scripts: AppScript[];
  pushEventScript?: AppScript;
};

export interface InstallAppButtonProps {
  render: (
    renderProps: ButtonProps & {
      /** Tells that the default render component should be used */
      useDefaultComponent?: boolean;
      isPending?: boolean;
    }
  ) => JSX.Element;
  onChanged?: () => unknown;
  disableInstall?: boolean;
}
