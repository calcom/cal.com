"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, Label, TextField, Select, ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Logo } from "@calcom/ui/components/logo";
import { showToast } from "@calcom/ui/components/toast";

import { useOnboardingStore, type InviteRole } from "../../store/onboarding-store";

type OrganizationInviteViewProps = {
  userEmail: string;
};

const formSchema = z.object({
  invites: z.array(
    z.object({
      email: z.string().email("Invalid email address"),
      team: z.string().min(1, "Team is required"),
      role: z.enum(["member", "admin"]),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

export const OrganizationInviteView = ({ userEmail }: OrganizationInviteViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmailMode = searchParams?.get("mode") === "email";

  const store = useOnboardingStore();
  const { invites: storedInvites, inviteRole, setInvites, setInviteRole, resetOnboarding } = store;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onboardMutation = trpc.viewer.organizations.onboard.useMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invites:
        storedInvites.length > 0
          ? storedInvites
          : [
              { email: "", team: "", role: "member" },
              { email: "", team: "", role: "member" },
            ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invites",
  });

  const submitOnboarding = async (invitesData: FormValues["invites"]) => {
    if (!store.onboardingId) {
      showToast("Onboarding session not found. Please start over.", "error");
      router.push("/onboarding/organization/details");
      return;
    }

    // Get all onboarding data from store
    const onboardingData = {
      plan: store.selectedPlan,
      organization: store.organizationDetails,
      brand: store.organizationBrand,
      teams: store.teams.map((team) => ({
        id: -1, // New team
        name: team.name,
        isBeingMigrated: false,
        slug: null,
      })),
      invites: invitesData,
      inviteRole: inviteRole,
      onboardingId: store.onboardingId,
    };

    try {
      setIsSubmitting(true);
      const result = await onboardMutation.mutateAsync(onboardingData);

      if (result.requiresPayment) {
        // Redirect to checkout
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          showToast("Failed to create checkout session. Please try again.", "error");
        }
      } else {
        // Organization created successfully (self-hosted)
        showToast("Organization created successfully!", "success");
        resetOnboarding();
        router.push("/event-types");
      }
    } catch (error) {
      console.error("Error submitting onboarding:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to submit onboarding. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = async (data?: FormValues) => {
    if (data) {
      // Save invites to store
      setInvites(data.invites);
      await submitOnboarding(data.invites);
    } else {
      // No invites, submit with empty array
      await submitOnboarding([]);
    }
  };

  const handleSkip = async () => {
    // Complete onboarding without invites
    await submitOnboarding([]);
  };

  const handleInviteViaEmail = () => {
    router.push("/onboarding/organization/invite?mode=email");
  };

  const hasValidInvites = fields.some((_, index) => {
    const email = form.watch(`invites.${index}.email`);
    const team = form.watch(`invites.${index}.team`);
    return email && email.trim().length > 0 && team && team.trim().length > 0;
  });

  // Get teams from store, filter out empty teams
  const filteredTeams = store.teams.filter((team) => team.name && team.name.trim().length > 0);
  const teams =
    filteredTeams.length > 0
      ? filteredTeams.map((team) => ({ value: team.name.toLowerCase(), label: team.name }))
      : [
          { value: "sales", label: "Sales" },
          { value: "engineering", label: "Engineering" },
          { value: "marketing", label: "Marketing" },
        ];

  return (
    <div className="bg-default flex min-h-screen w-full flex-col items-start overflow-clip rounded-xl">
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1.5 w-1.5 rounded-full" />
        </div>

        <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-2">
          <p className="text-emphasis text-sm font-medium leading-none">{userEmail}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-full w-full items-start justify-center px-6 py-8">
        <div className="flex w-full max-w-[600px] flex-col gap-4">
          {/* Card */}
          <div className="bg-muted border-muted relative rounded-xl border p-1">
            <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
              {/* Card Header */}
              <div className="flex w-full gap-1.5 px-5 py-4">
                <div className="flex w-full flex-col gap-1">
                  <h1 className="font-cal text-xl font-semibold leading-6">Invite your teammates</h1>
                  <p className="text-subtle text-sm font-medium leading-tight">
                    {isEmailMode
                      ? "Enter your teammates email address and set their team to add them to your Organization."
                      : "Connect your Google Workspace, invite via email, upload a CSV file or copy the invite link and share it with your teammates to add them to your Organization."}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="bg-default border-subtle w-full rounded-md border">
                <div className="flex w-full flex-col gap-8 px-5 py-5">
                  {!isEmailMode ? (
                    // Initial invite options view
                    <div className="flex w-full flex-col gap-4">
                      <Button color="secondary" className="w-full justify-center" StartIcon="mail">
                        Connect Google Workspace
                      </Button>

                      <div className="flex items-center gap-2">
                        <div className="bg-subtle h-px flex-1" />
                        <span className="text-subtle text-xs">or</span>
                        <div className="bg-subtle h-px flex-1" />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          color="secondary"
                          className="flex-1 justify-center"
                          onClick={handleInviteViaEmail}>
                          Invite via email
                        </Button>
                        <Button color="secondary" className="flex-1 justify-center" StartIcon="upload">
                          Upload CSV file
                        </Button>
                        <Button color="secondary" className="flex-1 justify-center" StartIcon="link">
                          Copy invite link
                        </Button>
                      </div>

                      {/* Role selector */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-emphasis text-sm">Invite all as</span>
                          <ToggleGroup
                            value={inviteRole}
                            onValueChange={(value) => value && setInviteRole(value as "member" | "admin")}
                            options={[
                              { value: "admin", label: "Admins" },
                              { value: "member", label: "Members" },
                            ]}
                          />
                        </div>
                        <span className="text-subtle text-sm">You can modify roles later</span>
                      </div>
                    </div>
                  ) : (
                    // Email invite form
                    <Form form={form} handleSubmit={handleContinue} className="w-full">
                      <div className="flex w-full flex-col gap-4">
                        {/* Email and Team inputs */}
                        <div className="flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Label className="text-emphasis text-sm font-medium">Email</Label>
                            <Label className="text-emphasis text-sm font-medium">Team</Label>
                          </div>

                          {fields.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-0.5">
                              <div className="grid flex-1 grid-cols-2 items-start gap-2">
                                <TextField
                                  labelSrOnly
                                  {...form.register(`invites.${index}.email`)}
                                  placeholder="ann@deel.com"
                                  type="email"
                                  className="h-7 rounded-[10px] text-sm"
                                />
                                <Select
                                  size="sm"
                                  options={teams}
                                  value={teams.find((t) => t.value === form.watch(`invites.${index}.team`))}
                                  onChange={(option) => {
                                    if (option) {
                                      form.setValue(`invites.${index}.team`, option.value);
                                    }
                                  }}
                                  placeholder="Select team"
                                />
                              </div>
                              <Button
                                type="button"
                                color="minimal"
                                variant="icon"
                                size="sm"
                                className="h-7 w-7"
                                disabled={fields.length === 1}
                                onClick={() => remove(index)}>
                                <Icon name="x" className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          {/* Add button */}
                          <Button
                            type="button"
                            color="secondary"
                            size="sm"
                            StartIcon="plus"
                            className="w-fit"
                            onClick={() => append({ email: "", team: "", role: "member" })}>
                            Add
                          </Button>
                        </div>

                        {/* Role selector */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-emphasis text-sm">Invite all as</span>
                            <ToggleGroup
                              value={inviteRole}
                              onValueChange={(value) => value && setInviteRole(value as "member" | "admin")}
                              options={[
                                { value: "member", label: "Members" },
                                { value: "admin", label: "Admins" },
                              ]}
                            />
                          </div>
                          <span className="text-subtle text-sm">You can modify roles later</span>
                        </div>
                      </div>
                    </Form>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex w-full items-center justify-end gap-1 px-5 py-4">
                <Button
                  type={isEmailMode ? "submit" : "button"}
                  color="primary"
                  className="rounded-[10px]"
                  disabled={(isEmailMode && !hasValidInvites) || isSubmitting}
                  loading={isSubmitting}
                  onClick={isEmailMode ? form.handleSubmit(handleContinue) : handleContinue}>
                  Continue
                </Button>
              </div>
            </div>
          </div>

          {/* Skip button */}
          <div className="flex w-full justify-center">
            <button
              onClick={handleSkip}
              className="text-subtle hover:bg-subtle rounded-[10px] px-2 py-1.5 text-sm font-medium leading-4">
              I'll do this later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
