import type { InstallAppButtonProps } from "@calcom/app-store/types";

import useAddAppMutation from "../../_utils/useAddAppMutation";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const mutation = useAddAppMutation("google_calendar");
  return (
    <>
      <button onClick={() => mutation.mutate("")}>
        <img
          alt="Sign in with Google"
          src="https://teamepyc.github.io/cdn/pesto/btn_google_signin_dark_normal_web@2x.png"
          style={{ height: 44 + "px" }}
        />
      </button>
    </>
  );
  // return (
  //   <>
  //     {props.render({
  //       onClick() {
  //         mutation.mutate("");
  //       },
  //       loading: mutation.isLoading,
  //     })}
  //   </>
  // );
}
