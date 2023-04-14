import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";
import { ExternalLink } from "@calcom/ui/components/icon";

export default function HowToUse() {
  const { t } = useLocale();
  return (
    <div className="bg-emphasis flex h-screen">
      <div className="bg-default m-auto rounded p-10">
        <div className="flex flex-row">
          <div className="mr-5">
            <img className="w-11" src="/api/app-store/typeform/icon.svg" alt="Zapier Logo" />
          </div>
          <div className="ml-5">
            <div className="text-md text-default">How to route a Typeform with Cal.com Routing</div>
            <ol className="mt-5 mb-5 ml-5 list-decimal ltr:mr-5 rtl:ml-5">
              <li>
                Make sure that you have{" "}
                <Link href="/apps/routing-forms" className="text-subtle text-base">
                  Routing Forms
                </Link>{" "}
                app installed
              </li>
              <li>
                Create a Routing Form with fields on the basis of which you want your typeform routing to work
              </li>
              <li>
                <Link
                  href="/api/app-store/typeform/copy-typeform-redirect-url.png"
                  target="_blank"
                  className="text-subtle inline-flex items-baseline text-base">
                  <ExternalLink className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" aria-hidden="true" />
                  Click &quot;Copy Typeform Redirect URL&quot;
                </Link>
              </li>
              <li>Create a Typeform that you want to route through Cal.com form&apos;s routing</li>
              <li>
                Add the copied URL as{" "}
                <Link
                  href="https://www.typeform.com/help/a/end-screens-and-redirects-360051791392/#h_01G0CFXF21W2EQ8PXKSB4KSC8P"
                  target="_blank"
                  className="text-subtle inline-flex items-baseline text-base">
                  <ExternalLink className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" aria-hidden="true" />
                  Redirect to your typeform
                </Link>
              </li>
              <li>
                Use{" "}
                <Link
                  href="https://www.typeform.com/help/a/use-recall-information-to-reference-typeform-answers-variables-and-more-360052320011/"
                  target="_blank"
                  className="text-subtle inline-flex items-baseline text-base">
                  <ExternalLink className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" aria-hidden="true" />
                  Recall Information in Typeform
                </Link>{" "}
                to add values to query params.
              </li>
              <li>
                You&apos;re set! Now, when the Typeform gets responses they would be routed through Cal.com
                routing
              </li>
            </ol>

            <Link href="/apps/installed" passHref={true} legacyBehavior>
              <Button color="secondary">{t("done")}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
