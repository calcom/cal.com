import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import Loader from "../../../../apps/web/components/Loader";

import { Button } from "@calcom/ui";

interface IZapierSetupProps {
  trpc: any;
}

export default function ZapierSetup(props: IZapierSetupProps) {
  const { trpc } = props;
  const router = useRouter();
  const [newApiKey, setNewApiKey] = useState("");
  const utils = trpc.useContext();
  const { data: session, status } = useSession();
  const { isSuccess, isLoading, data } = trpc.useQuery(["viewer.integrations"]);
  const zapierCredentials: { credentialIds: number[] } | undefined = data?.other?.items.find(
    (item: { type: string }) => item.type === "zapier_other"
  );
  const [credentialId] = zapierCredentials?.credentialIds || [false];

  async function createApiKey() {
    const event = { note: "Zapier", expiresAt: null };
    const apiKey = await utils.client.mutation("viewer.apiKeys.create", event);

    setNewApiKey(apiKey);
    deleteApiKey();
  }

  async function deleteApiKey() {
    //Todo: delete old API key
  }

  if (isLoading) {
    return (
      <div className="absolute z-50 flex items-center w-full h-screen bg-gray-200">
        <Loader />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.replace({
      pathname: "/auth/login",
    });
  }

  return (
    <div className="flex h-screen bg-gray-200">
      {status === "authenticated" ? (
        data && isSuccess && credentialId ? (
          <div className="p-10 m-auto bg-white rounded">
            <div className="flex flex-row">
              <div className="mr-5">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 256 256"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMidYMid">
                  <path
                    d="M159.999 128.056a76.55 76.55 0 0 1-4.915 27.024 76.745 76.745 0 0 1-27.032 4.923h-.108c-9.508-.012-18.618-1.75-27.024-4.919A76.557 76.557 0 0 1 96 128.056v-.112a76.598 76.598 0 0 1 4.91-27.02A76.492 76.492 0 0 1 127.945 96h.108a76.475 76.475 0 0 1 27.032 4.923 76.51 76.51 0 0 1 4.915 27.02v.112zm94.223-21.389h-74.716l52.829-52.833a128.518 128.518 0 0 0-13.828-16.349v-.004a129 129 0 0 0-16.345-13.816l-52.833 52.833V1.782A128.606 128.606 0 0 0 128.064 0h-.132c-7.248.004-14.347.62-21.265 1.782v74.716L53.834 23.665A127.82 127.82 0 0 0 37.497 37.49l-.028.02A128.803 128.803 0 0 0 23.66 53.834l52.837 52.833H1.782S0 120.7 0 127.956v.088c0 7.256.615 14.367 1.782 21.289h74.716l-52.837 52.833a128.91 128.91 0 0 0 30.173 30.173l52.833-52.837v74.72a129.3 129.3 0 0 0 21.24 1.778h.181a129.15 129.15 0 0 0 21.24-1.778v-74.72l52.838 52.837a128.994 128.994 0 0 0 16.341-13.82l.012-.012a129.245 129.245 0 0 0 13.816-16.341l-52.837-52.833h74.724c1.163-6.91 1.77-14 1.778-21.24v-.186c-.008-7.24-.615-14.33-1.778-21.24z"
                    fill="#FF4A00"
                  />
                </svg> {/*change that*/}
              </div>
              <div className="ml-5">
                <div className="text-gray-600">Setting up your Zapier integration </div>
                {!newApiKey ? (
                  <>
                    <div className="mt-1 text-xl">Generate API key:</div>
                    <Button onClick={() => createApiKey()} className="mt-4 mb-4">
                      Generate Api Key
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="mt-1 text-xl">Your unique API</div>
                    <div className="p-3 mt-3 bg-gray-200 rounded">{newApiKey}</div>
                    <div className="mt-2 mb-5 text-sm font-semibold text-gray-600">Copy this API key and save it somewhere safe. If you lose this key you have to generate a new one.</div>
                  </>
                )}

                <ul className="mt-5 mb-5 mr-5">
                  <li>1. Log into your Zapier account and create a new Zap.</li>
                  <li>2. Select Cal.com as your Trigger app. Also choose a Trigger event.</li>
                  <li>
                    3. Choose your account and then enter your Unique API Key.
                  </li>
                  <li>4. Test your Trigger.</li>
                  <li>5. You're set!</li>
                </ul>
                <Link href={"/apps/installed"} passHref={true}>
                  <Button>Done</Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 ml-5">
            <div>Please first install the Zapier App in the app store.</div>
            <div className="mt-3">
              <Link href={"/apps/zapier"} passHref={true}>
                <Button>Go to App Store</Button>
              </Link>
            </div>
          </div>
        )
      ) : (
        <></>
      )
      }
    </div>
  );

}
