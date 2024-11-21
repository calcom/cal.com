import useAddAppMutation from "@calcom/app-store-core/_utils/useAddAppMutation";
import type { InstallAppButtonProps } from "@calcom/app-store/types";

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
