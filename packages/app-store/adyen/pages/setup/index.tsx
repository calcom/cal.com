import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";

import AdyenSetupForm from "../../components/AdyenSetupForm";

export default function SetupPage() {
  const { t } = useLocale();
  return (
    <div className="bg-default flex h-screen">
      <div className="bg-default border-subtle m-auto max-w-[43em] overflow-auto rounded border pb-10 md:p-10">
        <div className="ml-2 ltr:mr-2 rtl:ml-2 md:ml-5">
          <div className="invisible md:visible">
            <img className="h-11" src="/api/app-store/adyen/icon.svg" alt="Paypal Payment Logo" />
            <p className="text-default mt-5 text-lg">Adyen</p>
          </div>
          <AdyenSetupForm />

          {
            <div>
              <p className="text-lgf text-default mt-5 font-bold">Getting started with Adyen</p>
              <p className="text-default font-semi mt-2">
                Here in Cal.com we offer Adyen as one of our payment gateway. You can use your own Adyen
                company/merchant account to receive payments from your customers enabling and setting up price
                and currency for each of your event types.
              </p>

              <p className="text-lgf text-default mt-5 inline-flex font-bold">
                <Icon name="circle-alert" className="mr-2 mt-1 h-4 w-4" /> Important requirements:
              </p>
              <ul className="text-default ml-1 mt-2 list-disc pl-2">
                <li>Adyen Company with live credentials </li>
                <li>viable Adyen Merchant account</li>
              </ul>

              <p className="text-default mb-2 mt-5 font-bold">Resources:</p>
              <a className="text-orange-600 underline" target="_blank" href="https://www.adyen.com/signup">
                Link to Adyen developer account sign up
              </a>

              <p className="text-lgf text-default mt-5 font-bold">Setup instructions</p>

              <ol className="text-default ml-1 mt-5 list-decimal pl-2">
                {/* @TODO: translate */}
                <li>
                  <a
                    target="_blank"
                    href="https://developer.paypal.com/dashboard/applications/live"
                    className="text-orange-600 underline">
                    Log into your Adyen account
                  </a>
                </li>
                <li>
                  <a
                    className="text-orange-600 underline"
                    target="_blank"
                    href="https://docs.adyen.com/development-resources/api-credentials/#generate-api-key">
                    Generate an API Key
                  </a>
                  {" and copy it in the fields above."}
                </li>
                <li>
                  In the same page, generate and copy the client key, be sure to add &quot;*.cal.com&quot; to
                  the list of allowed origin:
                </li>
                <li>
                  {
                    "Create the webhook for app.cal.com/api/integrations/adyen/webhook, Generate and paste the HMAC key for webhooks. "
                  }
                  <a
                    className="text-orange-600 underline"
                    target="_blank"
                    href="https://help.adyen.com/knowledge/ecommerce-integrations/webhooks/how-to-generate-a-new-hmac-key">
                    Relevant docs
                  </a>
                </li>
                <li>Lastly, paste the merchantId into the respective field.</li>
              </ol>
            </div>
          }
        </div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}
