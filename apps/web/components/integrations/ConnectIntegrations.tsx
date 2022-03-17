import { useState } from "react";
import { useMutation } from "react-query";

import { AddIntegration } from "@calcom/app-store/components";
import type { IntegrationOAuthCallbackState } from "@calcom/app-store/types";
import { ButtonBaseProps } from "@calcom/ui/Button";
import { DialogProps } from "@calcom/ui/Dialog";

import { NEXT_PUBLIC_BASE_URL } from "@lib/config/constants";

type AddIntegrationModalType = (props: DialogProps) => JSX.Element;

const DummyComponent = ({ children, ...props }: any) => <>{children}</>;

export default function ConnectIntegration(props: {
  type: string;
  render: (renderProps: ButtonBaseProps) => JSX.Element;
  onOpenChange: (isOpen: boolean) => unknown | Promise<unknown>;
}) {
  const { type } = props;
  const appName = type.replace("_", "");
  const [isLoading, setIsLoading] = useState(false);

  const mutation = useMutation(async () => {
    const state: IntegrationOAuthCallbackState = {
      returnTo: NEXT_PUBLIC_BASE_URL + location.pathname + location.search,
    };
    const stateStr = encodeURIComponent(JSON.stringify(state));
    const searchParams = `?state=${stateStr}`;
    const res = await fetch(`/api/integrations/${appName}/add` + searchParams);
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

  const DynamicAddIntegration: AddIntegrationModalType = AddIntegration[appName] || DummyComponent;

  return (
    <>
      {props.render({
        onClick() {
          if (!!AddIntegration[appName]) {
            // special handlers
            setIsModalOpen(true);
            return;
          }

          mutation.mutate();
        },
        loading: mutation.isLoading || isLoading,
        disabled: isModalOpen,
      })}
      <DynamicAddIntegration open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
