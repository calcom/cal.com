import { Button } from "@calid/features/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@calid/features/ui/components/card";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { StickyNote } from "lucide-react";

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
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <StickyNote className="h-4 w-4" /> Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TextArea
          rows={4}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Add notes about this contact..."
          className="border-default text-sm"
          disabled={isSaving}
        />
        {saveErrorMessage ? <p className="text-destructive mt-2 text-xs">{saveErrorMessage}</p> : null}
        {hasChanges ? (
          <Button className="mt-2" onClick={onSave} loading={isSaving} disabled={isSaving}>
            Save Notes
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};
