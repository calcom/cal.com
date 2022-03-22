import { useState } from "react";
import { useMutation } from "react-query";

import { NEXT_PUBLIC_BASE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/Button";

import type { IntegrationOAuthCallbackState } from "../../types";
import AddIntegration from "./AddIntegration";

function useAddIntegrationMutation() {
  const mutation = useMutation(async () => {
    const state: IntegrationOAuthCallbackState = {
      returnTo: NEXT_PUBLIC_BASE_URL + location.pathname + location.search,
    };
    const stateStr = encodeURIComponent(JSON.stringify(state));
    const searchParams = `?state=${stateStr}`;
    const res = await fetch(`/api/integrations/applecalendar/add` + searchParams);
    if (!res.ok) {
      throw new Error("Something went wrong");
    }
    const json = await res.json();
    window.location.href = json.url;
  });

  return mutation;
}

export default function InstallAppButton() {
  const { t } = useLocale();
  const mutation = useAddIntegrationMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setIsModalOpen(true);
        }}
        loading={mutation.isLoading}
        disabled={isModalOpen}>
        {t("install_app")}
      </Button>
      <AddIntegration open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
