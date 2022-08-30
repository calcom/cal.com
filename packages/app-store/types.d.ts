import { ButtonBaseProps as v1ButtonBaseProps } from "@calcom/ui/Button";
import { ButtonBaseProps as v2ButtonBaseProps } from "@calcom/ui/v2/core/Button";

export type IntegrationOAuthCallbackState = {
  returnTo: string;
};

export interface InstallAppButtonProps {
  render: (
    renderProps:
      | v1ButtonBaseProps
      | v2ButtonBaseProps
      | {
          /** Tells that the default render component should be used */
          useDefaultComponent?: boolean;
        }
  ) => JSX.Element;
  onChanged?: () => unknown;
}
