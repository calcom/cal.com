"use client";

import type { SessionContextValue } from "next-auth/react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { Ensure } from "@calcom/types/utils";
import { showToast } from "@calcom/ui/components/toast";

import { UserPermissionRole } from "@calcom/prisma/enums";

import { Alert, AlertDescription } from "@coss/ui/components/alert";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@coss/ui/components/dialog";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { ToggleGroup, Toggle } from "@coss/ui/components/toggle-group";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy}>
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
    </Button>
  );
}

export const CreateANewLicenseKeyForm = () => {
  const session = useSession();
  if (session.data?.user.role !== "ADMIN") {
    return null;
  }
  // @ts-expect-error session can't be null due to the early return
  return <CreateANewLicenseKeyFormChild session={session} />;
};

enum BillingType {
  PER_BOOKING = "PER_BOOKING",
  PER_USER = "PER_USER",
}

enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

interface LicenseFormValues {
  billingType: BillingType;
  entityCount: number;
  entityPrice: number;
  billingPeriod: BillingPeriod;
  overages: number;
  billingEmail: string;
}

interface CouponFormValues {
  couponName: string;
  billingEmail: string;
  code: string;
  discountType: "percent" | "fixed";
  discountAmount: number;
  duration: "once" | "repeating" | "forever";
  durationInMonths: number;
}

const CreateANewLicenseKeyFormChild = ({
  session,
}: {
  session: Ensure<SessionContextValue, "data">;
}) => {
  const { t } = useLocale();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(
    null
  );
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(
    null
  );
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const isAdmin = session.data.user.role === UserPermissionRole.ADMIN;

  const licenseForm = useForm<LicenseFormValues>({
    defaultValues: {
      billingType: BillingType.PER_BOOKING,
      billingPeriod: BillingPeriod.MONTHLY,
      entityCount: 500,
      overages: 99,
      entityPrice: 50,
      billingEmail: undefined,
    },
  });

  const licenseMutation = trpc.viewer.admin.createSelfHostedLicense.useMutation(
    {
      onSuccess: async (values) => {
        showToast(
          "Success: We have created a stripe payment URL for this billing email",
          "success"
        );
        setStripeCheckoutUrl(values.stripeCheckoutUrl);
      },
      onError: async (err) => {
        setServerErrorMessage(err.message);
      },
    }
  );

  const watchedBillingPeriod = licenseForm.watch("billingPeriod");
  const watchedBillingEmail = licenseForm.watch("billingEmail");
  const watchedEntityCount = licenseForm.watch("entityCount");
  const watchedEntityPrice = licenseForm.watch("entityPrice");

  function calculateMonthlyPrice() {
    const occurrence = watchedBillingPeriod === "MONTHLY" ? 1 : 12;
    const sum = watchedEntityCount * watchedEntityPrice;
    return `$ ${sum / 100} / ${occurrence} months`;
  }

  return (
    <CardFrame className="w-full">
      <CardFrameHeader>
        <CardFrameTitle>Create License Key</CardFrameTitle>
        <CardFrameDescription>
          Configure pricing and generate a Stripe checkout URL for the customer.
        </CardFrameDescription>
      </CardFrameHeader>

        {!stripeCheckoutUrl ? (
          <Card>
            <CardPanel>
              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  licenseForm.handleSubmit((values) => {
                    licenseMutation.mutate(values);
                  })(event);
                }}
              >
                {serverErrorMessage && (
                  <Alert variant="error">
                    <AlertDescription>{serverErrorMessage}</AlertDescription>
                  </Alert>
                )}

                <Controller
                  name="billingPeriod"
                  control={licenseForm.control}
                  render={({ field: { value, onChange } }) => (
                    <Field>
                      <FieldLabel>Billing Period</FieldLabel>
                      <ToggleGroup
                        className="w-full"
                        variant="outline"
                        value={[value]}
                        onValueChange={(newValue) => {
                          if (newValue.length > 0) onChange(newValue[0]);
                        }}
                      >
                        <Toggle value="MONTHLY" className="flex-1">
                          Monthly
                        </Toggle>
                        <Toggle value="ANNUALLY" className="flex-1">
                          Annually
                        </Toggle>
                      </ToggleGroup>
                    </Field>
                  )}
                />

                <Controller
                  name="billingEmail"
                  control={licenseForm.control}
                  rules={{ required: t("must_enter_billing_email") }}
                  render={({ field: { value, onChange } }) => (
                    <Field>
                      <FieldLabel>Billing Email for Customer</FieldLabel>
                      <Input
                        placeholder="john@acme.com"
                        disabled={!isAdmin}
                        defaultValue={value}
                        onChange={onChange}
                        autoComplete="off"
                      />
                    </Field>
                  )}
                />

                <Controller
                  name="billingType"
                  control={licenseForm.control}
                  render={({ field: { value, onChange } }) => (
                    <Field>
                      <FieldLabel>Booking Type</FieldLabel>
                      <ToggleGroup
                        className="w-full"
                        variant="outline"
                        value={[value]}
                        onValueChange={(newValue) => {
                          if (newValue.length > 0) onChange(newValue[0]);
                        }}
                      >
                        <Toggle value="PER_BOOKING" className="flex-1">
                          Per Booking
                        </Toggle>
                        <Toggle value="PER_USER" className="flex-1">
                          Per User
                        </Toggle>
                      </ToggleGroup>
                    </Field>
                  )}
                />

                <div className="flex flex-wrap gap-2 *:flex-1">
                  <Controller
                    name="entityCount"
                    control={licenseForm.control}
                    rules={{ required: "Must enter a total of billable users" }}
                    render={({ field: { value, onChange } }) => (
                      <Field>
                        <FieldLabel>Total entities included</FieldLabel>
                        <Input
                          type="number"
                          placeholder="100"
                          defaultValue={value}
                          onChange={(event) => onChange(+event.target.value)}
                        />
                      </Field>
                    )}
                  />
                  <Controller
                    name="entityPrice"
                    control={licenseForm.control}
                    rules={{ required: "Must enter fixed price per user" }}
                    render={({ field: { value, onChange } }) => (
                      <Field>
                        <FieldLabel>Fixed price per entity ($)</FieldLabel>
                        <Input
                          type="number"
                          defaultValue={value / 100}
                          onChange={(event) =>
                            onChange(+event.target.value * 100)
                          }
                        />
                      </Field>
                    )}
                  />
                </div>

                <Controller
                  name="overages"
                  control={licenseForm.control}
                  rules={{ required: "Must enter overages" }}
                  render={({ field: { value, onChange } }) => (
                    <Field>
                      <FieldLabel>Overages ($)</FieldLabel>
                      <Input
                        type="number"
                        placeholder="0.99"
                        disabled={!isAdmin}
                        defaultValue={value / 100}
                        onChange={(event) =>
                          onChange(+event.target.value * 100)
                        }
                        autoComplete="off"
                      />
                    </Field>
                  )}
                />

                <Button
                  type="submit"
                  disabled={
                    licenseForm.formState.isSubmitting ||
                    licenseMutation.isPending
                  }
                  className="w-full"
                >
                  {t("continue")} - {calculateMonthlyPrice()}
                </Button>
              </Form>
            </CardPanel>
          </Card>
        ) : (
          <Card>
            <CardPanel>
              <div className="flex flex-col gap-4">
                <Field>
                  <FieldLabel>Checkout URL</FieldLabel>
                  <div className="flex w-full items-center gap-1">
                    <Input disabled value={stripeCheckoutUrl} className="min-w-0 flex-1" />
                    <CopyButton value={stripeCheckoutUrl} />
                  </div>
                </Field>
                {couponCode && (
                  <Field>
                    <FieldLabel>Coupon Code</FieldLabel>
                    <div className="flex w-full items-center gap-1">
                      <Input disabled value={couponCode} className="min-w-0 flex-1" />
                      <CopyButton value={couponCode} />
                    </div>
                  </Field>
                )}
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    licenseForm.reset();
                    setStripeCheckoutUrl(null);
                    setCouponCode(null);
                  }}
                >
                  Back
                </Button>
              </div>
            </CardPanel>
          </Card>
        )}

      <CardFrameFooter>
        <p className="text-muted-foreground text-xs">
          Need a coupon for this customer?{" "}
          <CreateCouponDialog
            billingEmail={watchedBillingEmail ?? ""}
            onCouponCreated={(code) => setCouponCode(code)}
          />
        </p>
      </CardFrameFooter>
    </CardFrame>
  );
};

function CreateCouponDialog({
  billingEmail,
  onCouponCreated,
}: {
  billingEmail: string;
  onCouponCreated: (code: string) => void;
}) {
  const [couponResult, setCouponResult] = useState<{
    promotionCode: string;
    couponId: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const couponForm = useForm<CouponFormValues>({
    defaultValues: {
      couponName: "",
      billingEmail: "",
      code: "",
      discountType: "percent",
      discountAmount: 10,
      duration: "once",
      durationInMonths: 3,
    },
  });

  const couponMutation = trpc.viewer.admin.createCoupon.useMutation({
    onSuccess: (data) => {
      showToast("Coupon created successfully", "success");
      setCouponResult(data);
      setCouponError(null);
      onCouponCreated(data.promotionCode);
    },
    onError: (err) => {
      setCouponError(err.message);
      setCouponResult(null);
    },
  });

  const watchedDuration = couponForm.watch("duration");

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      couponForm.setValue("billingEmail", billingEmail);
    }
    if (!isOpen) {
      couponForm.reset();
      setCouponResult(null);
      setCouponError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="cursor-pointer font-medium text-foreground underline underline-offset-2"
          />
        }
      >
        Create a coupon
      </DialogTrigger>
      <DialogPopup className="sm:max-w-md">
        <Form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            couponForm.handleSubmit((values) => {
              setCouponError(null);
              setCouponResult(null);
              couponMutation.mutate(values);
            })(event);
          }}
        >
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
            <DialogDescription>
              Create a Stripe coupon with a promotion code restricted to a
              specific customer.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            {couponError && (
              <Alert variant="error">
                <AlertDescription>{couponError}</AlertDescription>
              </Alert>
            )}

            {couponResult && (
              <Alert variant="success">
                <AlertDescription>
                  <div className="flex flex-col gap-1">
                    <span>
                      Promo Code: <strong>{couponResult.promotionCode}</strong>
                    </span>
                    <span>
                      Coupon ID: <strong>{couponResult.couponId}</strong>
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Controller
              name="couponName"
              control={couponForm.control}
              render={({ field: { value, onChange } }) => (
                <Field>
                  <FieldLabel>Coupon Name (optional)</FieldLabel>
                  <Input
                    placeholder="e.g. ACME Corp Discount"
                    value={value}
                    onChange={onChange}
                  />
                </Field>
              )}
            />

            <Controller
              name="billingEmail"
              control={couponForm.control}
              rules={{ required: "Billing email is required" }}
              render={({ field: { value, onChange } }) => (
                <Field>
                  <FieldLabel>Billing Email</FieldLabel>
                  <Input
                    type="email"
                    placeholder="customer@acme.com"
                    value={value}
                    onChange={onChange}
                    required
                  />
                </Field>
              )}
            />

            <Controller
              name="code"
              control={couponForm.control}
              rules={{ required: "Promo code is required" }}
              render={({ field: { value, onChange } }) => (
                <Field>
                  <FieldLabel>Promo Code</FieldLabel>
                  <Input
                    placeholder="e.g. ACME50OFF"
                    value={value}
                    onChange={onChange}
                    required
                  />
                </Field>
              )}
            />

            <Controller
              name="discountType"
              control={couponForm.control}
              render={({ field: { value, onChange } }) => (
                <Field>
                  <FieldLabel>Discount Type</FieldLabel>
                  <ToggleGroup
                    className="w-full"
                    variant="outline"
                    value={[value]}
                    onValueChange={(newValue) => {
                      if (newValue.length > 0) onChange(newValue[0]);
                    }}
                  >
                    <Toggle value="percent" className="flex-1">
                      Percentage
                    </Toggle>
                    <Toggle value="fixed" className="flex-1">
                      Fixed Amount
                    </Toggle>
                  </ToggleGroup>
                </Field>
              )}
            />

            <Controller
              name="discountAmount"
              control={couponForm.control}
              rules={{ required: "Discount amount is required", min: 1 }}
              render={({ field: { value, onChange } }) => (
                <Field>
                  <FieldLabel>
                    Discount Amount{" "}
                    {couponForm.watch("discountType") === "percent"
                      ? "(%)"
                      : "(cents)"}
                  </FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={value}
                    onChange={(event) => {
                      const raw = event.target.value;
                      onChange(raw === "" ? "" : +raw);
                    }}
                    required
                  />
                </Field>
              )}
            />

            <Controller
              name="duration"
              control={couponForm.control}
              render={({ field: { value, onChange } }) => (
                <Field>
                  <FieldLabel>Duration</FieldLabel>
                  <Select
                    value={value}
                    onValueChange={(newValue) => {
                      if (newValue) onChange(newValue);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectPopup>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="repeating">Repeating</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectPopup>
                  </Select>
                </Field>
              )}
            />

            {watchedDuration === "repeating" && (
              <Controller
                name="durationInMonths"
                control={couponForm.control}
                rules={{
                  required: "Duration in months is required",
                  min: 1,
                  max: 36,
                }}
                render={({ field: { value, onChange } }) => (
                  <Field>
                    <FieldLabel>Duration in Months</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      max={36}
                      value={value}
                      onChange={(event) => onChange(+event.target.value)}
                      required
                    />
                  </Field>
                )}
              />
            )}
          </DialogPanel>
          <DialogFooter variant="bare">
            <DialogClose render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={
                couponForm.formState.isSubmitting || couponMutation.isPending
              }
            >
              Create Coupon
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
