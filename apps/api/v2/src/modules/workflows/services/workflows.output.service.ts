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
  AFTER_EVENT,
  AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  BEFORE_EVENT,
  ENUM_TO_TIME_UNIT,
  ENUM_TO_WORKFLOW_TRIGGER,
  FORM_SUBMITTED,
  HOUR,
  OnAfterCalVideoGuestsNoShowTriggerDto,
  OnAfterCalVideoHostsNoShowTriggerDto,
  OnAfterEventTriggerDto,
  OnBeforeEventTriggerDto,
  OnCancelTriggerDto,
  OnCreationTriggerDto,
  OnFormSubmittedTriggerDto,
  OnNoShowUpdateTriggerDto,
  OnPaidTriggerDto,
  OnPaymentInitiatedTriggerDto,
  OnRejectedTriggerDto,
  OnRequestedTriggerDto,
  OnRescheduleTriggerDto,
  WORKFLOW_TRIGGER_TO_ENUM,
} from "../inputs/workflow-trigger.input";

export type TriggerDtoType =
  | OnAfterEventTriggerDto
  | OnBeforeEventTriggerDto
  | OnCreationTriggerDto
  | OnRescheduleTriggerDto
  | OnCancelTriggerDto
  | OnAfterCalVideoGuestsNoShowTriggerDto
  | OnFormSubmittedTriggerDto
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
  /**
   * Maps a single workflow step from the database entity to its DTO representation.
   * @param step The workflow step object from the database.
   * @returns An EventTypeWorkflowStepOutputDto.
   */
  mapStep(
    step: WorkflowType["steps"][number]
  ): EventTypeWorkflowStepOutputDto | RoutingFormWorkflowStepOutputDto {
    const action = ENUM_TO_STEP_ACTIONS[step.action];
    const config = ACTION_CONFIG_MAP[action] || {
      recipient: ATTENDEE,
      setsCustomRecipient: false,
      requiresPhone: false,
    };

    const customRecipient = step.sendTo ?? "";
    const reminderBody = step.reminderBody ?? "";

    return {
      id: step.id,
      stepNumber: step.stepNumber,
      action: action,
      template: ENUM_TO_TEMPLATES[step.template],
      recipient: config.recipient,
      sender: step.sender ?? "Default Sender",
      includeCalendarEvent: step.includeCalendarEvent,
      phoneRequired: config.requiresPhone ? step.numberRequired ?? false : undefined,
      email: config.recipient === EMAIL ? customRecipient : "",
      phone: config.recipient === PHONE_NUMBER ? customRecipient : "",
      message: {
        subject: step.emailSubject ?? "",
        html: config.messageKey === "html" ? reminderBody : undefined,
        text: config.messageKey === "text" ? reminderBody : undefined,
      },
    };
  }

  toRoutingFormOutputDto(workflow: WorkflowType): RoutingFormWorkflowOutput | void {
    if (workflow.type === "ROUTING_FORM" && workflow.trigger === WORKFLOW_TRIGGER_TO_ENUM[FORM_SUBMITTED]) {
      const activation: WorkflowFormActivationDto = {
        isActiveOnAllRoutingForms: workflow.isActiveOnAll,
        activeOnRoutingFormIds:
          workflow.activeOnRoutingForms?.map((relation) => relation.routingFormId) ?? [],
      };

      const trigger: TriggerDtoType = { type: ENUM_TO_WORKFLOW_TRIGGER[workflow.trigger] };

      const steps: RoutingFormWorkflowStepOutputDto[] = workflow.steps.map(this.mapStep);

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
    if (workflow.type === "EVENT_TYPE" && workflow.trigger !== WORKFLOW_TRIGGER_TO_ENUM[FORM_SUBMITTED]) {
      const activation: WorkflowActivationDto = {
        isActiveOnAllEventTypes: workflow.isActiveOnAll,
        activeOnEventTypeIds: workflow.activeOn?.map((relation) => relation.eventTypeId) ?? [],
      };

      const trigger: TriggerEventTypeDtoType =
        workflow.trigger === WORKFLOW_TRIGGER_TO_ENUM[BEFORE_EVENT] ||
        workflow.trigger === WORKFLOW_TRIGGER_TO_ENUM[AFTER_EVENT] ||
        workflow.trigger === WORKFLOW_TRIGGER_TO_ENUM[AFTER_GUESTS_CAL_VIDEO_NO_SHOW] ||
        workflow.trigger === WORKFLOW_TRIGGER_TO_ENUM[AFTER_HOSTS_CAL_VIDEO_NO_SHOW]
          ? {
              type: ENUM_TO_WORKFLOW_TRIGGER[workflow.trigger],
              offset: {
                value: workflow.time ?? 1,
                unit: workflow.timeUnit ? ENUM_TO_TIME_UNIT[workflow.timeUnit] : HOUR,
              },
            }
          : { type: ENUM_TO_WORKFLOW_TRIGGER[workflow.trigger] };

      const steps: EventTypeWorkflowStepOutputDto[] = workflow.steps.map(this.mapStep);

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
