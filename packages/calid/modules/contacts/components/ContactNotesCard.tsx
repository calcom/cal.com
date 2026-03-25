import { Button } from "@calid/features/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@calid/features/ui/components/card";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { StickyNote } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface ContactNotesCardProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  hasChanges: boolean;
  onSave: () => void;
  isSaving?: boolean;
  saveErrorMessage?: string | null;
}

export const ContactNotesCard = ({
  notes,
  onNotesChange,
  hasChanges,
  onSave,
  isSaving = false,
  saveErrorMessage,
}: ContactNotesCardProps) => {
  const { t } = useLocale();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <StickyNote className="h-4 w-4" /> {t("contacts_notes")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TextArea
          rows={4}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder={t("contacts_add_notes_about_contact")}
          className="border-default text-sm"
          disabled={isSaving}
        />
        {saveErrorMessage ? <p className="text-destructive mt-2 text-xs">{saveErrorMessage}</p> : null}
        {hasChanges ? (
          <Button className="mt-2" onClick={onSave} loading={isSaving} disabled={isSaving}>
            {t("contacts_save_notes")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};
