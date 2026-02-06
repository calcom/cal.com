/**
 * This component provides a text input field for users to enter a custom URL slug in their routing form.
 * It includes validation error display and helpful information about field identifiers. 
 */
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TextField } from "@calcom/ui/components/form";
import Link from "next/link";

interface CustomEventTypeSlugInputProps {
  disabled?: boolean;
  eventTypePrefix: string;
  customEventTypeSlug: string;
  urlValidationError: string | null;
  fieldIdentifiers: string[];
  onChange: (value: string) => boolean;
}

export const CustomEventTypeSlugInput = ({
  disabled,
  eventTypePrefix,
  customEventTypeSlug,
  urlValidationError,
  fieldIdentifiers,
  onChange,
}: CustomEventTypeSlugInputProps) => {
  const { t } = useLocale();

  return (
    <>
      <TextField
        disabled={disabled}
        className="border-default flex w-full grow text-sm"
        containerClassName="grow mt-2"
        addOnLeading={eventTypePrefix}
        required
        value={customEventTypeSlug}
        onChange={(e) => onChange(e.target.value)}
        placeholder="event-url"
      />
      <div className="mt-2">
        {urlValidationError ? (
          <p className="text-error text-xs">{urlValidationError}</p>
        ) : (
          <p className="text-subtle text-xs">
            {fieldIdentifiers.length
              ? t("field_identifiers_as_variables_with_example", {
                  variable: `{${fieldIdentifiers[0]}}`,
                })
              : t("field_identifiers_as_variables")}{" "}
            <Link
              href="https://cal.com/help/routing/connect-routing-form-to-booking-questions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emphasis underline">
              {t("learn_more")}
            </Link>
          </p>
        )}
      </div>
    </>
  );
};
