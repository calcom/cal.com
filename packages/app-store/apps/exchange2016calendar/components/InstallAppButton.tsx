import useAddAppMutation from "@calcom/app-store/src/_utils/useAddAppMutation";
import type { InstallAppButtonProps } from "../../types";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const mutation = useAddAppMutation("exchange2016_calendar");
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
