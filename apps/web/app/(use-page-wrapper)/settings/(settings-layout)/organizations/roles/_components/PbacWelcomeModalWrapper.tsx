"use client";

import { PbacWelcomeModal, usePbacWelcomeModal } from "./PbacWelcomeModal";

export function PbacWelcomeModalWrapper() {
  const { isOpen, onOpenChange } = usePbacWelcomeModal();

  return <PbacWelcomeModal open={isOpen} onOpenChange={onOpenChange} />;
}

