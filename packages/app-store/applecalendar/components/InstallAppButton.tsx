import { useRouter } from "next/router";
import { useState } from "react";

import { InstallAppButtonProps } from "../../types";
import AddIntegration from "./AddIntegration";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const appRoute = "/apps/apple-calendar";
  return (
    <>
      {props.render({
        onClick() {
          if (router.asPath !== appRoute) {
            router.push(appRoute);
            setIsLoading(true);
          } else {
            setIsModalOpen(true);
          }
        },
        disabled: isModalOpen,
        loading: isLoading,
      })}
      <AddIntegration open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
