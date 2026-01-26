import type { AssignmentReasonRepository } from "@calcom/features/assignment-reason/repositories/AssignmentReasonRepository";
import logger from "@calcom/lib/logger";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";

import type { IPendingRoutingTraceRepository } from "../repositories/PendingRoutingTraceRepository.interface";
import type {
  IRoutingTraceRepository,
  RoutingStep,
  RoutingTrace,
} from "../repositories/RoutingTraceRepository.interface";

interface IRoutingTraceServiceDeps {
  pendingRoutingTraceRepository: IPendingRoutingTraceRepository;
  routingTraceRepository: IRoutingTraceRepository;
  assignmentReasonRepository: AssignmentReasonRepository;
}

export interface ProcessRoutingTraceResult {
  assignmentReason?: {
    reasonEnum: AssignmentReasonEnum;
    reasonString: string;
  };
}

export class RoutingTraceService {
  private routingTraceSteps: RoutingStep[] = [];

  constructor(private readonly deps: IRoutingTraceServiceDeps) {}

  /** To be called by the domain specific routing trace services */
  addStep({
    domain,
    step,
    data = {},
  }: {
    domain: string;
    step: string;
    data?: Record<string, unknown>;
  }) {
    this.routingTraceSteps.push({ domain, step, timestamp: Date.now(), data });
  }

  /** Save pending trace when routing form is submitted (before booking is created) */
  async savePendingRoutingTrace(
    args: { formResponseId: number } | { queuedFormResponseId: string }
  ) {
    await this.deps.pendingRoutingTraceRepository.create({
      trace: this.routingTraceSteps,
      ...args,
    });
  }

  /**
   * Process pending routing trace for a booking.
   * Looks up the pending trace, extracts assignment reason, creates permanent trace.
   */
  async processForBooking(args: {
    formResponseId: number;
    bookingId: number;
    bookingUid: string;
    organizerEmail: string;
    isRerouting: boolean;
    reroutedByEmail?: string | null;
  }): Promise<ProcessRoutingTraceResult | null> {
    const { formResponseId, bookingId, bookingUid, organizerEmail, isRerouting, reroutedByEmail } = args;

    // 1. Look up pending trace by formResponseId
    // Note: For queued responses, the pending trace is linked to formResponseId when processed
    const pendingTrace =
      await this.deps.pendingRoutingTraceRepository.findByFormResponseId(formResponseId);

    if (!pendingTrace) {
      logger.warn("Could not find pending routing trace for form response", { formResponseId, bookingId });
      return null;
    }

    // 2. Extract assignment reason from trace
    const assignmentReasonData = this.extractAssignmentReasonFromTrace(
      pendingTrace.trace,
      {
        organizerEmail,
        isRerouting,
        reroutedByEmail,
      }
    );

    let assignmentReasonId: number | undefined;

    // 3. Create assignment reason record if we have trace-based data
    if (assignmentReasonData) {
      const createdReason = await this.deps.assignmentReasonRepository.createAssignmentReason({
        bookingId,
        reasonEnum: assignmentReasonData.reasonEnum,
        reasonString: assignmentReasonData.reasonString,
      });
      assignmentReasonId = createdReason.id;
    }

    // 4. Create permanent routing trace
    await this.deps.routingTraceRepository.create({
      trace: pendingTrace.trace,
      formResponseId: pendingTrace.formResponseId ?? undefined,
      queuedFormResponseId: pendingTrace.queuedFormResponseId ?? undefined,
      bookingUid,
      assignmentReasonId,
    });

    return {
      assignmentReason: assignmentReasonData
        ? {
            reasonEnum: assignmentReasonData.reasonEnum,
            reasonString: assignmentReasonData.reasonString,
          }
        : undefined,
    };
  }

  /**
   * Extract assignment reason from trace steps.
   * Priority: CRM (Salesforce) > Routing Form
   * CRM assignment is only used if the booking organizer matches the CRM contact owner.
   */
  private extractAssignmentReasonFromTrace(
    trace: RoutingTrace,
    context: {
      organizerEmail: string;
      isRerouting: boolean;
      reroutedByEmail?: string | null;
    }
  ): { reasonEnum: AssignmentReasonEnum; reasonString: string } | null {
    // Check for CRM assignment step (e.g., salesforce_assignment)
    const crmAssignmentStep = trace.find(
      (step) =>
        step.domain === "salesforce" && step.step === "salesforce_assignment"
    );

    if (crmAssignmentStep && crmAssignmentStep.data) {
      const {
        email,
        recordType,
        recordId,
        rrSkipToAccountLookupField,
        rrSKipToAccountLookupFieldName,
      } = crmAssignmentStep.data as {
        email?: string;
        recordType?: string | null;
        recordId?: string;
        rrSkipToAccountLookupField?: boolean;
        rrSKipToAccountLookupFieldName?: string | null;
      };

      // Only use CRM assignment if the booking organizer matches the contact owner
      if (
        email &&
        email.toLowerCase() === context.organizerEmail.toLowerCase()
      ) {
        return {
          reasonEnum: AssignmentReasonEnum.SALESFORCE_ASSIGNMENT,
          reasonString: this.buildSalesforceReasonString({
            email,
            recordType: recordType ?? "Contact", // Default to Contact if not specified
            recordId,
            rrSkipToAccountLookupField,
            rrSKipToAccountLookupFieldName,
          }),
        };
      }
    }

    // Check for routing form attribute logic step
    const routingFormStep = trace.find(
      (step) =>
        step.domain === "routing_form" && step.step === "attribute-logic-evaluated"
    );

    if (routingFormStep && routingFormStep.data) {
      const { routeIsFallback } = routingFormStep.data as {
        routeIsFallback?: boolean;
      };

      const reasonEnum = context.isRerouting
        ? AssignmentReasonEnum.REROUTED
        : routeIsFallback
        ? AssignmentReasonEnum.ROUTING_FORM_ROUTING_FALLBACK
        : AssignmentReasonEnum.ROUTING_FORM_ROUTING;

      return {
        reasonEnum,
        reasonString:
          context.isRerouting && context.reroutedByEmail
            ? `Rerouted by ${context.reroutedByEmail}`
            : "",
      };
    }

    logger.warn("Could not extract assignment reason from routing trace - no matching steps found", {
      traceSteps: trace.map((s) => `${s.domain}:${s.step}`),
      organizerEmail: context.organizerEmail,
    });
    return null;
  }

  private buildSalesforceReasonString(data: {
    email: string;
    recordType: string;
    recordId?: string;
    rrSkipToAccountLookupField?: boolean;
    rrSKipToAccountLookupFieldName?: string | null;
  }): string {
    const {
      email,
      recordType,
      recordId,
      rrSkipToAccountLookupField,
      rrSKipToAccountLookupFieldName,
    } = data;

    if (rrSkipToAccountLookupField && rrSKipToAccountLookupFieldName) {
      return `Salesforce account lookup field: ${rrSKipToAccountLookupFieldName} - ${email}${
        recordId ? ` (Account ID: ${recordId})` : ""
      }`;
    }

    const recordLabel = recordType.toLowerCase();
    return `Salesforce ${recordLabel} owner: ${email}${
      recordId ? ` (${recordType} ID: ${recordId})` : ""
    }`;
  }
}
