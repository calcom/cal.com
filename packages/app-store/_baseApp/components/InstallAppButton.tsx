import type { InstallAppButtonProps } from "@calcom/app-store/types";

import useAddAppMutation from "../../_utils/useAddAppMutation";
import appConfig from "../config.json";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const mutation = useAddAppMutation(appConfig.type);

  return (
    <>
      {props.render({
        onClick() {
          mutation.mutate("");
        },
        loading: mutation.isLoading,
      })}
    </>
  );
}
