import type { Dispatch, SetStateAction } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";

interface UnsavedChangesDialogProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    onDiscard: () => void;
}

const UnsavedChangesDialog = ({ isOpen, setIsOpen, onDiscard }: UnsavedChangesDialogProps) => {
    const { t } = useLocale();

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent
                title={t("leave_without_saving")}
                description={t("leave_without_saving_event_description")}
                Icon="circle-alert"
                type="confirmation">
                <DialogFooter className="mt-6">
                    <Button onClick={() => setIsOpen(false)} color="minimal">
                        {t("go_back")}
                    </Button>
                    <Button
                        onClick={() => {
                            setIsOpen(false);
                            onDiscard();
                        }}
                        color="destructive">
                        {t("discard")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UnsavedChangesDialog;