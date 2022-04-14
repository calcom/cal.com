import { InstallAppButtonProps } from "../../types";

const VITAL_ENV = "sandbox";
const VITAL_REGION = "us";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const getLinkToken = async (client_user_id: String) => {
    const res = await fetch("/api/integrations/vital/token", {
      method: "POST",
      body: JSON.stringify({
        client_user_id,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      throw new Error("Failed to get link token");
    }
    return await res.json();
  };
  return (
    <>
      {props.render({
        onClick() {
          getLinkToken("test_user_123")
            .then((data) => {
              window.open(
                `https://link.tryvital.io/?token=${data?.token}&env=${VITAL_ENV}&region=${VITAL_REGION}`, "_self"
              );
            })
            .catch(console.error);
        },
      })}
    </>
  );
}
