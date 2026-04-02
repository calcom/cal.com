import { useState } from "react";
import type { InstallAppButtonProps } from "../../types";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const getLinkToken = async () => {
    const res = await fetch("/api/integrations/vital/token", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      throw new Error("Failed to get link token");
    }
    return await res.json();
  };
  const [loading, setLoading] = useState(false);
  return (
    <>
      {props.render({
        onClick() {
          setLoading(true);
          getLinkToken()
            .then((data) => {
              setLoading(false);
              window.open(`${data.url}&token=${data.token}`, "_self");
            })
            .catch((error) => {
              setLoading(false);
              console.error(error);
            });
        },
        loading: loading,
      })}
    </>
  );
}
