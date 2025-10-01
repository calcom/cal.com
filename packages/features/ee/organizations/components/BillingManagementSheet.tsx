"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";
import { Form, Label, Select, TextField } from "@calcom/ui/components/form";

type BillingManagementSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
  billingData: {
    stripeSubscriptionId: string | null;
    seats: number | null;
    pricePerSeat: number | null;
    billingPeriod: string | null;
    subscriptionDetails: {
      status: string;
      currentPeriodStart: number;
      currentPeriodEnd: number;
      cancelAtPeriodEnd: boolean;
    } | null;
  };
};

type BillingFormValues = {
  seats: number;
  pricePerSeat: number;
  couponCode: string;
  discountType: "percentage" | "amount";
  discountValue: number;
  discountDuration: "forever" | "once" | "repeating";
  durationInMonths: number;
  discountName: string;
};

export const BillingManagementSheet = ({
  isOpen,
  onClose,
  orgId,
  billingData,
}: BillingManagementSheetProps) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCreateDiscount, setShowCreateDiscount] = useState(false);
  const utils = trpc.useUtils();

  const form = useForm<BillingFormValues>({
    defaultValues: {
      seats: billingData.seats || 1,
      pricePerSeat: billingData.pricePerSeat || 0,
      couponCode: "",
      discountType: "percentage",
      discountValue: 0,
      discountDuration: "repeating",
      durationInMonths: 3,
      discountName: "",
    },
  });

  const updateBillingMutation = trpc.viewer.organizations.adminUpdateBilling.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.adminGetBilling.invalidate({ id: orgId });
      showToast("Billing updated successfully", "success");
      onClose();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const applyDiscountMutation = trpc.viewer.organizations.adminApplyDiscount.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.adminGetBilling.invalidate({ id: orgId });
      showToast("Discount applied successfully", "success");
      form.setValue("couponCode", "");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const createDiscountMutation = trpc.viewer.organizations.adminCreateDiscount.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.organizations.adminGetBilling.invalidate({ id: orgId });
      showToast(
        `Discount created and applied! Coupon ID: ${data.couponId}`,
        "success"
      );
      setShowCreateDiscount(false);
      // Reset discount form fields
      form.setValue("discountValue", 0);
      form.setValue("discountName", "");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const cancelSubscriptionMutation = trpc.viewer.organizations.adminCancelSubscription.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.adminGetBilling.invalidate({ id: orgId });
      showToast("Subscription cancelled successfully", "success");
      setShowCancelConfirm(false);
      onClose();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onSubmit = (values: BillingFormValues) => {
    updateBillingMutation.mutate({
      id: orgId,
      seats: values.seats,
      pricePerSeat: values.pricePerSeat,
    });
  };

  const handleApplyDiscount = () => {
    const couponCode = form.getValues("couponCode");
    if (!couponCode) {
      showToast("Please enter a coupon code", "error");
      return;
    }
    applyDiscountMutation.mutate({
      id: orgId,
      couponCode,
    });
  };

  const handleCreateDiscount = () => {
    const values = form.getValues();
    if (!values.discountValue || values.discountValue <= 0) {
      showToast("Please enter a valid discount value", "error");
      return;
    }

    createDiscountMutation.mutate({
      id: orgId,
      discountType: values.discountType,
      discountValue: values.discountValue,
      duration: values.discountDuration,
      durationInMonths:
        values.discountDuration === "repeating" ? values.durationInMonths : undefined,
      name: values.discountName || undefined,
    });
  };

  const handleCancelSubscription = (cancelAtPeriodEnd: boolean) => {
    cancelSubscriptionMutation.mutate({
      id: orgId,
      cancelAtPeriodEnd,
    });
  };

  if (!billingData.stripeSubscriptionId) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Billing Management</SheetTitle>
            <SheetDescription>Manage organization billing and subscription</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="text-subtle text-sm">
              No active subscription found for this organization.
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Billing Management</SheetTitle>
          <SheetDescription>Manage organization billing and subscription</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-6">
            {/* Subscription Status */}
            <div>
              <Label>Subscription Status</Label>
              <div className="mt-2 flex items-center gap-2">
                <Badge
                  variant={
                    billingData.subscriptionDetails?.status === "active"
                      ? "green"
                      : billingData.subscriptionDetails?.status === "canceled"
                      ? "red"
                      : "gray"
                  }>
                  {billingData.subscriptionDetails?.status}
                </Badge>
                {billingData.subscriptionDetails?.cancelAtPeriodEnd && (
                  <span className="text-subtle text-xs">Cancels at period end</span>
                )}
              </div>
            </div>

            {/* Update Seats and Pricing */}
            <Form form={form} handleSubmit={onSubmit}>
              <div className="space-y-4">
                <TextField
                  label="Seats"
                  type="number"
                  min={1}
                  {...form.register("seats", { valueAsNumber: true })}
                />
                <TextField
                  label="Price per Seat ($)"
                  type="number"
                  min={0}
                  step={0.01}
                  {...form.register("pricePerSeat", { valueAsNumber: true })}
                />
                <Button
                  type="submit"
                  color="primary"
                  loading={updateBillingMutation.isPending}
                  className="w-full">
                  Update Billing
                </Button>
              </div>
            </Form>

            {/* Apply Existing Discount */}
            <div className="border-subtle space-y-3 border-t pt-4">
              <Label>Apply Existing Coupon Code</Label>
              <div className="flex gap-2">
                <TextField
                  placeholder="Coupon code"
                  {...form.register("couponCode")}
                  containerClassName="flex-1"
                />
                <Button
                  color="secondary"
                  onClick={handleApplyDiscount}
                  loading={applyDiscountMutation.isPending}>
                  Apply
                </Button>
              </div>
            </div>

            {/* Create Custom Discount */}
            <div className="border-subtle space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Create Custom Discount</Label>
                <Button
                  color="minimal"
                  size="sm"
                  onClick={() => setShowCreateDiscount(!showCreateDiscount)}>
                  {showCreateDiscount ? "Hide" : "Show"}
                </Button>
              </div>

              {showCreateDiscount && (
                <div className="space-y-3">
                  <TextField
                    label="Discount Name (optional)"
                    placeholder="e.g., Summer 2025 Promo"
                    {...form.register("discountName")}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Discount Type</Label>
                      <Select
                        {...form.register("discountType")}
                        options={[
                          { label: "Percentage", value: "percentage" },
                          { label: "Fixed Amount", value: "amount" },
                        ]}
                      />
                    </div>
                    <TextField
                      label="Value"
                      type="number"
                      min={0}
                      step={form.watch("discountType") === "percentage" ? 1 : 0.01}
                      max={form.watch("discountType") === "percentage" ? 100 : undefined}
                      placeholder={form.watch("discountType") === "percentage" ? "%" : "$"}
                      {...form.register("discountValue", { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label>Duration</Label>
                    <Select
                      {...form.register("discountDuration")}
                      options={[
                        { label: "Forever", value: "forever" },
                        { label: "Once", value: "once" },
                        { label: "Multiple Months", value: "repeating" },
                      ]}
                    />
                  </div>

                  {form.watch("discountDuration") === "repeating" && (
                    <TextField
                      label="Number of Months"
                      type="number"
                      min={1}
                      max={12}
                      {...form.register("durationInMonths", { valueAsNumber: true })}
                    />
                  )}

                  <Button
                    color="primary"
                    onClick={handleCreateDiscount}
                    loading={createDiscountMutation.isPending}
                    className="w-full">
                    Create & Apply Discount
                  </Button>
                </div>
              )}
            </div>

            {/* Cancel Subscription */}
            <div className="border-subtle space-y-3 border-t pt-4">
              <Label>Cancel Subscription</Label>
              {!showCancelConfirm ? (
                <Button
                  color="destructive"
                  variant="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full">
                  Cancel Subscription
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-subtle text-sm">Are you sure you want to cancel this subscription?</p>
                  <div className="flex gap-2">
                    <Button
                      color="destructive"
                      onClick={() => handleCancelSubscription(false)}
                      loading={cancelSubscriptionMutation.isPending}
                      className="flex-1">
                      Cancel Now
                    </Button>
                    <Button
                      color="secondary"
                      onClick={() => handleCancelSubscription(true)}
                      loading={cancelSubscriptionMutation.isPending}
                      className="flex-1">
                      At Period End
                    </Button>
                  </div>
                  <Button
                    color="minimal"
                    onClick={() => setShowCancelConfirm(false)}
                    className="w-full">
                    Nevermind
                  </Button>
                </div>
              )}
            </div>

            {/* Current Period Info */}
            {billingData.subscriptionDetails && (
              <div className="border-subtle space-y-2 border-t pt-4">
                <Label>Current Billing Period</Label>
                <div className="text-default space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-subtle">Start:</span>
                    <span>
                      {new Date(
                        billingData.subscriptionDetails.currentPeriodStart * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-subtle">End:</span>
                    <span>
                      {new Date(
                        billingData.subscriptionDetails.currentPeriodEnd * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
};
