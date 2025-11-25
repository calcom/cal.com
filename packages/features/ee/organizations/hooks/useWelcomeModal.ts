import { parseAsBoolean, useQueryState } from "nuqs";
import { useEffect, useState } from "react";

const STORAGE_KEY = "showNewOrgModal";

export function useWelcomeModal() {
  const [newOrganizationModal, setNewOrganizationModal] = useQueryState(
    "newOrganizationModal",
    parseAsBoolean.withDefault(false)
  );

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check query param first
    if (newOrganizationModal) {
      setIsOpen(true);
      return;
    }

    // Check sessionStorage as fallback (for cases where we redirect through personal onboarding)
    if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "true") {
      setIsOpen(true);
    }
  }, [newOrganizationModal]);

  const closeModal = () => {
    setIsOpen(false);
    // Remove the query param from URL
    setNewOrganizationModal(null);
    // Also clear sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  return {
    isOpen,
    closeModal,
  };
}

/**
 * Helper function to set the flag that triggers the welcome modal.
 * Use this before redirecting to ensure the modal shows after navigation.
 */
export function setShowNewOrgModalFlag() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, "true");
  }
}
