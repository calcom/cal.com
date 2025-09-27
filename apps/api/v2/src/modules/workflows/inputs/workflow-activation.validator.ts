import { FORM_SUBMITTED } from "@/modules/workflows/inputs/workflow-trigger.input";
import { Injectable } from "@nestjs/common";
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from "class-validator";

import { WORKFLOW_EVENT_TYPE_ACTIVATION, WORKFLOW_FORM_ACTIVATION } from "./create-workflow.input";
import type { CreateWorkflowDto } from "./create-workflow.input";

export function WorkflowActivationPreValidation(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options,
      constraints: [],
      validator: ActivationValidator,
    });
  };
}
@ValidatorConstraint({ name: "ActivationValidator", async: true })
@Injectable()
export class ActivationValidator implements ValidatorConstraintInterface {
  async validate(value: unknown, args: ValidationArguments) {
    const object = args.object as CreateWorkflowDto;
    const trigger = object.trigger;
    const activation = object.activation;

    if (!trigger || !activation) {
      // Let other validators (@IsDefined, etc.) handle this.
      return true;
    }

    if (activation.type === WORKFLOW_FORM_ACTIVATION && trigger.type !== FORM_SUBMITTED) {
      return false;
    }

    if (activation.type === WORKFLOW_EVENT_TYPE_ACTIVATION && trigger.type === FORM_SUBMITTED) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    // Return the detailed error messages we stored earlier
    const object = args.object as CreateWorkflowDto;
    const trigger = object.trigger;
    const activation = object.activation;

    if (activation.type === WORKFLOW_FORM_ACTIVATION && trigger.type !== FORM_SUBMITTED) {
      return `Activation object is invalid: Form workflows can use trigger.type: ${FORM_SUBMITTED} while you provided ${trigger.type}`;
    }

    if (activation.type === WORKFLOW_EVENT_TYPE_ACTIVATION && trigger.type === FORM_SUBMITTED) {
      return `Activation object is invalid: EventType workflows can't use trigger.type: ${FORM_SUBMITTED}`;
    }

    return `Activation object is invalid`;
  }
}
