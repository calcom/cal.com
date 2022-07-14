import { ButtonBaseProps } from "@calcom/ui/Button";

export type IntegrationOAuthCallbackState = {
  returnTo: string;
};

export interface InstallAppButtonProps {
  render: (renderProps: ButtonBaseProps) => JSX.Element;
  onChanged?: () => unknown;
}
