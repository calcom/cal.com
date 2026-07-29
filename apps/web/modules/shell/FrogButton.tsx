"use client";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { useSession } from "next-auth/react";
import { useState } from "react";

export function FrogButton() {
  const { status } = useSession();
  const isEmbed = useIsEmbed();
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  if (status !== "authenticated" || isEmbed) return null;

  return (
    <>
      <Button color="secondary" data-testid="frog-button" onClick={() => setIsOpen(true)}>
        {t("frog")}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent title={t("frog")} size="lg" data-testid="frog-dialog">
          <div
            className="flex select-none items-center justify-center py-10 text-[clamp(8rem,30vw,20rem)] leading-none"
            role="img"
            aria-label={t("frog")}>
            🐸
          </div>
          <DialogFooter>
            <DialogClose />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
