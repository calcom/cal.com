import { ButtonBaseProps } from "@calcom/ui/Button";

export type IntegrationOAuthCallbackState = {
  returnTo: string;
};

export interface InstallAppButtonProps {
  render: (
    renderProps:
      | ButtonBaseProps & {
          /** Tells that the default render component should be used */
          useDefaultComponent?: boolean;
        }
  ) => JSX.Element;
  onChanged?: () => unknown;
}
