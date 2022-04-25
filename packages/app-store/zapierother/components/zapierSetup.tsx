import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import Loader from "../../../../apps/web/components/Loader";
import Icon from './icon'

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

  if (isLoading || status === "loading") {
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
    status === "authenticated" ? (
      <div className="flex h-screen bg-gray-200">
        {data && isSuccess && credentialId ? (
          <div className="p-10 m-auto bg-white rounded">
            <div className="flex flex-row">
              <div className="mr-5">
                <Icon />
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
        }
      </div>
    ) : (
      <div className="absolute z-50 flex items-center w-full h-screen bg-gray-200">
        <Loader />
      </div>
    )
  );
}
