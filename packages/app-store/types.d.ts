export type IntegrationOAuthCallbackState = {
  returnTo: string;
};

export interface InstallAppButtonProps {
  buttonProps?: ButtonBaseProps & { children?: React.ReactChildren };
  onChanged?: () => unknown;
}
