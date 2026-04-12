import { WorkflowActivationDto } from "@/modules/workflows/inputs/create-event-type-workflow.input";
import { WorkflowFormActivationDto } from "@/modules/workflows/inputs/create-form-workflow";
import {
  EventTypeWorkflowStepOutputDto,
  EventTypeWorkflowOutput,
} from "@/modules/workflows/outputs/event-type-workflow.output";
import {
  RoutingFormWorkflowOutput,
  RoutingFormWorkflowStepOutputDto,
} from "@/modules/workflows/outputs/routing-form-workflow.output";
import { WorkflowType } from "@/modules/workflows/workflows.repository";
import { Injectable } from "@nestjs/common";

import {
  ATTENDEE,
  CAL_AI_PHONE_CALL,
  EMAIL,
  EMAIL_ADDRESS,
  EMAIL_ATTENDEE,
  EMAIL_HOST,
  ENUM_TO_STEP_ACTIONS,
  ENUM_TO_TEMPLATES,
  FORM_ALLOWED_STEP_ACTIONS,
  FormAllowedStepAction,
  HOST,
  PHONE_NUMBER,
  RecipientType,
  SMS_ATTENDEE,
  SMS_NUMBER,
  StepAction,
  WHATSAPP_ATTENDEE,
  WHATSAPP_NUMBER,
} from "../inputs/workflow-step.input";
import {
  ENUM_TO_TIME_UNIT,
  ENUM_TO_WORKFLOW_TRIGGER,
  HOUR,
  OnAfterCalVideoGuestsNoShowTriggerDto,
  OnAfterCalVideoHostsNoShowTriggerDto,
  OnAfterEventTriggerDto,
  OnBeforeEventTriggerDto,
  OnCancelTriggerDto,
  OnCreationTriggerDto,
  OnFormSubmittedTriggerDto,
  OnFormSubmittedNoEventTriggerDto,
  OnNoShowUpdateTriggerDto,
  OnPaidTriggerDto,
  OnPaymentInitiatedTriggerDto,
  OnRejectedTriggerDto,
  OnRequestedTriggerDto,
  OnRescheduleTriggerDto,
  WORKFLOW_TRIGGER_TO_ENUM,
  FORM_WORKFLOW_TRIGGER_TYPES,
  ENUM_ROUTING_FORM_WORFLOW_TRIGGERS,
  ENUM_OFFSET_WORFLOW_TRIGGERS,
} from "../inputs/workflow-trigger.input";

export type TriggerDtoType =
  | OnAfterEventTriggerDto
  | OnBeforeEventTriggerDto
  | OnCreationTriggerDto
  | OnRescheduleTriggerDto
  | OnCancelTriggerDto
  | OnAfterCalVideoGuestsNoShowTriggerDto
  | OnFormSubmittedTriggerDto
  | OnFormSubmittedNoEventTriggerDto
  | OnRejectedTriggerDto
  | OnRequestedTriggerDto
  | OnPaymentInitiatedTriggerDto
  | OnPaidTriggerDto
  | OnNoShowUpdateTriggerDto
  | OnAfterCalVideoHostsNoShowTriggerDto;

export type TriggerEventTypeDtoType =
  | OnAfterEventTriggerDto
  | OnBeforeEventTriggerDto
  | OnCreationTriggerDto
  | OnRescheduleTriggerDto
  | OnCancelTriggerDto
  | OnAfterCalVideoGuestsNoShowTriggerDto
  | OnRejectedTriggerDto
  | OnRequestedTriggerDto
  | OnPaymentInitiatedTriggerDto
  | OnPaidTriggerDto
  | OnNoShowUpdateTriggerDto
  | OnAfterCalVideoHostsNoShowTriggerDto;

type StepConfig = {
  recipient: RecipientType;
  messageKey: "html" | "text";
  setsCustomRecipient: boolean;
  requiresPhone: boolean;
};

const ACTION_CONFIG_MAP = {
  [EMAIL_HOST]: {
    recipient: HOST,
    messageKey: "html",
    setsCustomRecipient: false,
    requiresPhone: false,
  } satisfies StepConfig,
  [EMAIL_ATTENDEE]: {
    recipient: ATTENDEE,
    messageKey: "html",
    setsCustomRecipient: false,
    requiresPhone: false,
  },
  [SMS_ATTENDEE]: {
    recipient: ATTENDEE,
    messageKey: "text",
    setsCustomRecipient: false,
    requiresPhone: true,
  },
  [WHATSAPP_ATTENDEE]: {
    recipient: ATTENDEE,
    messageKey: "text",
    setsCustomRecipient: false,
    requiresPhone: true,
  },
  [EMAIL_ADDRESS]: { recipient: EMAIL, messageKey: "html", setsCustomRecipient: true, requiresPhone: false },
  [SMS_NUMBER]: {
    recipient: PHONE_NUMBER,
    messageKey: "text",
    setsCustomRecipient: true,
    requiresPhone: false,
  },
  [WHATSAPP_NUMBER]: {
    recipient: PHONE_NUMBER,
    messageKey: "text",
    setsCustomRecipient: true,
    requiresPhone: false,
  },
  [CAL_AI_PHONE_CALL]: {
    recipient: PHONE_NUMBER,
    messageKey: "text",
    setsCustomRecipient: true,
    requiresPhone: false,
  },
} satisfies Record<StepAction, StepConfig>;

@Injectable()
export class WorkflowsOutputService {
  _isFormAllowedStepAction(action: StepAction): action is FormAllowedStepAction {
    return FORM_ALLOWED_STEP_ACTIONS.some((formAction) => formAction === action);
  }
  _isFormAllowedTrigger(
    trigger: WorkflowType["trigger"]
  ): trigger is (typeof ENUM_ROUTING_FORM_WORFLOW_TRIGGERS)[number] {
    return FORM_WORKFLOW_TRIGGER_TYPES.some(
      (formTrigger) => WORKFLOW_TRIGGER_TO_ENUM[formTrigger] === trigger
    );
  }

  private _isOffsetTrigger(
    trigger: WorkflowType["trigger"]
  ): trigger is (typeof ENUM_OFFSET_WORFLOW_TRIGGERS)[number] {
    return ENUM_OFFSET_WORFLOW_TRIGGERS.some((offsetTrigger) => offsetTrigger === trigger);
  }

  /**
   * Maps a single workflow step from the database entity to its DTO representation.
   * @param step The workflow step object from the database.
   * @returns An EventTypeWorkflowStepOutputDto.
   */
  mapStep(step: WorkflowType["steps"][number], _discriminator: "event-type"): EventTypeWorkflowStepOutputDto;
  mapStep(
    step: WorkflowType["steps"][number],
    _discriminator: "routing-form"
  ): RoutingFormWorkflowStepOutputDto;
  mapStep(
    step: WorkflowType["steps"][number],
    _discriminator: "event-type" | "routing-form"
  ): EventTypeWorkflowStepOutputDto | RoutingFormWorkflowStepOutputDto {
    const action = ENUM_TO_STEP_ACTIONS[step.action];
    const config = ACTION_CONFIG_MAP[action] || {
      recipient: ATTENDEE,
      setsCustomRecipient: false,
      requiresPhone: false,
    };

    const customRecipient = step.sendTo ?? "";
    const reminderBody = step.reminderBody ?? "";

    const baseAction = {
      id: step.id,
      stepNumber: step.stepNumber,
      template: ENUM_TO_TEMPLATES[step.template],
      recipient: config.recipient,
      sender: step.sender ?? "Default Sender",
      includeCalendarEvent: step.includeCalendarEvent,
      phoneRequired: config.requiresPhone ? (step.numberRequired ?? false) : undefined,
      email: config.recipient === EMAIL ? customRecipient : "",
      phone: config.recipient === PHONE_NUMBER ? customRecipient : "",
      message: {
        subject: step.emailSubject ?? "",
        html: config.messageKey === "html" ? reminderBody : undefined,
        text: config.messageKey === "text" ? reminderBody : undefined,
      },
    };

    return this._isFormAllowedStepAction(action)
      ? ({
          ...baseAction,
          action: action,
        } satisfies RoutingFormWorkflowStepOutputDto)
      : ({
          ...baseAction,
          action: action,
        } satisfies EventTypeWorkflowStepOutputDto);
  }

  toRoutingFormOutputDto(workflow: WorkflowType): RoutingFormWorkflowOutput | void {
    if (workflow.type === "ROUTING_FORM" && this._isFormAllowedTrigger(workflow.trigger)) {
      const activation: WorkflowFormActivationDto = {
        isActiveOnAllRoutingForms: workflow.isActiveOnAll,
        activeOnRoutingFormIds:
          workflow.activeOnRoutingForms?.map((relation) => relation.routingFormId) ?? [],
      };

      const trigger: TriggerDtoType = this._isOffsetTrigger(workflow.trigger)
        ? {
            type: ENUM_TO_WORKFLOW_TRIGGER[workflow.trigger],
            offset: {
              value: workflow.time ?? 1,
              unit: workflow.timeUnit ? ENUM_TO_TIME_UNIT[workflow.timeUnit] : HOUR,
            },
          }
        : { type: ENUM_TO_WORKFLOW_TRIGGER[workflow.trigger] };

      const steps: RoutingFormWorkflowStepOutputDto[] = workflow.steps.map((step) => {
        return this.mapStep(step, "routing-form");
      });

      return {
        id: workflow.id,
        name: workflow.name,
        activation: activation,
        trigger: trigger,
        steps: steps.sort((stepA, stepB) => stepA.stepNumber - stepB.stepNumber),
        type: "routing-form",
      };
    }
  }

  toEventTypeOutputDto(workflow: WorkflowType): EventTypeWorkflowOutput | void {
    if (workflow.type === "EVENT_TYPE" && !this._isFormAllowedTrigger(workflow.trigger)) {
      const activation: WorkflowActivationDto = {
        isActiveOnAllEventTypes: workflow.isActiveOnAll,
        activeOnEventTypeIds: workflow.activeOn?.map((relation) => relation.eventTypeId) ?? [],
      };

      const trigger: TriggerEventTypeDtoType = this._isOffsetTrigger(workflow.trigger)
        ? {
            type: ENUM_TO_WORKFLOW_TRIGGER[workflow.trigger],
            offset: {
              value: workflow.time ?? 1,
              unit: workflow.timeUnit ? ENUM_TO_TIME_UNIT[workflow.timeUnit] : HOUR,
            },
          }
        : { type: ENUM_TO_WORKFLOW_TRIGGER[workflow.trigger] };

      const steps: EventTypeWorkflowStepOutputDto[] = workflow.steps.map((step) => {
        return this.mapStep(step, "event-type");
      });

      return {
        id: workflow.id,
        name: workflow.name,
        activation: activation,
        trigger: trigger,
        steps: steps.sort((stepA, stepB) => stepA.stepNumber - stepB.stepNumber),
        type: "event-type",
      };
    }
  }
}
