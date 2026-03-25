import { Button } from "@calid/features/ui/components/button";
import { SearchX, UserX } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface NoContactsStateProps {
  onAddContact: () => void;
}

export const NoContactsState = ({ onAddContact }: NoContactsStateProps) => {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <UserX className="text-muted-foreground h-7 w-7" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">{t("contacts_no_contacts_yet")}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        {t("contacts_no_contacts_yet_description")}
      </p>
      <Button onClick={onAddContact} StartIcon="plus">
        {t("contacts_add_contact")}
      </Button>
    </div>
  );
};

export const NoContactResultsState = () => {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-muted mb-3 flex h-14 w-14 items-center justify-center rounded-full">
        <SearchX className="text-muted-foreground h-6 w-6" />
      </div>
      <h3 className="mb-1 text-sm font-semibold">{t("contacts_no_results_found")}</h3>
      <p className="text-muted-foreground text-xs">{t("contacts_try_adjusting_search")}</p>
    </div>
  );
};
