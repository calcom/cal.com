import type { InstallAppButtonProps } from "@calcom/app-store/types";

import useAddAppMutation from "../../_utils/useAddAppMutation";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const mutation = useAddAppMutation("exchange2013_calendar");

  return (
    <>
      {props.render({
        onClick() {
          mutation.mutate("");
        },
        loading: mutation.isPending,
      })}
    </>
  );
}
