import { InstallAppButtonProps } from "../../types";

export default function InstallAppButton(props: InstallAppButtonProps) {
  return (
    <>
      {props.render({
        onClick() {
          alert("You can put your install code in here!");
        },
      })}
    </>
  );
}
