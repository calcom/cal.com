import getFieldIdentifier from "@calcom/app-store/ee/routing_forms/lib/getFieldIdentifier";
import { CAL_URL } from "@calcom/lib/constants";
import useApp from "@calcom/lib/hooks/useApp";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Icon } from "@calcom/ui/Icon";

export default function CopyRedirectUrlButton({ form }: { form: ReturnType<typeof getSerializableForm> }) {
  const { t } = useLocale();

  const { data: typeformApp } = useApp("typeform");

  let typeformRedirectUrl = `${CAL_URL}/router?form=${form.id}`;
  form.fields?.forEach((field) => {
    typeformRedirectUrl += `&${getFieldIdentifier(field)}=VALUE`;
  });
  return typeformApp ? (
    <button
      onClick={() => {
        navigator.clipboard.writeText(typeformRedirectUrl);
        showToast("Typeform Redirect URL copied!", "success");
      }}
      type="button"
      className="text-md flex items-center rounded-sm px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900">
      <Icon.FiLink className="h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
      {t("Copy Typeform Redirect URL")}
    </button>
  ) : null;
}
