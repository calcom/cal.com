"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { formatPhoneNumber } from "@calcom/lib/formatPhoneNumber";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogHeader, DialogFooter } from "@calcom/ui/components/dialog";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { Dialog as UIDialog } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Form } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="border-subtle space-y-6 rounded-b-xl border border-t-0 px-4 py-8 sm:px-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonButton className="ml-auto h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

const formSchema = z.object({
  phoneNumber: z.string().refine((val) => isValidPhoneNumber(val)),
  terminationUri: z.string().min(1, "Termination URI is required"),
  sipTrunkAuthUsername: z.string().optional(),
  sipTrunkAuthPassword: z.string().optional(),
  nickname: z.string().optional(),
});

function PhoneNumbersView({
  numbers = [],
  revalidatePage,
}: {
  numbers?: RouterOutputs["viewer"]["phoneNumber"]["list"];
  revalidatePage: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [cancellingNumberId, setCancellingNumberId] = useState<number | null>(null);
  const [numberToDelete, setNumberToDelete] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPhoneNumber, setEditingPhoneNumber] = useState<{
    phoneNumber: string;
    inboundAgentId: string | null;
    outboundAgentId: string | null;
  } | null>(null);
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();

  const formMethods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: "",
      terminationUri: "",
      sipTrunkAuthUsername: "",
      sipTrunkAuthPassword: "",
      nickname: "",
    },
  });

  // Handle success/error messages from URL parameters
  useEffect(() => {
    const success = searchParams?.get("success");
    const error = searchParams?.get("error");
    const message = searchParams?.get("message");
    const phoneNumber = searchParams?.get("phone_number");

    if (success === "true") {
      showToast(
        phoneNumber
          ? `Phone number ${phoneNumber} purchased successfully!`
          : "Phone number purchased successfully!",
        "success"
      );
    } else if (error === "true") {
      showToast(message || "An error occurred while processing your subscription", "error");
    }
  }, [searchParams]);

  const buyNumberMutation = trpc.viewer.phoneNumber.buy.useMutation({
    onSuccess: async (data: { checkoutUrl?: string; message?: string; phoneNumber?: any }) => {
      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else if (data.phoneNumber) {
        // Phone number created directly (shouldn't happen with current implementation)
        showToast(t("phone_number_purchased_successfully"), "success");
        await utils.viewer.phoneNumber.list.invalidate();
        await utils.viewer.me.get.invalidate();
        await revalidatePage();
        setIsBuyDialogOpen(false);
      } else {
        showToast(data.message || "Something went wrong", "error");
      }
    },
    onError: (error: { message: string }) => {
      console.log("error", error);
      showToast(error.message, "error");
    },
  });

  const importNumberMutation = trpc.viewer.phoneNumber.import.useMutation({
    onSuccess: async () => {
      showToast("Phone number imported successfully", "success");
      await utils.viewer.phoneNumber.list.invalidate();
      await utils.viewer.me.get.invalidate();
      await formMethods.reset();
      await revalidatePage();
      setIsImportDialogOpen(false);
    },
    onError: (error: { message: string }) => {
      console.log("error", error);
      showToast(error.message, "error");
    },
  });

  const cancelSubscriptionMutation = trpc.viewer.phoneNumber.cancel.useMutation({
    onSuccess: async (data: { message?: string }) => {
      showToast(data.message || "Phone number subscription cancelled successfully", "success");
      await utils.viewer.phoneNumber.list.invalidate();
      await utils.viewer.me.get.invalidate();
      await revalidatePage();
      setCancellingNumberId(null);
    },
    onError: (error: { message: string }) => {
      console.log("error", error);
      showToast(error.message, "error");
      setCancellingNumberId(null);
    },
  });

  const deletePhoneNumberMutation = trpc.viewer.phoneNumber.delete.useMutation({
    onSuccess: async () => {
      showToast("Phone number deleted successfully", "success");
      await utils.viewer.phoneNumber.list.invalidate();
      await revalidatePage();
      setNumberToDelete(null);
    },
    onError: (error: { message: string }) => {
      console.log("error", error);
      showToast(error.message, "error");
      setNumberToDelete(null);
    },
  });

  const updatePhoneNumberMutation = trpc.viewer.phoneNumber.update.useMutation({
    onSuccess: async () => {
      showToast("Phone number updated successfully", "success");
      await utils.viewer.phoneNumber.list.invalidate();
      await revalidatePage();
      setIsEditDialogOpen(false);
      setEditingPhoneNumber(null);
    },
    onError: (error: { message: string }) => {
      console.log("error", error);
      showToast(error.message, "error");
    },
  });

  const { data: agentsData } = trpc.viewer.ai.list.useQuery();

  const BuyNumberButton = (props: React.ComponentProps<typeof Button>) => (
    <Button {...props} color="secondary" StartIcon="plus" onClick={() => setIsBuyDialogOpen(true)}>
      {t("buy_number")}
    </Button>
  );

  const ImportNumberButton = (props: React.ComponentProps<typeof Button>) => (
    <Button {...props} color="secondary" StartIcon="plus" onClick={() => setIsImportDialogOpen(true)}>
      {t("import_phone_number")}
    </Button>
  );

  const handleCancelSubscription = (phoneNumberId: number) => {
    setCancellingNumberId(phoneNumberId);
  };

  const handleDeletePhoneNumber = (phoneNumber: string) => {
    setNumberToDelete(phoneNumber);
  };

  const handleImportPhoneNumber = (values) => {
    importNumberMutation.mutate(values);
  };

  const confirmCancelSubscription = () => {
    if (cancellingNumberId) {
      cancelSubscriptionMutation.mutate({ phoneNumberId: cancellingNumberId });
    }
  };

  const confirmDeletePhoneNumber = () => {
    if (numberToDelete) {
      deletePhoneNumberMutation.mutate({ phoneNumber: numberToDelete });
    }
  };

  const handleEditPhoneNumber = (phoneNumber: any) => {
    setEditingPhoneNumber({
      phoneNumber: phoneNumber.phoneNumber,
      inboundAgentId: phoneNumber.inboundAgent?.retellAgentId || null,
      outboundAgentId: phoneNumber.outboundAgent?.retellAgentId || null,
    });
    setIsEditDialogOpen(true);
  };

  const handleSavePhoneNumber = () => {
    if (editingPhoneNumber) {
      updatePhoneNumberMutation.mutate({
        phoneNumber: editingPhoneNumber.phoneNumber,
        inboundAgentId: editingPhoneNumber.inboundAgentId,
        outboundAgentId: editingPhoneNumber.outboundAgentId,
      });
    }
  };

  return (
    <>
      <SettingsHeader
        title={t("cal_ai_phone_numbers")}
        description={t("cal_ai_phone_numbers_description")}
        CTA={
          <div className="flex items-center space-x-2">
            <BuyNumberButton />
            <ImportNumberButton />
          </div>
        }
        borderInShellHeader={true}>
        <div>
          {numbers.length > 0 ? (
            <div className="border-subtle rounded-b-lg border border-t-0">
              {numbers.map((number, index: number) => (
                <div
                  key={number.id}
                  className={`flex items-center justify-between p-6 ${
                    numbers.length !== index + 1 ? "border-subtle border-b" : ""
                  }`}>
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <Icon name="phone" className="h-6 w-6 text-gray-400" />
                      <span className="text-emphasis ml-4 text-sm font-medium">
                        {formatPhoneNumber(number.phoneNumber)}
                      </span>
                      {number.subscriptionStatus && (
                        <span className="text-muted ml-2 text-xs">($5/month)</span>
                      )}
                    </div>
                    {(number.inboundAgent || number.outboundAgent) && (
                      <div className="ml-10 mt-2 flex items-center gap-2">
                        {number.inboundAgent && (
                          <Tooltip content="Inbound agent handles incoming calls to this phone number">
                            <Badge variant="blue" size="sm">
                              In: {number.inboundAgent.name}
                            </Badge>
                          </Tooltip>
                        )}
                        {number.outboundAgent && (
                          <Tooltip content="Outbound agent handles outgoing calls from this phone number">
                            <Badge variant="green" size="sm">
                              Out: {number.outboundAgent.name}
                            </Badge>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {number.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE ? (
                      <Button
                        color="destructive"
                        variant="button"
                        size="sm"
                        onClick={() => handleCancelSubscription(number.id)}
                        loading={cancelSubscriptionMutation.isPending && cancellingNumberId === number.id}>
                        {t("cancel_subscription")}
                      </Button>
                    ) : (
                      <Button
                        color="destructive"
                        variant="button"
                        size="sm"
                        onClick={() => handleDeletePhoneNumber(number.phoneNumber)}
                        loading={
                          deletePhoneNumberMutation.isPending && numberToDelete === number.phoneNumber
                        }>
                        {t("delete")}
                      </Button>
                    )}
                    <Button
                      color="secondary"
                      variant="icon"
                      size="sm"
                      onClick={() => handleEditPhoneNumber(number)}
                      data-testid="edit-phone-number-button">
                      <Icon name="pencil" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyScreen
              Icon="phone"
              headline={t("no_phone_numbers_yet")}
              description={t("buy_your_first_phone_number")}
              className="rounded-b-lg rounded-t-none border-t-0"
              buttonRaw={<BuyNumberButton />}
            />
          )}
        </div>
      </SettingsHeader>

      <Dialog open={isBuyDialogOpen} onOpenChange={setIsBuyDialogOpen}>
        <DialogContent type="creation">
          <div className="flex flex-col">
            <div className="mb-4">
              <h3 className="text-emphasis text-lg font-bold">{t("buy_new_number")}</h3>
              <p className="text-default text-sm">{t("buy_number_cost_5_per_month")}</p>
            </div>
            <DialogFooter showDivider className="relative">
              <Button onClick={() => setIsBuyDialogOpen(false)} color="secondary">
                {t("cancel")}
              </Button>
              <Button onClick={() => buyNumberMutation.mutate()} loading={buyNumberMutation.isPending}>
                {t("buy_number_for_5_per_month")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent type="creation">
          <DialogHeader title={t("import_phone_number")} subtitle={t("import_phone_number_description")} />

          <Form form={formMethods} handleSubmit={(values) => handleImportPhoneNumber(values)}>
            <div className="border-subtle space-y-4">
              <Controller
                name="phoneNumber"
                control={formMethods.control}
                render={({ field: { value } }) => (
                  <TextField
                    name="phoneNumber"
                    label={
                      <span className="flex items-center gap-1">
                        {t("phone_number")}
                        <Tooltip content={t("phone_number_info_tooltip")}>
                          <Icon name="info" className="h-4 w-4 cursor-pointer text-gray-400" />
                        </Tooltip>
                      </span>
                    }
                    labelClassName="font-medium text-emphasis font-sm"
                    value={value}
                    required
                    type="text"
                    onChange={(e) => {
                      formMethods.setValue("phoneNumber", e?.target.value, { shouldDirty: true });
                    }}
                  />
                )}
              />

              <Controller
                name="terminationUri"
                control={formMethods.control}
                render={({ field: { value } }) => (
                  <TextField
                    name="terminationUri"
                    label={
                      <span className="flex items-center gap-1">
                        {t("termination_uri")}
                        <Tooltip content={t("termination_uri_info_tooltip")}>
                          <Icon name="info" className="h-4 w-4 cursor-pointer text-gray-400" />
                        </Tooltip>
                      </span>
                    }
                    labelClassName="font-medium text-emphasis font-sm"
                    value={value}
                    required
                    type="text"
                    onChange={(e) => {
                      formMethods.setValue("terminationUri", e?.target.value, { shouldDirty: true });
                    }}
                  />
                )}
              />

              <Controller
                name="sipTrunkAuthUsername"
                control={formMethods.control}
                render={({ field: { value } }) => (
                  <TextField
                    name="sipTrunkAuthUsername"
                    label={
                      <span className="flex items-center gap-1">
                        {t("sip_trunk_username")} ({t("optional")})
                        <Tooltip content={t("sip_trunk_username_info_tooltip")}>
                          <Icon name="info" className="h-4 w-4 cursor-pointer text-gray-400" />
                        </Tooltip>
                      </span>
                    }
                    labelClassName="font-medium text-emphasis font-sm"
                    value={value}
                    required
                    type="text"
                    onChange={(e) => {
                      formMethods.setValue("sipTrunkAuthUsername", e?.target.value, { shouldDirty: true });
                    }}
                  />
                )}
              />

              <Controller
                name="sipTrunkAuthPassword"
                control={formMethods.control}
                render={({ field: { value } }) => (
                  <TextField
                    name="sipTrunkAuthPassword"
                    label={
                      <span className="flex items-center gap-1">
                        {t("sip_trunk_password")} ({t("optional")})
                        <Tooltip content={t("sip_trunk_password_info_tooltip")}>
                          <Icon name="info" className="h-4 w-4 cursor-pointer text-gray-400" />
                        </Tooltip>
                      </span>
                    }
                    labelClassName="font-medium text-emphasis font-sm"
                    value={value}
                    required
                    type="text"
                    onChange={(e) => {
                      formMethods.setValue("sipTrunkAuthPassword", e?.target.value, { shouldDirty: true });
                    }}
                  />
                )}
              />

              <Controller
                name="nickname"
                control={formMethods.control}
                render={({ field: { value } }) => (
                  <TextField
                    name="nickname"
                    label={
                      <span className="flex items-center gap-1">
                        {t("nickname")} ({t("optional")})
                        <Tooltip content={t("nickname_info_tooltip")}>
                          <Icon name="info" className="h-4 w-4 cursor-pointer text-gray-400" />
                        </Tooltip>
                      </span>
                    }
                    labelClassName="font-medium text-emphasis font-sm"
                    value={value}
                    required
                    type="text"
                    onChange={(e) => {
                      formMethods.setValue("nickname", e?.target.value, { shouldDirty: true });
                    }}
                  />
                )}
              />
            </div>
            <DialogFooter showDivider className="relative">
              <Button onClick={() => setIsImportDialogOpen(false)} color="secondary">
                {t("cancel")}
              </Button>
              <Button type="submit" loading={importNumberMutation.isPending}>
                {t("import_phone_number")}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <UIDialog open={cancellingNumberId !== null} onOpenChange={() => setCancellingNumberId(null)}>
        <ConfirmationDialogContent
          isPending={cancelSubscriptionMutation.isPending}
          variety="danger"
          title={t("cancel_phone_number_subscription")}
          confirmBtnText={t("yes_cancel_subscription")}
          onConfirm={confirmCancelSubscription}>
          {t("cancel_phone_number_subscription_confirmation")}
        </ConfirmationDialogContent>
      </UIDialog>

      <UIDialog open={numberToDelete !== null} onOpenChange={() => setNumberToDelete(null)}>
        <ConfirmationDialogContent
          isPending={deletePhoneNumberMutation.isPending}
          variety="danger"
          title={t("delete_phone_number")}
          confirmBtnText={t("yes_delete_phone_number")}
          onConfirm={confirmDeletePhoneNumber}>
          {t("delete_phone_number_confirmation")}
        </ConfirmationDialogContent>
      </UIDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent type="creation">
          <DialogHeader
            title={t("edit_phone_number_agents")}
            subtitle={t("edit_phone_number_agents_description")}
          />

          <div className="space-y-4">
            <div>
              <label className="text-emphasis mb-2 block text-sm font-medium">{t("inbound_agent")}</label>
              <Select
                options={[
                  { label: "None", value: null },
                  ...(agentsData?.filtered?.map((agent) => ({
                    label: agent.name,
                    value: agent.retellAgentId,
                  })) || []),
                ]}
                value={
                  editingPhoneNumber?.inboundAgentId
                    ? {
                        label:
                          agentsData?.filtered?.find(
                            (a) => a.retellAgentId === editingPhoneNumber.inboundAgentId
                          )?.name || "",
                        value: editingPhoneNumber.inboundAgentId,
                      }
                    : { label: "None", value: null }
                }
                onChange={(option) =>
                  setEditingPhoneNumber((prev) =>
                    prev ? { ...prev, inboundAgentId: option?.value || null } : null
                  )
                }
                placeholder={t("select_inbound_agent")}
              />
            </div>

            <div>
              <label className="text-emphasis mb-2 block text-sm font-medium">{t("outbound_agent")}</label>
              <Select
                options={[
                  { label: "None", value: null },
                  ...(agentsData?.filtered?.map((agent) => ({
                    label: agent.name,
                    value: agent.retellAgentId,
                  })) || []),
                ]}
                value={
                  editingPhoneNumber?.outboundAgentId
                    ? {
                        label:
                          agentsData?.filtered?.find(
                            (a) => a.retellAgentId === editingPhoneNumber.outboundAgentId
                          )?.name || "",
                        value: editingPhoneNumber.outboundAgentId,
                      }
                    : { label: "None", value: null }
                }
                onChange={(option) =>
                  setEditingPhoneNumber((prev) =>
                    prev ? { ...prev, outboundAgentId: option?.value || null } : null
                  )
                }
                placeholder={t("select_outbound_agent")}
              />
            </div>
          </div>

          <DialogFooter showDivider className="relative">
            <Button onClick={() => setIsEditDialogOpen(false)} color="secondary">
              {t("cancel")}
            </Button>
            <Button onClick={handleSavePhoneNumber} loading={updatePhoneNumberMutation.isPending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PhoneNumbersQueryView({
  cachedNumbers,
  revalidatePage,
}: {
  cachedNumbers: RouterOutputs["viewer"]["phoneNumber"]["list"];
  revalidatePage: () => Promise<void>;
}) {
  const { data: numbers, isPending } = trpc.viewer.phoneNumber.list.useQuery(undefined, {
    suspense: false,
  });

  if (isPending && !cachedNumbers) return <SkeletonLoader />;

  return <PhoneNumbersView numbers={numbers || cachedNumbers} revalidatePage={revalidatePage} />;
}
