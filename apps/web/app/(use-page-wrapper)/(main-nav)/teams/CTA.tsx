"use client";
import posthog from "posthog-js";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

import { CreateTeamModal } from "~/ee/teams/components/CreateTeamModal";

export const TeamsCTA = () => {
  const { t } = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    posthog.capture("add_team_button_clicked");
    setIsModalOpen(true);
  };

  return (
    <>
      <Button
        data-testid="new-team-btn"
        variant="fab"
        StartIcon="plus"
        size="sm"
        type="button"
        onClick={handleOpenModal}>
        {t("new")}
      </Button>
      <CreateTeamModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
