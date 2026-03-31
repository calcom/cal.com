import { Button } from "@calid/features/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@calid/features/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@calid/features/ui/components/dialog";
import { Input } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { Switch } from "@calid/features/ui/components/switch";
import { useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import classNames from "@calcom/ui/classNames";

type BookingPageFieldKey =
  | "what"
  | "when"
  | "who"
  | "where"
  | "notes"
  | "successHeadline"
  | "successSubheadline";

export const EventBookingPage = () => {
  const formMethods = useFormContext<FormValues>();
  const [editingField, setEditingField] = useState<BookingPageFieldKey | null>(null);
  const [labelDraft, setLabelDraft] = useState("");

  const bookingPageFields = useMemo(
    () =>
      [
        { key: "what" as const, fallbackLabel: "What" },
        { key: "when" as const, fallbackLabel: "When" },
        { key: "who" as const, fallbackLabel: "Who" },
        { key: "where" as const, fallbackLabel: "Where" },
        { key: "notes" as const, fallbackLabel: "Additional notes" },
      ] satisfies { key: BookingPageFieldKey; fallbackLabel: string }[],
    []
  );

  const thankYouHeaderFields = useMemo(
    () =>
      [
        { key: "successHeadline" as const, fallbackLabel: "Success Headline" },
        { key: "successSubheadline" as const, fallbackLabel: "Success Subheadline" },
      ] satisfies { key: BookingPageFieldKey; fallbackLabel: string }[],
    []
  );

  const getFieldLabel = (fieldKey: BookingPageFieldKey, fallbackLabel: string) =>
    formMethods.getValues(`metadata.bookingPage.thankYouPage.fields.${fieldKey}.label`) || fallbackLabel;

  const getFieldVisible = (fieldKey: BookingPageFieldKey) => {
    const value = formMethods.getValues(`metadata.bookingPage.thankYouPage.fields.${fieldKey}.visible`);
    return value !== false;
  };

  const openEditLabelDialog = (fieldKey: BookingPageFieldKey, fallbackLabel: string) => {
    setLabelDraft(getFieldLabel(fieldKey, fallbackLabel));
    setEditingField(fieldKey);
  };

  const saveLabel = () => {
    if (!editingField) return;
    formMethods.setValue(`metadata.bookingPage.thankYouPage.fields.${editingField}.label`, labelDraft, {
      shouldDirty: true,
    });
    setEditingField(null);
    setLabelDraft("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Booking Page</CardTitle>
          <CardDescription>Customize your booking confirmation page content.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thank You Page Fields</CardTitle>
          <CardDescription>Show/hide fields and edit their labels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookingPageFields.map((field) => {
            const currentLabel = getFieldLabel(field.key, field.fallbackLabel);
            const isVisible = getFieldVisible(field.key);
            return (
              <div
                key={field.key}
                className="border-subtle flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="icon"
                    color="secondary"
                    StartIcon="pencil-line"
                    onClick={() => openEditLabelDialog(field.key, field.fallbackLabel)}
                    tooltip="Edit"
                  />
                  <div>
                    <p className="text-default text-sm font-medium">{currentLabel}</p>
                    <p className="text-subtle text-xs">{field.fallbackLabel}</p>
                  </div>
                </div>
                <Switch
                  checked={isVisible}
                  onCheckedChange={(checked) =>
                    formMethods.setValue(
                      `metadata.bookingPage.thankYouPage.fields.${field.key}.visible`,
                      checked,
                      {
                        shouldDirty: true,
                      }
                    )
                  }
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thank You Page Header</CardTitle>
          <CardDescription>Show/hide and customize the success heading and subtitle text.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {thankYouHeaderFields.map((field) => {
            const currentLabel = getFieldLabel(field.key, field.fallbackLabel);
            const isVisible = getFieldVisible(field.key);
            return (
              <div
                key={field.key}
                className="border-subtle flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="icon"
                    color="secondary"
                    StartIcon="pencil-line"
                    onClick={() => openEditLabelDialog(field.key, field.fallbackLabel)}
                    tooltip="Edit"
                  />
                  <div>
                    <p className="text-default text-sm font-medium">{currentLabel}</p>
                    <p className="text-subtle text-xs">{field.fallbackLabel}</p>
                  </div>
                </div>
                <Switch
                  checked={isVisible}
                  onCheckedChange={(checked) =>
                    formMethods.setValue(
                      `metadata.bookingPage.thankYouPage.fields.${field.key}.visible`,
                      checked,
                      {
                        shouldDirty: true,
                      }
                    )
                  }
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banner Position</CardTitle>
          <CardDescription>Choose where to render the booking page banner.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {(["top", "bottom"] as const).map((position) => {
            const selected =
              (formMethods.watch("metadata.bookingPage.banner.position") || "bottom") === position;
            return (
              <Button
                key={position}
                type="button"
                color={selected ? "primary" : "secondary"}
                onClick={() =>
                  formMethods.setValue("metadata.bookingPage.banner.position", position, {
                    shouldDirty: true,
                  })
                }>
                {position === "top" ? "Top" : "Bottom"}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CTA Redirect Button</CardTitle>
          <CardDescription>Add a branded redirect button to the success page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            name="metadata.bookingPage.cta.enabled"
            control={formMethods.control}
            render={({ field: { value, onChange } }) => (
              <div className="flex items-center justify-between">
                <Label>Enable CTA</Label>
                <Switch checked={!!value} onCheckedChange={onChange} />
              </div>
            )}
          />

          {!!formMethods.watch("metadata.bookingPage.cta.enabled") && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>CTA Text</Label>
                <Input
                  value={formMethods.watch("metadata.bookingPage.cta.text") || ""}
                  onChange={(e) =>
                    formMethods.setValue("metadata.bookingPage.cta.text", e.target.value, {
                      shouldDirty: true,
                    })
                  }
                  placeholder="Book again"
                />
              </div>

              <div className="space-y-1">
                <Label>Redirect URL</Label>
                <Input
                  value={formMethods.watch("metadata.bookingPage.cta.url") || ""}
                  onChange={(e) =>
                    formMethods.setValue("metadata.bookingPage.cta.url", e.target.value, {
                      shouldDirty: true,
                    })
                  }
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-1">
                <Label>CTA Position</Label>
                <div className="flex gap-2">
                  {(["top", "bottom"] as const).map((position) => {
                    const selected =
                      (formMethods.watch("metadata.bookingPage.cta.position") || "bottom") === position;
                    return (
                      <Button
                        key={position}
                        type="button"
                        color={selected ? "primary" : "secondary"}
                        onClick={() =>
                          formMethods.setValue("metadata.bookingPage.cta.position", position, {
                            shouldDirty: true,
                          })
                        }>
                        {position === "top" ? "Top" : "Bottom"}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingField} onOpenChange={(open) => !open && setEditingField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="booking-page-label">Label</Label>
            <Input
              id="booking-page-label"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
            />
          </div>
          <DialogFooter className={classNames("mt-4")}>
            <DialogClose />
            <Button type="button" onClick={saveLabel} StartIcon="check">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
