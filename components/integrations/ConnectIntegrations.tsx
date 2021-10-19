import { useRouter } from "next/router";
import { useState } from "react";
import { useMutation } from "react-query";

import { AddAppleIntegrationModal } from "@lib/integrations/Apple/components/AddAppleIntegration";
import { AddCalDavIntegrationModal } from "@lib/integrations/CalDav/components/AddCalDavIntegration";
import { trpc } from "@lib/trpc";

import { ButtonBaseProps } from "@components/ui/Button";

export default function ConnectIntegration(props: {
  type: string;
  render: (renderProps: ButtonBaseProps) => JSX.Element;
}) {
  const { type } = props;
  const router = useRouter();
  const refreshData = () => {
    router.replace(router.asPath);
  };
  const [isLoading, setIsLoading] = useState(false);
  const mutation = useMutation(async () => {
    const res = await fetch("/api/integrations/" + type.replace("_", "") + "/add");
    if (!res.ok) {
      throw new Error("Something went wrong");
    }
    const json = await res.json();
    window.location.href = json.url;
    setIsLoading(true);
  });
  const [isModalOpen, _setIsModalOpen] = useState(false);
  const utils = trpc.useContext();

  const setIsModalOpen: typeof _setIsModalOpen = (v) => {
    _setIsModalOpen(v);
    // refetch intergrations on modal toggles

    // FIXME Find a better way to refresh data on onboarding (or migrate to tRPC)
    if (router.pathname === "/getting-started") {
      refreshData();
    } else {
      utils.invalidateQueries(["viewer.integrations"]);
    }
  };

  return (
    <>
      {props.render({
        onClick() {
          if (["caldav_calendar", "apple_calendar"].includes(type)) {
            // special handlers
            setIsModalOpen(true);
            return;
          }

          mutation.mutate();
        },
        loading: mutation.isLoading || isLoading,
        disabled: isModalOpen,
      })}
      {type === "caldav_calendar" && (
        <AddCalDavIntegrationModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      )}

      {type === "apple_calendar" && (
        <AddAppleIntegrationModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      )}
    </>
  );
}
