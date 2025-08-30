import dynamic from "next/dynamic";

export const ConfigAppMap = {
  vital: dynamic(() => import("../vital/components/AppConfiguration")),
};

export const AppConfiguration = (props: { type: string } & { credentialIds: number[] }) => {
  let appName = props.type.replace(/_/g, "");
  let ConfigAppComponent = ConfigAppMap[appName as keyof typeof ConfigAppMap];
  /** So we can either call it by simple name (ex. `slack`, `giphy`) instead of
   * `slackmessaging`, `giphyother` while maintaining retro-compatibility. */
  if (!ConfigAppComponent) {
    [appName] = props.type.split("_");
    ConfigAppComponent = ConfigAppMap[appName as keyof typeof ConfigAppMap];
  }
  if (!ConfigAppComponent) return null;

  return <ConfigAppComponent credentialIds={props.credentialIds} />;
};
