import { WorkflowActivationDto, TriggerDtoType } from "@/modules/workflows/inputs/create-workflow.input";
import { WorkflowOutput, WorkflowStepOutputDto } from "@/modules/workflows/outputs/workflow.output";
import { WorkflowType } from "@/modules/workflows/workflows.repository";
import { Injectable } from "@nestjs/common";

import {
  ATTENDEE,
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
  HOUR,
  WORKFLOW_TRIGGER_TO_ENUM,
} from "../inputs/workflow-trigger.input";

@Injectable()
export class WorkflowsOutputService {
  toOutputDto(workflow: WorkflowType): WorkflowOutput {
    const activation: WorkflowActivationDto = {
      isActiveOnAllEventTypes: workflow.isActiveOnAll,
      activeOnEventTypeIds: workflow.activeOn?.map((relation) => relation.eventTypeId) ?? [],
    };

    const trigger: TriggerDtoType =
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

    const steps: WorkflowStepOutputDto[] = workflow.steps.map((step) => {
      let recipient: RecipientType;
      let email = "";
      let phone = "";
      let text;
      let html;
      switch (ENUM_TO_STEP_ACTIONS[step.action]) {
        case EMAIL_HOST:
          recipient = HOST;
          html = step.reminderBody ?? "";
          break;
        case EMAIL_ATTENDEE:
          html = step.reminderBody ?? "";
          recipient = ATTENDEE;
          break;
        case SMS_ATTENDEE:
          text = step.reminderBody ?? "";
          recipient = ATTENDEE;
          break;
        case WHATSAPP_ATTENDEE:
          text = step.reminderBody ?? "";
          recipient = ATTENDEE;
          break;
        case EMAIL_ADDRESS:
          html = step.reminderBody ?? "";
          recipient = EMAIL;
          email = step.sendTo ?? "";
          break;
        case SMS_NUMBER:
        case WHATSAPP_NUMBER:
          text = step.reminderBody ?? "";
          recipient = PHONE_NUMBER;
          phone = step.sendTo ?? "";
          break;
        default:
          recipient = ATTENDEE;
      }

      return {
        id: step.id,
        stepNumber: step.stepNumber,
        action: ENUM_TO_STEP_ACTIONS[step.action],
        recipient: recipient,
        email,
        phone,
        template: ENUM_TO_TEMPLATES[step.template],
        includeCalendarEvent: step.includeCalendarEvent,
        sender: step.sender ?? "Default Sender",
        message: {
          subject: step.emailSubject ?? "",
          text,
          html,
        },
      };
    });

    return {
      id: workflow.id,
      name: workflow.name,
      activation: activation,
      trigger: trigger,
      steps: steps.sort((stepA, stepB) => stepA.stepNumber - stepB.stepNumber),
    };
  }
}
