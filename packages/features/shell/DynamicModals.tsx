"use client";

import { WelcomeToOrganizationsModal } from "@calcom/features/ee/organizations/components/WelcomeToOrganizationsModal";

import { WelcomeToCalcomModal } from "./components/WelcomeToCalcomModal";

/**
 * Container for all query-param driven modals that should appear globally across the app.
 * This keeps the Shell component clean and provides a centralized place for dynamic modals.
 *
 * We can probably also use this for thinks like the T&C and Privacy Policy modals. That @marketing are discussing
 *
 * To add a new modal:
 * 1. Create the modal component with its own useQueryState hook
 * 2. Import and add it here
 */
export function DynamicModals() {
  return (
    <>
      <WelcomeToOrganizationsModal />
      <WelcomeToCalcomModal />
      {/* Add more query-param driven modals here */}
    </>
  );
}
