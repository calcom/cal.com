"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogHeader, DialogFooter } from "@calcom/ui/components/dialog";
import { Form } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { WizardLayout } from "@calcom/ui/components/layout";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

const querySchema = z.object({
  returnTo: z.string().optional(),
  slug: z.string().optional(),
  workflowId: z.string().optional(),
  agentId: z.string().optional(),
});

const formSchema = z.object({
  phoneNumber: z.string().refine((val) => isValidPhoneNumber(val)),
  terminationUri: z.string().min(1, "Termination URI is required"),
  sipTrunkAuthUsername: z.string().optional(),
  sipTrunkAuthPassword: z.string().optional(),
  nickname: z.string().optional(),
});

const CreateWorkflowAgent = () => {
  const params = useParamsWithFallback();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const queryParams = {
    returnTo: searchParams?.get("returnTo") || params.returnTo,
    slug: searchParams?.get("slug") || params.slug,
    workflowId: searchParams?.get("workflowId") || params.workflowId,
    agentId: searchParams?.get("agentId") || params.agentId,
  };

  const parsedQuery = querySchema.safeParse(queryParams);

  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

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

  const buyNumberMutation = trpc.viewer.phoneNumber.buy.useMutation({
    onSuccess: async (data: { checkoutUrl?: string; message?: string; phoneNumber?: any }) => {
      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else if (data.phoneNumber) {
        showToast(t("phone_number_purchased_successfully"), "success");
        await utils.viewer.phoneNumber.list.invalidate();
        await utils.viewer.me.get.invalidate();
        setIsBuyDialogOpen(false);
        // Navigate back to workflow after phone number setup
        if (parsedQuery.success && parsedQuery.data.returnTo) {
          router.push(parsedQuery.data.returnTo);
        } else if (parsedQuery.success && parsedQuery.data.workflowId) {
          router.push(`/workflows/${parsedQuery.data.workflowId}`);
        }
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
    onSuccess: async (data: { phoneNumber?: any }) => {
      showToast("Phone number imported successfully", "success");
      await utils.viewer.phoneNumber.list.invalidate();
      await utils.viewer.me.get.invalidate();
      await formMethods.reset();
      setIsImportDialogOpen(false);

      // Link phone number to agent if agentId is provided
      if (parsedQuery.success && parsedQuery.data.agentId && data.phoneNumber) {
        try {
          await utils.viewer.phoneNumber.update.mutate({
            phoneNumber: data.phoneNumber.phone_number,
            outboundAgentId: parsedQuery.data.agentId,
          });
          showToast("Phone number linked to agent successfully", "success");
        } catch (error) {
          console.error("Failed to link phone number to agent:", error);
          showToast("Phone number imported but failed to link to agent", "warning");
        }
      }

      // Navigate back to workflow after phone number setup
      if (parsedQuery.success && parsedQuery.data.returnTo) {
        router.push(parsedQuery.data.returnTo);
      } else if (parsedQuery.success && parsedQuery.data.workflowId) {
        router.push(`/workflows/${parsedQuery.data.workflowId}`);
      }
    },
    onError: (error: { message: string }) => {
      console.log("error", error);
      showToast(error.message, "error");
    },
  });

  const handleImportPhoneNumber = (values: z.infer<typeof formSchema>) => {
    const mutationPayload = {
      ...values,
      workflowId: parsedQuery.success ? parsedQuery.data.workflowId : undefined,
    };
    importNumberMutation.mutate(mutationPayload);
  };

  return (
    <>
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-emphasis text-2xl font-bold">Select agent&apos;s phone number</h1>
          <p className="text-muted max-w-md text-sm">
            Choose how you&apos;d like to add a phone number to your workflow agent
          </p>
        </div>

        <div className="grid w-full max-w-2xl grid-cols-1 gap-6 md:grid-cols-2">
          <div className="border-subtle hover:border-emphasis bg-default cursor-pointer rounded-lg border p-6 transition-colors">
            <div
              className="flex h-full flex-col items-center justify-between space-y-4 text-center"
              onClick={() => setIsBuyDialogOpen(true)}>
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                  <Icon name="plus" className="h-8 w-8 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-emphasis text-lg font-semibold">Purchase new number</h3>
                  <p className="text-muted text-sm">
                    Purchase a new phone number for $5/month and configure it for your workflow agent
                  </p>
                </div>
              </div>
              <Button color="primary" className="flex w-full items-center justify-center">
                Checkout
              </Button>
            </div>
          </div>

          <div className="border-subtle bg-default hover:border-emphasis cursor-pointer rounded-lg border p-6 transition-colors">
            <div
              className="flex h-full flex-col items-center justify-between space-y-4 text-center"
              onClick={() => setIsImportDialogOpen(true)}>
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <Icon name="download" className="h-8 w-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-emphasis text-lg font-semibold">Import Phone Number</h3>
                  <p className="text-muted text-sm">
                    Import an existing phone number with your own SIP trunk configuration
                  </p>
                </div>
              </div>
              <Button color="secondary" className="flex w-full items-center justify-center">
                Import Existing Number
              </Button>
            </div>
          </div>
        </div>
      </div>

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
              <Button
                onClick={() =>
                  buyNumberMutation.mutate({
                    agentId: parsedQuery.success ? parsedQuery.data.agentId : undefined,
                    workflowId: parsedQuery.success ? parsedQuery.data.workflowId : undefined,
                  })
                }
                loading={buyNumberMutation.isPending}>
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
                          <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
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
                          <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
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
                          <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                        </Tooltip>
                      </span>
                    }
                    labelClassName="font-medium text-emphasis font-sm"
                    value={value}
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
                          <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                        </Tooltip>
                      </span>
                    }
                    labelClassName="font-medium text-emphasis font-sm"
                    value={value}
                    type="password"
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
                          <Icon name="info" className="text-muted h-4 w-4 cursor-pointer" />
                        </Tooltip>
                      </span>
                    }
                    labelClassName="font-medium text-emphasis font-sm"
                    value={value}
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
    </>
  );
};

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <WizardLayout currentStep={2} maxSteps={2}>
      {children}
    </WizardLayout>
  );
};

export default CreateWorkflowAgent;
