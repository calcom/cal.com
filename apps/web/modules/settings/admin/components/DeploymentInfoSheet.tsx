"use client";

import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetTitle,
} from "@coss/ui/components/sheet";
import { Skeleton } from "@coss/ui/components/skeleton";
import { toastManager } from "@coss/ui/components/toast";
import { useState } from "react";

interface DeploymentInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onEmailChange?: (newEmail: string) => void;
}

function DetailRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
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
      toastManager.add({ title: t("admin_deployment_update_success"), type: "success" });
      setIsEditing(false);
      if (variables.newEmail) {
        utils.viewer.admin.getDeploymentInfo.invalidate();
        onEmailChange?.(variables.newEmail);
      } else {
        utils.viewer.admin.getDeploymentInfo.invalidate({ email });
      }
    },
    onError: (err) => {
      toastManager.add({ title: err.message || t("admin_deployment_update_error"), type: "error" });
    },
  });

  const resendEmailMutation = trpc.viewer.admin.resendPurchaseCompleteEmail.useMutation({
    onSuccess: () => {
      toastManager.add({ title: t("admin_license_resend_success"), type: "success" });
    },
    onError: (err) => {
      toastManager.add({ title: err.message || t("admin_license_resend_error"), type: "error" });
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
      <SheetContent side="right" variant="inset">
        <SheetHeader>
          <SheetTitle>{t("admin_deployment_info_title")}</SheetTitle>
          <SheetDescription>{email}</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-6">
          {isPending ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : data ? (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-sm">{t("admin_deployment_details")}</h3>
                <dl className="flex flex-col gap-2 rounded-xl border p-4 text-xs">
                  {isEditing ? (
                    <>
                      <Field>
                        <FieldLabel>{t("admin_deployment_billing_email")}</FieldLabel>
                        <Input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>{t("admin_deployment_customer_id")}</FieldLabel>
                        <Input
                          value={editCustomerId}
                          onChange={(e) => setEditCustomerId(e.target.value)}
                          placeholder="cus_..."
                        />
                      </Field>
                      <Field>
                        <FieldLabel>{t("admin_deployment_subscription_id")}</FieldLabel>
                        <Input
                          value={editSubscriptionId}
                          onChange={(e) => setEditSubscriptionId(e.target.value)}
                          placeholder="sub_..."
                        />
                      </Field>
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
                </dl>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-sm">
                  {t("admin_deployment_license_keys")} ({data.keys.length})
                </h3>
                {data.keys.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("admin_deployment_no_keys")}</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {data.keys.map((key) => (
                      <div key={key.id} className="flex flex-col gap-4 rounded-xl border p-4 text-xs">
                        <dl className="flex flex-col gap-2">
                          <div className="flex justify-between gap-4">
                            <dt className="font-medium font-mono">
                              {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 8)}
                            </dt>
                            <dd className="flex items-center gap-2">
                              <Badge variant={key.active ? "success" : "secondary"}>
                                {key.active ? t("active") : t("inactive")}
                              </Badge>
                              <Badge variant="info">{key.keyVariant}</Badge>
                            </dd>
                          </div>
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
                        </dl>
                        {key.usageAnalytics.length > 0 && (
                          <div>
                            <h4 className="mb-2 font-semibold text-sm">
                              {t("admin_deployment_recent_usage")}
                            </h4>
                            <dl className="flex flex-col gap-1">
                              {key.usageAnalytics.map((entry, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <dt className="text-muted-foreground">
                                    {new Date(entry.date).toLocaleDateString()}
                                  </dt>
                                  <dd>{entry.count}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetPanel>
        <SheetFooter className="sm:justify-between">
          <div className="flex gap-2">
            {data && !isEditing && (
              <>
                <Button variant="outline" onClick={startEditing}>
                  {t("admin_deployment_edit")}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={resendEmailMutation.isPending}>
                  {resendEmailMutation.isPending ? "..." : t("admin_deployment_resend_email")}
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "..." : t("save")}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  {t("cancel")}
                </Button>
              </>
            )}
          </div>
          <SheetClose render={<Button variant="ghost" />}>{t("close")}</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
