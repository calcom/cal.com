import type { InstallAppButtonProps } from "@calcom/app-store/types";

import useAddAppMutation from "../../_utils/useAddAppMutation";

export default function InstallAppButton(props: InstallAppButtonProps) {
  console.log("🚀 ~ file: InstallAppButton.tsx:6 ~ InstallAppButton ~ props:", props);
  const mutation = useAddAppMutation("google_video");

  return (
    <>
      {props.render({
        disabled: props.disableInstall,
        onClick() {
          mutation.mutate("");
        },
        loading: mutation.isLoading,
      })}
    </>
  );
}
