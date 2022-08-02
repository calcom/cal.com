import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import classNames from "classnames";
import Head from "next/head";
import { useState, useEffect, useRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";
import Shell from "@calcom/ui/Shell";
import { Input, Label } from "@calcom/ui/form/fields";

import Loader from "@components/Loader";
import AvatarGroup from "@components/ui/AvatarGroup";

const ReferAFriend = () => {
  const { t } = useLocale();
  const { data: referral, isLoading } = trpc.useQuery(["viewer.referrals.referralsQuery"]);
  const sendReferralEmails = trpc.useMutation("viewer.referrals.sendReferralEmail");

  const emailRef = useRef<HTMLInputElement>(null!);

  const [referralLink, setReferralLink] = useState<string>();
  const [freeRefereesVisible, setFreeRefereesVisible] = useState(false);
  const [proRefereesVisible, setProRefereesVisible] = useState(false);
  // const [emails, setEmails] = useState<string>();

  useEffect(() => {
    if (referral) {
      setReferralLink(
        `${process.env.NEXT_PUBLIC_WEBSITE_URL}/signup/?referralCode=${referral.username}${referral.referralPin}`
      );
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
                  <Label htmlFor="username">Share via email</Label>
                </div>
                <div className="mt-1 flex rounded-md">
                  <Input
                    ref={emailRef}
                    name="emails"
                    type="email"
                    // value={emails}
                    className="mt-1 mr-2 block w-full rounded-sm border-gray-300 p-1 focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
                    placeholder="Email addresses"
                  />
                  <Button
                    className="mt-1"
                    onClick={() => {
                      sendReferralEmails.mutate({ emails: emailRef.current.value });
                    }}>
                    Send
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-500" id="email-description">
                  Separate multiple emails with commas
                </p>
              </div>
            </div>
            <div className="block sm:flex">
              <div className="mb-6 w-full sm:w-1/2">
                <div>
                  <Label htmlFor="username">Share referral code</Label>
                </div>
                <div className="mt-1 flex rounded-md">
                  <Input
                    value={referralLink}
                    name="referralCode"
                    className="mt-1 mr-2 block w-full rounded-sm border-gray-300 p-1 focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
                    readOnly
                  />
                  <Button
                    className="mt-1"
                    onClick={() => {
                      navigator.clipboard.writeText(referralLink);
                      showToast("Referral link copied");
                    }}>
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <hr className="mb-2 h-2 border-neutral-200" />

            <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-gray-900">
              Track your referrals
            </h1>
            <p className="mb-2 text-sm text-neutral-500 ltr:mr-4 rtl:ml-4">
              See how many friends have signed up with your referral
            </p>

            <div className="-mx-4 mb-16 overflow-hidden rounded-sm border border-gray-200 bg-white sm:mx-0">
              <ul className="divide-y divide-neutral-200">
                <li className="select-none">
                  <Collapsible
                    open={freeRefereesVisible}
                    onOpenChange={() => setFreeRefereesVisible(!freeRefereesVisible)}>
                    <CollapsibleTrigger className="flex w-full">
                      <div
                        className={classNames(
                          "flex w-full items-center justify-between hover:bg-neutral-50 "
                        )}>
                        <span className="m-3 truncate font-medium text-neutral-900 ltr:mr-1 rtl:ml-1">
                          Free account signups
                        </span>
                        <AvatarGroup border="border-2 dark:border-gray-800 border-white" />
                        <Icon.ChevronRight
                          className={`${
                            freeRefereesVisible ? "rotate-90 transform" : "rotate-180"
                          } ml-auto mr-1 h-5 w-5 text-neutral-500`}
                        />
                      </div>
                    </CollapsibleTrigger>
                  </Collapsible>
                </li>
                <li className="select-none">
                  <Collapsible
                    open={proRefereesVisible}
                    onOpenChange={() => setProRefereesVisible(!proRefereesVisible)}>
                    <CollapsibleTrigger className="flex w-full">
                      <div
                        className={classNames(
                          "flex w-full items-center justify-between hover:bg-neutral-50 "
                        )}>
                        <span className="m-3 truncate font-medium text-neutral-900 ltr:mr-1 rtl:ml-1">
                          Pro account signups
                        </span>
                        <Icon.ChevronRight
                          className={`${
                            proRefereesVisible ? "rotate-90 transform" : "rotate-180"
                          } ml-auto mr-1 h-5 w-5 text-neutral-500`}
                        />
                      </div>
                    </CollapsibleTrigger>
                  </Collapsible>
                </li>
              </ul>
            </div>

            <hr className="my-2 h-2 border-neutral-200" />

            <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-gray-900">
              Referral perks
            </h1>
            <p className="text-sm text-neutral-500 ltr:mr-4 rtl:ml-4">Check out your referral perks</p>
          </>
        ) : (
          <Loader />
        )}
      </Shell>
    </>
  );
};

export default ReferAFriend;
