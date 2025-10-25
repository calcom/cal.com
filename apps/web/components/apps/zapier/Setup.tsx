import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

export default function ZapierSetup() {
  const { t } = useLocale();

  return (
    <div className="bg-emphasis flex h-screen items-center justify-center p-4">
      <div className="text-center">
        <p className="mb-4 text-lg font-medium">
          {t("zapier_integration_intro", "Integrate Cal.com with Zapier in a few clicks.")}
        </p>
        <Link href="https://zapier.com/apps/calcom/integrations" passHref>
          <Button color="secondary" size="lg">
            {t("zapier_go_to_integration", "Go to Zapier Integration")}
          </Button>
        </Link>
        <p className="text-subtle mt-3 text-sm">
          {t("zapier_redirect_note", "You’ll be redirected to Zapier to complete the setup.")}
        </p>
      </div>
    </div>
  );
}
