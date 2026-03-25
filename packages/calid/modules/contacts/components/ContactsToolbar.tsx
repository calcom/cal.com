import { Button } from "@calid/features/ui/components/button";
import { Input } from "@calid/features/ui/components/input/input";
import { Search } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface ContactsToolbarProps {
  isMobile: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onAddContact: () => void;
}

export const ContactsToolbar = ({ isMobile, search, onSearchChange, onAddContact }: ContactsToolbarProps) => {
  const { t } = useLocale();

  return (
    <div
      className={`bg-background/95 sticky top-0 z-10 flex pb-3 backdrop-blur-sm ${
        isMobile ? "flex-col gap-3" : "items-center justify-between"
      }`}>
      <div className="relative max-w-sm flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("contacts_search_contacts")}
          className="h-9 pl-9"
        />
      </div>

      <Button onClick={onAddContact} className="h-9" StartIcon="plus">
        {t("contacts_add_contact")}
      </Button>
    </div>
  );
};
