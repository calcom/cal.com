import { UNIFIED_PHONE_NUMBER_FIELD } from "@calcom/features/bookings/lib/SystemField";
import { WorkflowActions } from "@calcom/prisma/enums";

import type { BookingFieldType } from "./types";
import {
  PhoneFieldStrategy,
  type IPhoneFieldResolver,
  type PhoneFieldContext,
  type PhoneFieldResolution,
  type PhoneRequirement,
  type PhoneRequirementType,
} from "./types";

/**
 * Concrete implementation of phone field resolution logic
 */
export class PhoneFieldResolver implements IPhoneFieldResolver {
  resolvePhoneField(context: PhoneFieldContext): PhoneFieldResolution {
    const requirements = this.extractPhoneRequirements(context.workflows);
    const strategy = this.determineStrategy(context);
    const field = this.createPhoneField(strategy, requirements, context);

    return {
      field,
      strategy,
      requirements,
    };
  }

  extractPhoneRequirements(
    workflows: readonly import("./types").WorkflowDataForBookingField[]
  ): readonly PhoneRequirement[] {
    const requirements: PhoneRequirement[] = [];
    const seenWorkflows = new Set<number>();

    for (const workflow of workflows) {
      // Add null checks for workflow and its properties
      if (!workflow?.workflow?.id || !workflow.workflow.steps) continue;

      if (seenWorkflows.has(workflow.workflow.id)) continue;
      seenWorkflows.add(workflow.workflow.id);

      for (const step of workflow.workflow.steps) {
        const requirement = this.mapStepToRequirement(
          step as import("@calcom/features/ee/workflows/lib/types").WorkflowStep,
          workflow.workflow.id
        );
        if (requirement) {
          requirements.push(requirement);
        }
      }
    }

    return requirements;
  }

  determineStrategy(context: PhoneFieldContext): PhoneFieldStrategy {
    const requirements = this.extractPhoneRequirements(context.workflows);

    if (requirements.length === 0) {
      return PhoneFieldStrategy.NONE;
    }

    if (context.isPhoneBasedBooking) {
      return PhoneFieldStrategy.ENHANCE_ATTENDEE_PHONE;
    }

    return PhoneFieldStrategy.CREATE_UNIFIED_FIELD;
  }

  private createPhoneField(
    strategy: PhoneFieldStrategy,
    requirements: readonly PhoneRequirement[],
    context: PhoneFieldContext
  ): BookingFieldType | null {
    switch (strategy) {
      case PhoneFieldStrategy.NONE:
        return null;

      case PhoneFieldStrategy.ENHANCE_ATTENDEE_PHONE:
        return this.createEnhancedAttendeeField(requirements, context);

      case PhoneFieldStrategy.CREATE_UNIFIED_FIELD:
        return this.createUnifiedField(requirements);

      default:
        throw new Error(`Unknown phone field strategy: ${strategy}`);
    }
  }

  private createEnhancedAttendeeField(
    requirements: readonly PhoneRequirement[],
    context: PhoneFieldContext
  ): BookingFieldType {
    const attendeeField = context.existingFields.find((f) => f.name === "attendeePhoneNumber");

    if (!attendeeField) {
      throw new Error("Cannot enhance attendee phone field: field not found");
    }

    // For phone-based bookings with workflows, we keep the simple phone_number label
    // The UI can show additional context based on sources if needed
    return {
      ...attendeeField,
      defaultLabel: "phone_number",
      sources: [...attendeeField.sources, ...this.createWorkflowSources(requirements)],
      required: true,
    } as const;
  }

  private createUnifiedField(requirements: readonly PhoneRequirement[]): BookingFieldType {
    // For unified field, we use a simple label
    // The UI can show additional context based on sources if needed
    return {
      name: UNIFIED_PHONE_NUMBER_FIELD,
      type: "phone",
      defaultLabel: "phone_number",
      defaultPlaceholder: "enter_phone_number",
      editable: "system",
      required: requirements.some((req) => req.required),
      sources: this.createWorkflowSources(requirements),
    } as const;
  }

  private mapStepToRequirement(
    step: import("@calcom/features/ee/workflows/lib/types").WorkflowStep,
    workflowId: number
  ): PhoneRequirement | null {
    const typeMap: Record<string, { type: PhoneRequirementType; label: string; required?: boolean }> = {
      [WorkflowActions.SMS_ATTENDEE]: {
        type: "sms_reminder",
        label: "SMS Reminder",
        required: !!step.numberRequired,
      },
      [WorkflowActions.WHATSAPP_ATTENDEE]: {
        type: "whatsapp_reminder",
        label: "WhatsApp Reminder",
        required: !!step.numberRequired,
      },
      [WorkflowActions.CAL_AI_PHONE_CALL]: {
        type: "ai_phone_call",
        label: "AI Phone Call",
        required: true,
      },
    };

    const mapping = typeMap[step.action];
    if (!mapping) return null;

    return {
      workflowId,
      type: mapping.type,
      required: mapping.required ?? false,
      label: mapping.label,
    };
  }

  private getUniquePurposeLabels(requirements: readonly PhoneRequirement[]): string[] {
    return Array.from(new Set(requirements.map((req) => req.label)));
  }

  private formatPurposeLabels(labels: string[]): string {
    if (labels.length === 0) return "";
    if (labels.length === 1) return ` (${labels[0]})`;
    return ` (${labels.join(", ")})`;
  }

  private createWorkflowSources(requirements: readonly PhoneRequirement[]) {
    return requirements.map((req) => ({
      label: req.label,
      id: `workflow-${req.workflowId}`,
      type: req.type,
    }));
  }
}
