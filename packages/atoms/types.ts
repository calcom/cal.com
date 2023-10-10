import type React from "react";

export interface AtomsGlobalConfigProps {
  /**
   * API endpoint for the Booker component to fetch data from,
   * defaults to https://cal.com
   */
  webAppUrl?: string;
}

export type SVGComponent = React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

export interface ConnectButtonProps {
  buttonText?: string;
  onButtonClick: (payload: { cb: (err: { error: { message: string } } | null) => void }) => Promise<void>;
  stylesClassname?: string;
  icon?: JSX.Element;
}
