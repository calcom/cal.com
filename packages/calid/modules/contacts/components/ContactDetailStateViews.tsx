import { Button } from "@calid/features/ui/components/button";
import { Loader2 } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface ContactDetailInvalidStateProps {
  onBack: () => void;
}

export const ContactDetailInvalidState = ({ onBack }: ContactDetailInvalidStateProps) => {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h3 className="mb-1 text-lg font-semibold">{t("contacts_invalid_contact")}</h3>
      <p className="text-muted-foreground mb-4 text-sm">{t("contacts_contact_id_invalid")}</p>
      <Button color="secondary" onClick={onBack}>
        {t("contacts_back_to_contacts")}
      </Button>
    </div>
  );
};

export const ContactDetailLoadingState = () => {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  );
};

interface ContactDetailNotFoundStateProps {
  onBack: () => void;
}

export const ContactDetailNotFoundState = ({ onBack }: ContactDetailNotFoundStateProps) => {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h3 className="mb-1 text-lg font-semibold">{t("contacts_contact_not_found")}</h3>
      <p className="text-muted-foreground mb-4 text-sm">{t("contacts_contact_may_have_been_removed")}</p>
      <Button color="secondary" onClick={onBack}>
        {t("contacts_back_to_contacts")}
      </Button>
    </div>
  );
};

interface ContactDetailErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ContactDetailErrorState = ({ message, onRetry }: ContactDetailErrorStateProps) => {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h3 className="mb-1 text-lg font-semibold">{t("contacts_failed_to_load_contact")}</h3>
      <p className="text-muted-foreground mb-4 text-sm">
        {message || t("contacts_please_try_again_in_a_moment")}
      </p>
      <Button color="secondary" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
};
