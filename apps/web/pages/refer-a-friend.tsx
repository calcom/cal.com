import classNames from "classnames";
import Head from "next/head";
import { useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { Input, Label } from "@calcom/ui/form/fields";

import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";
import Shell from "@components/Shell";

const ReferAFriend = () => {
  const { t } = useLocale();
  const { data: referral, isLoading } = trpc.useQuery(["viewer.referrals"]);

  const [referralLink, setReferralLink] = useState<string>();

  useEffect(() => {
    if (referral) {
      setReferralLink(`${process.env.NEXT_PUBLIC_WEBSITE_URL}/i/${referral.username}${referral.referralPin}`);
    }
  }, [referral]);

  return (
    <>
      <Head>
        <title>Refer A Friend</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Shell
        heading={t("refer_a_friend") as string}
        subtitle="Refer more friends to get more rewards while using Cal">
        {!isLoading ? (
          <>
            <hr className="h-2 border-neutral-200" />

            <div className="block sm:flex">
              <div className="mb-6 w-full sm:w-1/2">
                <div>
                  <Label htmlFor="username">Share referral code</Label>
                </div>
                <div className="mt-1 flex rounded-md">
                  <input
                    value={referralLink}
                    className="mt-1 mr-2 block w-full rounded-sm border-gray-300 p-1 focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
                    readOnly
                  />
                  <Button className="mt-1">Copy</Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <Loader />
        )}
      </Shell>
    </>
  );
};

export default ReferAFriend;
