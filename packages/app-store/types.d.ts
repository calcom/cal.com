import { ButtonBaseProps } from "@calcom/ui/Button";
import { ButtonBaseProps as ButtonBasePropsV2 } from "@calcom/ui/v2/core/Button";

export type IntegrationOAuthCallbackState = {
  returnTo: string;
};

export type RenderPropsTypeGeneric<T> = T & {
  /** Tells that the default render component should be used */
  useDefaultComponent?: boolean;
};

export interface InstallAppButtonProps {
  render: <T>(renderProps: RenderPropsType<T>) => JSX.Element;
  onChanged?: () => unknown;
}

export type RenderPropsType = RenderPropsTypeGeneric<ButtonBaseProps | ButtonBasePropsV2>;
