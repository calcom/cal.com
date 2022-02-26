import type { IntegrationOAuthCallbackState } from "pages/api/integrations/types";
import { useState } from "react";
import { useMutation } from "react-query";

import { AddAppleIntegrationModal } from "@lib/integrations/calendar/components/AddAppleIntegration";
import { AddCalDavIntegrationModal } from "@lib/integrations/calendar/components/AddCalDavIntegration";

import { ButtonBaseProps } from "@components/ui/Button";

export default function ConnectIntegration(props: {
  type: string;
  render: (renderProps: ButtonBaseProps) => JSX.Element;
  onOpenChange: (isOpen: boolean) => unknown | Promise<unknown>;
}) {
  const { type } = props;
  const [isLoading, setIsLoading] = useState(false);

  const mutation = useMutation(async () => {
    const state: IntegrationOAuthCallbackState = {
      returnTo: location.pathname + location.search,
    };
    const stateStr = encodeURIComponent(JSON.stringify(state));
    const searchParams = `?state=${stateStr}`;
    const res = await fetch("/api/integrations/" + type.replace("_", "") + "/add" + searchParams);
    if (!res.ok) {
      throw new Error("Something went wrong");
    }
    const json = await res.json();
    window.location.href = json.url;
    setIsLoading(true);
  });
  const [isModalOpen, _setIsModalOpen] = useState(false);

  const setIsModalOpen = (v: boolean) => {
    _setIsModalOpen(v);
    props.onOpenChange(v);
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
