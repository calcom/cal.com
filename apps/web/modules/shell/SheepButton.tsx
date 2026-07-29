"use client";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { useSession } from "next-auth/react";
import { useState } from "react";

export function SheepButton() {
  const { status } = useSession();
  const isEmbed = useIsEmbed();
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  if (status !== "authenticated" || isEmbed) return null;

  return (
    <>
      <Button color="secondary" data-testid="sheep-button" onClick={() => setIsOpen(true)}>
        {t("sheep")}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent title={t("sheep")} size="lg" data-testid="sheep-dialog">
          <div
            className="flex select-none items-center justify-center py-10 text-[clamp(8rem,30vw,20rem)] leading-none"
            role="img"
            aria-label={t("sheep")}>
            🐑
          </div>
          <DialogFooter>
            <DialogClose />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
