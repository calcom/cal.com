import { parseAsBoolean, useQueryState } from "nuqs";
import { useEffect, useState } from "react";

import { sessionStorage } from "@calcom/lib/webstorage";

const STORAGE_KEY = "showWelcomeToCalcomModal";

export function useWelcomeToCalcomModal() {
  const [welcomeToCalcomModal, setWelcomeToCalcomModal] = useQueryState(
    "welcomeToCalcomModal",
    parseAsBoolean.withDefault(false)
  );

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (welcomeToCalcomModal) {
      setIsOpen(true);
      return;
    }

    if (sessionStorage.getItem(STORAGE_KEY) === "true") {
      setIsOpen(true);
    }
  }, [welcomeToCalcomModal]);

  const closeModal = () => {
    setIsOpen(false);
    // Remove the query param from URL
    setWelcomeToCalcomModal(null);
    // Also clear sessionStorage
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return {
    isOpen,
    closeModal,
  };
}

export function setShowWelcomeToCalcomModalFlag() {
  sessionStorage.setItem(STORAGE_KEY, "true");
}
