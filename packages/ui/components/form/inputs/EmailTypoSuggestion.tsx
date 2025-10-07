import { useLocale } from "@calcom/lib/hooks/useLocale";

interface EmailTypoSuggestionProps {
  suggestion: string;
  onAccept: (suggestion: string) => void;
}

export function EmailTypoSuggestion({ suggestion, onAccept }: EmailTypoSuggestionProps) {
  const { t } = useLocale();

  return (
    <div className="mt-2 flex items-center text-sm text-orange-600">
      <span>
        {t("did_you_mean")}{" "}
        <button
          type="button"
          onClick={() => onAccept(suggestion)}
          className="font-semibold underline hover:text-orange-700">
          {suggestion}
        </button>
        ?
      </span>
    </div>
  );
}
