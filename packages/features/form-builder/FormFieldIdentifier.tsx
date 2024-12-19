import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, Tooltip } from "@calcom/ui";

const FormFieldIdentifier = ({
  fieldIdentifier,
  setIsEditing,
  disabled,
}: {
  fieldIdentifier?: string;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  disabled?: boolean;
}) => {
  const { t } = useLocale();
  return (
    <div className="dark:text-emphasis text-default mt-4 flex items-center gap-3 text-center">
      <div className="flex items-center gap-2 text-center">
        <span className="text-sm font-medium leading-none">{t("identifier")}</span>
        <Tooltip content={t("click_here_to_learn_more")}>
          <Link
            href="https://cal.com/docs/core-features/event-types/booking-questions#booking-field-identifier"
            target="_blank">
            <Icon name="info" className="h-4 w-4" />
          </Link>
        </Tooltip>
      </div>
      {fieldIdentifier && (
        <div className="bg-subtle dark:text-default text-emphasis flex items-center gap-2 rounded-md p-1 text-center">
          <span className="break-all text-sm">{fieldIdentifier}</span>
          {!disabled && (
            <Tooltip content={t("edit_identifier")}>
              <button onClick={() => setIsEditing(true)}>
                <Icon name="square-pen" className="h-4 w-4" />
              </button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
};

export default FormFieldIdentifier;
