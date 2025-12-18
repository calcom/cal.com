import { useLocale } from "@calcom/lib/hooks/useLocale";
import { User } from "lucide-react";
import { Button } from "@calcom/ui/components/button";
import { Label } from "@calcom/ui/components/form";

interface VoiceSelectorProps {
  selectedVoiceId?: string;
  onVoiceDialogOpen: () => void;
  disabled?: boolean;
}

export function VoiceSelector({ selectedVoiceId, onVoiceDialogOpen, disabled = false }: VoiceSelectorProps) {
  const { t } = useLocale();

  return (
    <div>
      <Label className="text-emphasis mb-1 block text-sm font-medium">{t("voice")}</Label>
      <p className="text-subtle mb-1.5 text-xs">{t("select_voice_for_agent")}</p>
      <Button
        type="button"
        color="secondary"
        onClick={onVoiceDialogOpen}
        disabled={disabled}
        className="w-full justify-start">
        <User className="mr-2 h-4 w-4" />
        {selectedVoiceId ? <span className="text-sm">{selectedVoiceId}</span> : t("select_voice")}
      </Button>
    </div>
  );
}
