"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

interface DeploymentInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onEmailChange?: (newEmail: string) => void;
}

function DetailRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-subtle text-xs">{label}</span>
      <span className="text-emphasis text-right text-xs font-medium">{value}</span>
    </div>
  );
}

export function DeploymentInfoSheet({
  open,
  onOpenChange,
  email,
  onEmailChange,
}: DeploymentInfoSheetProps): JSX.Element {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data, isPending, error } = trpc.viewer.admin.getDeploymentInfo.useQuery(
    { email },
    { enabled: open && !!email }
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editSubscriptionId, setEditSubscriptionId] = useState("");

  const updateMutation = trpc.viewer.admin.updateDeploymentBilling.useMutation({
    onSuccess: (_data, variables) => {
      showToast(t("admin_deployment_update_success"), "success");
      setIsEditing(false);
      if (variables.newEmail) {
        // Invalidate all getDeploymentInfo queries so stale entries for
        // the old email don't linger in the cache.
        utils.viewer.admin.getDeploymentInfo.invalidate();
        // Switch the parent's query key so the component re-subscribes
        // to the new email and triggers a fresh fetch.
        onEmailChange?.(variables.newEmail);
      } else {
        // No email change -- just refetch under the current key.
        utils.viewer.admin.getDeploymentInfo.invalidate({ email });
      }
    },
    onError: (err) => {
      showToast(err.message || t("admin_deployment_update_error"), "error");
    },
  });

  const resendEmailMutation = trpc.viewer.admin.resendPurchaseCompleteEmail.useMutation({
    onSuccess: () => {
      showToast(t("admin_license_resend_success"), "success");
    },
    onError: (err) => {
      showToast(err.message || t("admin_license_resend_error"), "error");
    },
  });

  const startEditing = () => {
    if (data) {
      setEditEmail(data.billingEmail);
      setEditCustomerId(data.customerId || "");
      setEditSubscriptionId(data.keys[0]?.subscriptionId || "");
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!data) return;

    const updates: {
      email: string;
      newEmail?: string;
      customerId?: string;
      subscriptionId?: string;
    } = { email: data.billingEmail };

    if (editEmail !== data.billingEmail) {
      updates.newEmail = editEmail;
    }
    if (editCustomerId !== (data.customerId || "")) {
      updates.customerId = editCustomerId;
    }
    const currentSubscriptionId = data.keys[0]?.subscriptionId || "";
    if (editSubscriptionId !== currentSubscriptionId) {
      updates.subscriptionId = editSubscriptionId;
    }

    updateMutation.mutate(updates);
  };

  const handleResendEmail = () => {
    if (!data) return;
    resendEmailMutation.mutate({ billingEmail: data.billingEmail });
  };

  const handleClose = () => {
    setIsEditing(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="bg-cal-muted">
        <SheetHeader>
          <SheetTitle>{t("admin_deployment_info_title")}</SheetTitle>
          <SheetDescription>{email}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {isPending ? (
            <SkeletonContainer>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <SkeletonText key={i} className="h-8 w-full" />
                ))}
              </div>
            </SkeletonContainer>
          ) : error ? (
            <p className="text-error text-sm">{error.message}</p>
          ) : data ? (
            <div className="space-y-6">
              {/* Deployment Details */}
              <section>
                <h3 className="text-emphasis mb-3 text-sm font-semibold">{t("admin_deployment_details")}</h3>
                <div className="bg-default border-subtle space-y-3 rounded-lg border p-4">
                  {isEditing ? (
                    <>
                      <TextField
                        label={t("admin_deployment_billing_email")}
                        name="editEmail"
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                      <TextField
                        label={t("admin_deployment_customer_id")}
                        name="editCustomerId"
                        value={editCustomerId}
                        onChange={(e) => setEditCustomerId(e.target.value)}
                        placeholder="cus_..."
                      />
                      <TextField
                        label={t("admin_deployment_subscription_id")}
                        name="editSubscriptionId"
                        value={editSubscriptionId}
                        onChange={(e) => setEditSubscriptionId(e.target.value)}
                        placeholder="sub_..."
                      />
                    </>
                  ) : (
                    <>
                      <DetailRow label={t("admin_deployment_billing_email")} value={data.billingEmail} />
                      <DetailRow
                        label={t("admin_deployment_customer_id")}
                        value={data.customerId || t("not_set")}
                      />
                      <DetailRow
                        label={t("admin_deployment_created")}
                        value={new Date(data.createdAt).toLocaleDateString()}
                      />
                      <DetailRow
                        label={t("admin_deployment_updated")}
                        value={new Date(data.updatedAt).toLocaleDateString()}
                      />
                    </>
                  )}
                </div>
              </section>

              {/* License Keys */}
              <section>
                <h3 className="text-emphasis mb-3 text-sm font-semibold">
                  {t("admin_deployment_license_keys")} ({data.keys.length})
                </h3>
                {data.keys.length === 0 ? (
                  <p className="text-subtle text-sm">{t("admin_deployment_no_keys")}</p>
                ) : (
                  <div className="space-y-3">
                    {data.keys.map((key) => (
                      <div key={key.id} className="bg-default border-subtle rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-emphasis font-mono text-xs">
                            {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 8)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant={key.active ? "green" : "gray"}>
                              {key.active ? t("active") : t("inactive")}
                            </Badge>
                            <Badge variant="blue">{key.keyVariant}</Badge>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <DetailRow
                            label={t("admin_deployment_subscription_id")}
                            value={key.subscriptionId || t("not_set")}
                          />
                          {key.usageLimits && (
                            <>
                              <DetailRow
                                label={t("admin_deployment_billing_type")}
                                value={key.usageLimits.billingType}
                              />
                              <DetailRow
                                label={t("admin_deployment_entity_count")}
                                value={String(key.usageLimits.entityCount)}
                              />
                              <DetailRow
                                label={t("admin_deployment_entity_price")}
                                value={`$${(key.usageLimits.entityPrice / 100).toFixed(2)}`}
                              />
                              <DetailRow
                                label={t("admin_deployment_overages")}
                                value={String(key.usageLimits.overages)}
                              />
                            </>
                          )}
                        </div>

                        {/* Usage Analytics */}
                        {key.usageAnalytics.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-emphasis mb-2 text-xs font-semibold">
                              {t("admin_deployment_recent_usage")}
                            </h4>
                            <div className="bg-cal-muted max-h-32 overflow-y-auto rounded p-2">
                              {key.usageAnalytics.map((entry, idx) => (
                                <div key={idx} className="text-subtle flex justify-between py-0.5 text-xs">
                                  <span>{new Date(entry.date).toLocaleDateString()}</span>
                                  <span className="text-emphasis font-medium">{entry.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex gap-2">
              {data && !isEditing && (
                <>
                  <Button color="secondary" onClick={startEditing}>
                    {t("admin_deployment_edit")}
                  </Button>
                  <Button
                    color="secondary"
                    onClick={handleResendEmail}
                    loading={resendEmailMutation.isPending}
                    disabled={resendEmailMutation.isPending}>
                    {t("admin_deployment_resend_email")}
                  </Button>
                </>
              )}
              {isEditing && (
                <>
                  <Button
                    color="primary"
                    onClick={handleSave}
                    loading={updateMutation.isPending}
                    disabled={updateMutation.isPending}>
                    {t("save")}
                  </Button>
                  <Button color="secondary" onClick={() => setIsEditing(false)}>
                    {t("cancel")}
                  </Button>
                </>
              )}
            </div>
            <Button color="minimal" onClick={handleClose}>
              {t("close")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
