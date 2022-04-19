import type { InstallAppButtonProps } from "@calcom/app-store/types";

import useAddAppMutation from "../../_utils/useAddAppMutation";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const mutation = useAddAppMutation("wipemycal_other");

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
