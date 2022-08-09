import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import classNames from "classnames";
import crypto from "crypto";
import Head from "next/head";
import { useState, useRef } from "react";
import { Controller, useForm } from "react-hook-form";

import { CAL_URL, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";
import Shell from "@calcom/ui/Shell";
import SkeletonLoader from "@calcom/ui/apps/SkeletonLoader";
import { Form } from "@calcom/ui/form/fields";
import { Input, Label } from "@calcom/ui/form/fields";

import { defaultAvatarSrc } from "@lib/profile";

import Loader from "@components/Loader";
import AvatarGroup from "@components/ui/AvatarGroup";
import { AvatarSSR } from "@components/ui/AvatarSSR";

interface Referrer {
  id: number;
  username: string | undefined;
  referralPin: number | undefined;
}

interface Referees {
  name: string | null;
  username: string | null;
  avatar: string | null;
  email: string | undefined;
  plan: string | undefined;
}

const ReferAFriend = () => {
  const { t } = useLocale();
  const { data, isLoading } = trpc.useQuery(["viewer.referrals.referralsQuery"], {
    onSuccess: () => {
      if (data) {
        setReferralLink(
          `${WEBSITE_URL}/signup/?referralCode=${data?.referrer?.username}${data?.referrer?.referralPin}`
        );

        setFreeReferees(data?.freeReferees);
        setProReferees(data?.proReferees);
      }
    },
  });
  const sendReferralEmails = trpc.useMutation("viewer.referrals.sendReferralEmail");

  const emailRef = useRef<HTMLInputElement>(null!);

  const [referralLink, setReferralLink] = useState<string>();
  const [freeRefereesVisible, setFreeRefereesVisible] = useState(false);
  const [proRefereesVisible, setProRefereesVisible] = useState(false);
  const [freeReferees, setFreeReferees] = useState<Referees[]>();
  const [proReferees, setProReferees] = useState<Referees[]>();
  const [disableSendingEmails, setDisableSendingEmails] = useState(false);

  const formMethods = useForm();

  const onSubmit = () => {
    console.log("Enter hit");
    sendReferralEmails.mutate(
      {
        emails: emailRef.current.value,
        referrer: {
          name: data?.referrer?.name || "",
          username: data?.referrer?.username,
          referralPin: data?.referrer?.referralPin,
        },
      },
      {
        onSuccess: () => {
          showToast("Emails sent successfully", "success");
          setDisableSendingEmails(true);
        },
        onError: () => {
          showToast("Emails failed to send", "error");
        },
      }
    );
  };

  return (
    <>
      <Head>
        <title>{t("refer_a_friend_title")}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Shell
        heading={t("refer_a_friend") as string}
        subtitle="Refer more friends to get more rewards while using Cal"
        centered>
        {!isLoading ? (
          <div>
            <hr className="h-2 border-neutral-200" />

            <Form form={formMethods} handleSubmit={onSubmit}>
              {/* <div className="block sm:flex">
                <div className="mb-6 w-full sm:w-1/2"> */}
              <div>
                <div className="mb-6">
                  <div>
                    <Label htmlFor="username">{t("share_via_email")}</Label>
                  </div>
                  <div className="mt-1 flex rounded-md">
                    <Controller
                      name="emails"
                      control={formMethods.control}
                      render={() => (
                        <Input
                          ref={emailRef}
                          name="emails"
                          type="text"
                          // value={emails}
                          className=" mt-1 mr-2 block w-full rounded-lg border-gray-300 p-1 focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
                          placeholder="Email addresses"
                        />
                      )}
                    />
                    <Button
                      className="mt-1 rounded-lg"
                      onClick={onSubmit}
                      loading={sendReferralEmails.isLoading}
                      disabled={disableSendingEmails}>
                      {t("send")}
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500" id="email-description">
                    {t("separate_emails_with_comma")}
                  </p>
                </div>
              </div>
            </Form>
            <div>
              <div className="mb-6">
                <div>
                  <Label htmlFor="username">{t("share_referral_code")}</Label>
                </div>
                <div className="mt-1 flex rounded-md">
                  <Input
                    value={referralLink}
                    name="referralCode"
                    className="mt-1 mr-2 block w-full rounded-lg border-gray-300 p-1 focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
                    readOnly
                  />
                  <Button
                    className="mt-1 rounded-lg"
                    onClick={() => {
                      navigator.clipboard.writeText(referralLink || `${WEBSITE_URL}`);
                      showToast("Referral link copied", "success");
                    }}>
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <hr className="mb-2 h-2 border-neutral-200" />

            <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-gray-900">
              {t("track_your_referrals")}
            </h1>
            <p className="mb-2 text-sm text-neutral-500 ltr:mr-4 rtl:ml-4">
              {t("see_how_many_have_signed_up")}
            </p>

            <div className="-mx-4 mb-16 overflow-hidden rounded-lg border border-gray-200 bg-white sm:mx-0">
              <ul className="divide-y divide-neutral-200" data-testid="event-types">
                <li>
                  <Collapsible
                    open={freeRefereesVisible}
                    onOpenChange={() => setFreeRefereesVisible(!freeRefereesVisible)}>
                    <CollapsibleTrigger className="flex w-full">
                      <div className={classNames("flex w-full items-center justify-between")}>
                        <span className="m-3 truncate font-medium text-neutral-900 ltr:mr-1 rtl:ml-1">
                          {t("free_account_signups")}
                        </span>
                        {!freeRefereesVisible && freeReferees && (
                          <AvatarGroup
                            border="border-2 dark:border-gray-800 border-white"
                            items={freeReferees?.map((referee) => ({
                              image:
                                `${CAL_URL}/${referee.username}/avatar.png` ||
                                defaultAvatarSrc({
                                  md5: crypto
                                    .createHash("md5")
                                    .update((referee.email as string) || "guest@example.com")
                                    .digest("hex"),
                                }),
                            }))}
                            size={9}
                            truncateAfter={5}
                            className="ml-72"
                          />
                        )}

                        <Icon.FiChevronLeft
                          className={`${
                            freeRefereesVisible && "-rotate-90 transform"
                          } ml-auto mr-1 h-5 w-5 text-neutral-500`}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul>
                        {freeReferees &&
                          freeReferees.map((referee) => (
                            <li className="divide-y" key={referee.name}>
                              <div className="my-4 flex justify-between">
                                <div className="flex w-full flex-col justify-between sm:flex-row">
                                  <div className="flex">
                                    <AvatarSSR
                                      imageSrc={referee.avatar || ""}
                                      alt={referee.name || ""}
                                      className="h-9 w-9 rounded-full"
                                    />
                                    <div className="ml-3 inline-block">
                                      <span className="text-sm font-bold text-neutral-700">
                                        {referee.name}
                                      </span>
                                      <span
                                        className="-mt-1 block text-xs text-gray-400"
                                        data-testid="member-email"
                                        data-email={referee.email}>
                                        {referee.email}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
                <li>
                  <Collapsible
                    open={proRefereesVisible}
                    onOpenChange={() => setProRefereesVisible(!proRefereesVisible)}>
                    <CollapsibleTrigger className="flex w-full">
                      <div className={classNames("flex w-full items-center justify-between")}>
                        <span className="m-3 truncate font-medium text-neutral-900 ltr:mr-1 rtl:ml-1">
                          {t("pro_account_signups")}
                        </span>
                        {!proRefereesVisible && proReferees && (
                          <AvatarGroup
                            border="border-2 dark:border-gray-800 border-white"
                            items={proReferees?.map((referee) => ({
                              image:
                                `${CAL_URL}/${referee.username}/avatar.png` ||
                                defaultAvatarSrc({
                                  md5: crypto
                                    .createHash("md5")
                                    .update((referee.email as string) || "guest@example.com")
                                    .digest("hex"),
                                }),
                            }))}
                            size={9}
                            truncateAfter={5}
                            className="ml-72"
                          />
                        )}

                        <Icon.FiChevronLeft
                          className={`${
                            proRefereesVisible && "-rotate-90 transform"
                          } ml-auto mr-1 h-5 w-5 text-neutral-500`}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul>
                        {proReferees &&
                          proReferees.map((referee) => (
                            <li className="divide-y" key={referee.name}>
                              <div className="my-4 flex justify-between">
                                <div className="flex w-full flex-col justify-between sm:flex-row">
                                  <div className="flex">
                                    <AvatarSSR
                                      imageSrc={referee.avatar || ""}
                                      alt={referee.name || ""}
                                      className="h-9 w-9 rounded-full"
                                    />
                                    <div className="ml-3 inline-block">
                                      <span className="text-sm font-bold text-neutral-700">
                                        {referee.name}
                                      </span>
                                      <span
                                        className="-mt-1 block text-xs text-gray-400"
                                        data-testid="member-email"
                                        data-email={referee.email}>
                                        {referee.email}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              </ul>
            </div>

            <hr className="my-2 h-2 border-neutral-200" />

            <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-gray-900">
              {t("referral_perks_coming_soon")}
            </h1>
            <p className="text-sm text-neutral-500 ltr:mr-4 rtl:ml-4">{t("check_out_referral_perks")}</p>
          </div>
        ) : (
          <SkeletonLoader />
        )}
      </Shell>
    </>
  );
};

export default ReferAFriend;
