"use client";

import { useState } from "react";

import dayjs from "@calcom/dayjs";
import type { Deployment, LicenseKey } from "@calcom/features/ee/common/server/types/admin";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Checkbox, TextField, TextArea } from "@calcom/ui/components/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";

interface DeploymentDetailsSheetProps {
  deployment: Deployment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeploymentDetailsSheet({ deployment, open, onOpenChange }: DeploymentDetailsSheetProps) {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"details" | "keys" | "stripe">("details");
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [billingEmail, setBillingEmail] = useState(deployment?.billingEmail || "");
  const [customerId, setCustomerId] = useState(deployment?.customerId || "");
  const [metadata, setMetadata] = useState(JSON.stringify(deployment?.metadata || {}, null, 2));

  const updateDeploymentMutation = trpc.viewer.admin.license.updateDeployment.useMutation({
    onSuccess: () => {
      utils.viewer.admin.license.listDeployments.invalidate();
      showToast("Deployment updated successfully", "success");
      setIsEditing(false);
    },
    onError: (error) => {
      showToast(error.message || "Failed to update deployment", "error");
    },
  });

  const sendEmailMutation = trpc.viewer.admin.license.sendLicenseEmail.useMutation({
    onSuccess: (data) => {
      showToast(data.message || "License email sent successfully", "success");
    },
    onError: (error) => {
      showToast(error.message || "Failed to send license email", "error");
    },
  });

  const { data: stripeInfo, isLoading: isLoadingStripe } =
    trpc.viewer.admin.license.getDeploymentStripeInfo.useQuery(
      { id: deployment?.id || "" },
      { enabled: open && activeTab === "stripe" && !!deployment?.id }
    );

  const handleSave = () => {
    if (!deployment) return;

    let parsedMetadata: Record<string, unknown> | undefined;
    try {
      parsedMetadata = metadata ? JSON.parse(metadata) : undefined;
    } catch {
      showToast("Invalid JSON in metadata field", "error");
      return;
    }

    updateDeploymentMutation.mutate({
      id: deployment.id,
      billingEmail: billingEmail || undefined,
      customerId: customerId || undefined,
      metadata: parsedMetadata,
    });
  };

  const handleSendEmail = () => {
    if (!deployment) return;
    sendEmailMutation.mutate({ id: deployment.id });
  };

  if (!deployment) return null;

  const liveKey = deployment.keys.find((k) => k.keyVariant === "LIVE");
  const testKey = deployment.keys.find((k) => k.keyVariant === "TEST");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-default overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Deployment Details</SheetTitle>
        </SheetHeader>

        <SheetBody className="space-y-6">
          {/* Tabs */}
          <div className="border-subtle flex gap-2 border-b">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "details"
                  ? "border-emphasis text-emphasis border-b-2"
                  : "text-subtle hover:text-emphasis"
              }`}>
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("keys")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "keys"
                  ? "border-emphasis text-emphasis border-b-2"
                  : "text-subtle hover:text-emphasis"
              }`}>
              License Keys
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stripe")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "stripe"
                  ? "border-emphasis text-emphasis border-b-2"
                  : "text-subtle hover:text-emphasis"
              }`}>
              Stripe Info
            </button>
          </div>

          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-emphasis text-lg font-semibold">Deployment Information</h3>
                {!isEditing && (
                  <Button color="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <TextField
                    label="Billing Email"
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                  />
                  <TextField
                    label="Customer ID"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  />
                  <div>
                    <label className="text-emphasis mb-2 block text-sm font-medium">Metadata (JSON)</label>
                    <TextArea
                      value={metadata}
                      onChange={(e) => setMetadata(e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button color="primary" onClick={handleSave} loading={updateDeploymentMutation.isPending}>
                      Save
                    </Button>
                    <Button
                      color="secondary"
                      onClick={() => {
                        setIsEditing(false);
                        setBillingEmail(deployment.billingEmail || "");
                        setCustomerId(deployment.customerId || "");
                        setMetadata(JSON.stringify(deployment.metadata || {}, null, 2));
                      }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-subtle text-xs font-medium">Deployment ID</label>
                    <p className="font-mono text-sm">{deployment.id}</p>
                  </div>
                  <div>
                    <label className="text-subtle text-xs font-medium">Billing Email</label>
                    <p className="text-sm">
                      {deployment.billingEmail || <span className="text-muted">—</span>}
                    </p>
                  </div>
                  <div>
                    <label className="text-subtle text-xs font-medium">Customer ID</label>
                    <p className="font-mono text-sm">
                      {deployment.customerId || <span className="text-muted">—</span>}
                    </p>
                  </div>
                  <div>
                    <label className="text-subtle text-xs font-medium">Created</label>
                    <p className="text-sm">{dayjs(deployment.createdAt).format("MMM D, YYYY HH:mm")}</p>
                  </div>
                  <div>
                    <label className="text-subtle text-xs font-medium">Updated</label>
                    <p className="text-sm">{dayjs(deployment.updatedAt).format("MMM D, YYYY HH:mm")}</p>
                  </div>
                  {deployment.metadata && Object.keys(deployment.metadata).length > 0 && (
                    <div>
                      <label className="text-subtle text-xs font-medium">Metadata</label>
                      <pre className="bg-muted rounded p-2 text-xs">
                        {JSON.stringify(deployment.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                  {deployment.billingEmail && liveKey && (
                    <div className="pt-4">
                      <Button
                        color="secondary"
                        onClick={handleSendEmail}
                        loading={sendEmailMutation.isPending}
                        StartIcon="mail">
                        Send License Email
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Keys Tab */}
          {activeTab === "keys" && (
            <div className="space-y-4">
              <h3 className="text-emphasis text-lg font-semibold">License Keys</h3>
              {liveKey && <LicenseKeyCard key={liveKey.id} licenseKey={liveKey} />}
              {testKey && <LicenseKeyCard key={testKey.id} licenseKey={testKey} />}
            </div>
          )}

          {/* Stripe Tab */}
          {activeTab === "stripe" && (
            <div className="space-y-4">
              <h3 className="text-emphasis text-lg font-semibold">Stripe Information</h3>
              {isLoadingStripe ? (
                <p className="text-subtle text-sm">Loading...</p>
              ) : stripeInfo ? (
                <div className="space-y-4">
                  {stripeInfo.customer && (
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="text-emphasis mb-2 font-semibold">Customer</h4>
                      {"deleted" in stripeInfo.customer ? (
                        <p className="text-subtle text-sm">Customer deleted</p>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <p>
                            <span className="text-subtle">ID:</span> {stripeInfo.customer.id}
                          </p>
                          <p>
                            <span className="text-subtle">Email:</span> {stripeInfo.customer.email || "—"}
                          </p>
                          <p>
                            <span className="text-subtle">Name:</span> {stripeInfo.customer.name || "—"}
                          </p>
                          <p>
                            <span className="text-subtle">Created:</span>{" "}
                            {dayjs.unix(stripeInfo.customer.created).format("MMM D, YYYY")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {stripeInfo.subscriptions.length > 0 && (
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="text-emphasis mb-2 font-semibold">Subscriptions</h4>
                      <div className="space-y-3">
                        {stripeInfo.subscriptions.map((sub) => (
                          <div key={sub.id} className="border-subtle rounded border p-3">
                            <div className="flex items-center justify-between">
                              <p className="font-mono text-sm">{sub.id}</p>
                              <Badge variant={sub.status === "active" ? "green" : "gray"}>{sub.status}</Badge>
                            </div>
                            <div className="mt-2 space-y-1 text-xs">
                              <p>
                                <span className="text-subtle">Period:</span>{" "}
                                {dayjs.unix(sub.currentPeriodStart).format("MMM D")} -{" "}
                                {dayjs.unix(sub.currentPeriodEnd).format("MMM D, YYYY")}
                              </p>
                              {sub.cancelAtPeriodEnd && (
                                <p className="text-orange-600">Cancels at period end</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-subtle text-sm">No Stripe information available</p>
              )}
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button color="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function LicenseKeyCard({ licenseKey }: { licenseKey: LicenseKey }) {
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [active, setActive] = useState(licenseKey.active);
  const [skipVerification, setSkipVerification] = useState(licenseKey.skipVerification);
  const [subscriptionId, setSubscriptionId] = useState(licenseKey.subscriptionId || "");
  const [entityCount, setEntityCount] = useState(licenseKey.usageLimits?.entityCount?.toString() || "");
  const [entityPrice, setEntityPrice] = useState(licenseKey.usageLimits?.entityPrice?.toString() || "");
  const [overages, setOverages] = useState(licenseKey.usageLimits?.overages?.toString() || "");

  const updateKeyMutation = trpc.viewer.admin.license.updateLicenseKey.useMutation({
    onSuccess: () => {
      utils.viewer.admin.license.listDeployments.invalidate();
      showToast("License key updated successfully", "success");
      setIsEditing(false);
    },
    onError: (error) => {
      showToast(error.message || "Failed to update license key", "error");
    },
  });

  const handleSave = () => {
    updateKeyMutation.mutate({
      id: licenseKey.id,
      active,
      skipVerification,
      subscriptionId: subscriptionId || undefined,
      usageLimits: {
        entityCount: entityCount ? parseInt(entityCount, 10) : undefined,
        entityPrice: entityPrice ? parseInt(entityPrice, 10) : undefined,
        overages: overages ? parseInt(overages, 10) : undefined,
      },
    });
  };

  return (
    <div className="bg-muted rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={licenseKey.keyVariant === "LIVE" ? "green" : "blue"}>{licenseKey.keyVariant}</Badge>
          <Badge variant={licenseKey.active ? "green" : "gray"}>
            {licenseKey.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        {!isEditing && (
          <Button color="secondary" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
            <label className="text-sm">Active</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={skipVerification}
              onCheckedChange={(checked) => setSkipVerification(checked === true)}
            />
            <label className="text-sm">Skip Verification</label>
          </div>
          <TextField
            label="Subscription ID"
            value={subscriptionId}
            onChange={(e) => setSubscriptionId(e.target.value)}
          />
          <div className="border-subtle border-t pt-3">
            <p className="text-emphasis mb-2 text-sm font-medium">Usage Limits</p>
            <TextField
              label="Entity Count"
              type="number"
              value={entityCount}
              onChange={(e) => setEntityCount(e.target.value)}
            />
            <TextField
              label="Entity Price (cents)"
              type="number"
              value={entityPrice}
              onChange={(e) => setEntityPrice(e.target.value)}
            />
            <TextField
              label="Overages (cents)"
              type="number"
              value={overages}
              onChange={(e) => setOverages(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button color="primary" onClick={handleSave} loading={updateKeyMutation.isPending}>
              Save
            </Button>
            <Button
              color="secondary"
              onClick={() => {
                setIsEditing(false);
                setActive(licenseKey.active);
                setSkipVerification(licenseKey.skipVerification);
                setSubscriptionId(licenseKey.subscriptionId || "");
                setEntityCount(licenseKey.usageLimits?.entityCount?.toString() || "");
                setEntityPrice(licenseKey.usageLimits?.entityPrice?.toString() || "");
                setOverages(licenseKey.usageLimits?.overages?.toString() || "");
              }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-subtle">Key:</span>{" "}
            <span className="font-mono">{licenseKey.key.substring(0, 20)}...</span>
          </p>
          {licenseKey.subscriptionId && (
            <p>
              <span className="text-subtle">Subscription ID:</span>{" "}
              <span className="font-mono">{licenseKey.subscriptionId}</span>
            </p>
          )}
          {licenseKey.usageLimits && (
            <div className="border-subtle mt-3 border-t pt-3">
              <p className="text-emphasis mb-2 font-medium">Usage Limits</p>
              <p>
                <span className="text-subtle">Billing Type:</span> {licenseKey.usageLimits.billingType}
              </p>
              <p>
                <span className="text-subtle">Entity Count:</span> {licenseKey.usageLimits.entityCount}
              </p>
              <p>
                <span className="text-subtle">Entity Price:</span> $
                {(licenseKey.usageLimits.entityPrice / 100).toFixed(2)}
              </p>
              <p>
                <span className="text-subtle">Overages:</span> $
                {(licenseKey.usageLimits.overages / 100).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
