import dynamic from "next/dynamic";
import { useState } from "react";
import { useMutation } from "react-query";

import type { IntegrationOAuthCallbackState } from "@calcom/app-store/types";

import { NEXT_PUBLIC_BASE_URL } from "@lib/config/constants";

import { DialogProps } from "@components/Dialog";
import { ButtonBaseProps } from "@components/ui/Button";

type AddIntegrationModalType = (props: DialogProps) => JSX.Element;

export default function ConnectIntegration(props: {
  type: string;
  render: (renderProps: ButtonBaseProps) => JSX.Element;
  onOpenChange: (isOpen: boolean) => unknown | Promise<unknown>;
}) {
  const { type } = props;
  const [isLoading, setIsLoading] = useState(false);

  const mutation = useMutation(async () => {
    const state: IntegrationOAuthCallbackState = {
      returnTo: NEXT_PUBLIC_BASE_URL + location.pathname + location.search,
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
  const newPath = `@calcom/app-store/${type.split("_").join("")}/components/AddIntegration`;
  const AddIntegrationModal = dynamic(() =>
    import("" + newPath).catch(() => null)
  ) as AddIntegrationModalType;

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
      {<AddIntegrationModal open={isModalOpen} onOpenChange={setIsModalOpen} />}
    </>
  );
}
