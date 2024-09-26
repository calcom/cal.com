"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "next-i18next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { SMS_CREDITS_PER_MEMBER } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { MembershipRole, SmsCreditAllocationType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import {
  Meta,
  Badge,
  Select,
  TextField,
  Label,
  showToast,
  Button,
  Form,
  RadioGroup as RadioArea,
} from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import { SmsOveragesConfirmationDialog } from "../components/SmsOveragesConfirmationDialog";

type ProfileViewProps = { team: RouterOutputs["viewer"]["teams"]["get"] };

const smsCreditAllocationSchema = z.object({
  smsCreditAllocationType: z.enum([
    SmsCreditAllocationType.ALL,
    SmsCreditAllocationType.NONE,
    SmsCreditAllocationType.SPECIFIC,
  ]),
  smsCreditAllocationValue: z.number().optional(),
  smsOverageLimit: z.number(),
  smsOveragesEnabled: z.boolean(),
});

export type FormValues = z.infer<typeof smsCreditAllocationSchema>;

const SmsCreditsView = ({ team }: ProfileViewProps) => {
  const { t } = useLocale();

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  const totalSmsCredits = team?.members.filter((member) => member.accepted).length * SMS_CREDITS_PER_MEMBER;

  const allcationOptions = [
    { value: SmsCreditAllocationType.ALL, label: t("no_limit") },
    { value: SmsCreditAllocationType.NONE, label: t("none") },
    { value: SmsCreditAllocationType.SPECIFIC, label: t("specific") },
  ];

  const utils = trpc.useUtils();

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess(res) {
      await utils.viewer.teams.get.invalidate();
      showToast("Changes have been successfully updated", "success");
    },
  });

  const defaultValues: FormValues = {
    smsCreditAllocationType: team.smsCreditAllocationType ?? SmsCreditAllocationType.SPECIFIC,
    smsCreditAllocationValue: team.smsCreditAllocationValue ?? 50,
    smsOverageLimit: team.smsOverageLimit ?? 0,
    smsOveragesEnabled: team.smsOverageLimit > 0,
  };
  const form = useForm({
    defaultValues,
    resolver: zodResolver(smsCreditAllocationSchema),
  });

  const smsCreditAllocationType = useWatch({
    control: form.control,
    name: "smsCreditAllocationType",
  });

  const smsCreditAllocationValue = useWatch({
    control: form.control,
    name: "smsCreditAllocationValue",
  });

  const smsOverageLimit = useWatch({
    control: form.control,
    name: "smsOverageLimit",
  });

  const smsOveragesEnabled = useWatch({
    control: form.control,
    name: "smsOveragesEnabled",
  });

  const availableCredits = Math.max(totalSmsCredits - team.smsCreditsUsed, 0);

  const percentageReached = (team.smsCreditsUsed / totalSmsCredits) * 100;

  const smsLimitForMembers =
    smsCreditAllocationType === SmsCreditAllocationType.ALL
      ? totalSmsCredits
      : smsCreditAllocationType === SmsCreditAllocationType.NONE
      ? 0
      : smsCreditAllocationValue ?? 0;

  const membersAboveLimit = team.members.filter((member) => member.smsCreditsUsed >= smsLimitForMembers);

  const [paymentConfirmationDialogOpen, setPaymentConfirmationDialogOpen] = useState<boolean>(false);

  return (
    <>
      <Meta
        title={t("sms_credits")}
        description={t("managed_sms_credit_allocation")}
        borderInShellHeader={false}
      />
      {isAdmin ? (
        <>
          <>
            <div className="border-subtle mt-6 flex items-center rounded-t-lg border p-6 text-sm">
              <div>
                <p className="text-default text-base font-semibold">{t("sms_usage")}</p>
                <p className="text-default">
                  <Trans i18nKey="sms_usage_description">
                    Your team has 250 credits per member available. More information to sms credits{" "}
                    <a href="https://example.com" className="underline">
                      here
                    </a>
                  </Trans>
                </p>
              </div>
            </div>
            <div className="border-subtle rounded-b-md border border-t-0 px-4 py-8 sm:px-6">
              <div className="text-sm">{t("total_sms_credits_per_month", { credits: totalSmsCredits })}</div>
              <div className="mt-4 text-sm">{t("sms_credits_used", { credits: team.smsCreditsUsed })}</div>
              <div className="mt-4 text-sm">{t("available_sms_credits", { credits: availableCredits })}</div>
              <div>
                {team.smsLimitReached ? (
                  <Badge className="mt-2" variant="red">
                    {t("limit_reached")}
                  </Badge>
                ) : percentageReached >= 80 ? (
                  <Badge variant="orange">{t("percentage_used", { amount: percentageReached })}</Badge>
                ) : (
                  <></>
                )}
              </div>
            </div>
          </>
          <Form
            form={form}
            handleSubmit={(values) => {
              const { smsOverageLimit } = values;
              mutation.mutate({ id: team.id, smsOverageLimit });
            }}>
            <div className="border-subtle mt-6 flex items-center rounded-t-lg border p-6 text-sm">
              <div>
                <p className="text-default text-base font-semibold">{t("sms_beyond_limit")}</p>
                <p className="text-default">{t("sms_beyond_limit_description")}</p>
              </div>
            </div>
            <div className="border-subtle rounded-b-lg border px-4 pb-4 pt-8 sm:px-6">
              <RadioArea.Group
                className="mt-1 flex flex-col gap-4"
                value={form.watch("smsOveragesEnabled") ? "enabled" : "disabled"}
                onValueChange={(val: string) => {
                  const isEnabled = val === "enabled";
                  form.setValue("smsOveragesEnabled", isEnabled);
                  if (isEnabled) {
                    setPaymentConfirmationDialogOpen(true);
                  }
                }}>
                <RadioArea.Item className="bg-default w-full text-sm" value="disabled">
                  <strong className="mb-1 block">{t("Stop SMS sending")}</strong>
                  <p>{t("sms_limit_reached_stop_sending_description")}</p>
                </RadioArea.Item>
                <RadioArea.Item className="bg-default w-full text-sm" value="enabled">
                  <strong className="mb-1 block">{t("pay_sms_over_limit")}</strong>
                  <Trans i18nKey="allow_getting_charged_for_sms">
                    Allow getting charged for extra SMS beyond your limit. You will be charged at the end of
                    every month. Pricing details are available
                    <a href="https://www.example.com" className="underline" target="_blank">
                      here
                    </a>
                  </Trans>
                  {smsOveragesEnabled && !paymentConfirmationDialogOpen ? (
                    <div className="mt-4 flex">
                      <div className="max-w-36">
                        <Controller
                          name="smsOverageLimit"
                          control={form.control}
                          render={({ field: { value, onChange } }) => (
                            <TextField
                              name="Max amount"
                              min={1}
                              value={value || undefined}
                              onChange={onChange}
                              addOnSuffix="$"
                              type="number"
                            />
                          )}
                        />
                      </div>
                      {/* disable button when no changes */}
                      <Button className="mb-[4px] ml-auto mt-auto">{t("update")}</Button>
                    </div>
                  ) : (
                    <></>
                  )}
                </RadioArea.Item>
              </RadioArea.Group>
            </div>
          </Form>
          <Form
            form={form}
            handleSubmit={(values) => {
              const { smsOverageLimit, ...creditAllocationValues } = values;
              mutation.mutate({ id: team.id, ...creditAllocationValues });
            }}>
            <div className="border-subtle mt-6 flex items-center rounded-t-lg border p-6 text-sm">
              <div>
                <p className="text-default text-base font-semibold">{t("credit_allocation_for_members")}</p>
                <p className="text-default">{t("credit_allocation_description")}</p>
              </div>
            </div>
            <div className="border-subtle border border-y-0 px-4 pb-4 pt-8 sm:px-6">
              <Label>{t("amount_credits_for_personal_event_types")}</Label>
              <div className="mt-3 flex">
                <Controller
                  control={form.control}
                  name="smsCreditAllocationType"
                  render={({ field: { value, onChange } }) => {
                    const optionValue = allcationOptions.find((option) => option.value === value);
                    return (
                      <Select
                        className="max-w-32 text-sm"
                        options={allcationOptions}
                        defaultValue={allcationOptions[2]}
                        value={optionValue}
                        onChange={(selected) => {
                          if (selected) onChange(selected.value);
                        }}
                      />
                    );
                  }}
                />

                {smsCreditAllocationType === SmsCreditAllocationType.SPECIFIC && (
                  <div className="max-w-40 ml-4">
                    <Controller
                      control={form.control}
                      name="smsCreditAllocationValue"
                      render={({ field: { name, value, onChange } }) => (
                        <TextField
                          type="number"
                          addOnSuffix="credits"
                          value={value}
                          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      )}
                    />
                  </div>
                )}
              </div>
              {smsLimitForMembers > 0 && smsCreditAllocationType !== SmsCreditAllocationType.ALL ? (
                <div className="mt-5 border-t text-sm">
                  <Label className="mt-5">{t("members_reached_limit")}</Label>
                  {membersAboveLimit.length > 0 ? (
                    <ul className="divide-subtle border-subtle mt-4 divide-y rounded-md border">
                      <li>
                        <div className="bg-subtle flex">
                          <div className="flex-1 border-r p-2 ">{t("username")}</div>
                          <div className="flex-1 p-2">{t("used_credits")}</div>
                        </div>
                      </li>

                      {membersAboveLimit.map((member) => {
                        return (
                          <li key={member.id}>
                            <div className="flex">
                              <div className="flex-1 border-r p-2 ">{member.username}</div>
                              <div className="flex-1 p-2">{member.smsCreditsUsed}</div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-subtle">{t("none")}</div>
                  )}
                </div>
              ) : (
                <></>
              )}
            </div>
            <SectionBottomActions align="end">
              <Button color="primary" type="submit" loading={mutation.isPending}>
                {t("update")}
              </Button>
            </SectionBottomActions>
            <SmsOveragesConfirmationDialog
              isOpenDialog={paymentConfirmationDialogOpen}
              setIsOpenDialog={setPaymentConfirmationDialogOpen}
            />
          </Form>
        </>
      ) : (
        <div className="border-subtle rounded-md border p-5">
          <span className="text-default text-sm">{t("only_owner_change")}</span>
        </div>
      )}
    </>
  );
};

const SmsCreditsViewWrapper = () => {
  const router = useRouter();
  const params = useParamsWithFallback();

  const { data: team, error } = trpc.viewer.teams.get.useQuery({ teamId: Number(params.id) });

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.replace("/teams");
      }
    },
    [error]
  );

  if (!team) return null;

  return <SmsCreditsView team={team} />;
};

SmsCreditsViewWrapper.getLayout = getLayout;

export default SmsCreditsViewWrapper;
