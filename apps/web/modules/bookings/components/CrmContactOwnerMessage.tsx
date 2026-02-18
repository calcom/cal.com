import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ContactIcon } from "@coss/ui/icons";

export const CrmContactOwnerMessage = () => {
  const { t } = useLocale();
  const teamMemberEmail = useBookerStoreContext((state) => state.teamMemberEmail);
  const showCrmOwnerBanner = useBookerStoreContext((state) => state.showCrmOwnerBanner);

  if (!teamMemberEmail || !showCrmOwnerBanner) return null;

  return (
    <div className="bg-default border-subtle items-center gap-3 rounded-xl border p-3 text-sm shadow-md">
      <div className="flex items-center gap-3">
        <div className="relative">
          <ContactIcon className="h-5 w-5 text-blue-500" />
        </div>
        <div className="text-emphasis font-medium" data-testid="crm-contact-owner-msg">
          {t("booking_with_contact_owner_name", { email: teamMemberEmail })}
        </div>
      </div>
    </div>
  );
};
