import prisma from "@calcom/prisma";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";

import type { IPendingRoutingTraceRepository } from "../repositories/PendingRoutingTraceRepository.interface";
import type {
  IRoutingTraceRepository,
  RoutingStep,
  RoutingTrace,
} from "../repositories/RoutingTraceRepository.interface";

interface IRoutingTraceServiceDeps {
  pendingRoutingTraceRepository: IPendingRoutingTraceRepository;
  routingTraceRepository?: IRoutingTraceRepository;
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

  /** For debugging - get the number of steps recorded */
  getStepsCount(): number {
    return this.routingTraceSteps.length;
  }

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
    formResponseId?: number;
    queuedFormResponseId?: string;
    bookingId: number;
    bookingUid: string;
    isRerouting: boolean;
    reroutedByEmail?: string | null;
  }): Promise<ProcessRoutingTraceResult | null> {
    const { formResponseId, queuedFormResponseId, bookingId, bookingUid, isRerouting, reroutedByEmail } =
      args;

    if (!this.deps.routingTraceRepository) {
      throw new Error("routingTraceRepository is required for processForBooking");
    }

    // 1. Look up pending trace
    let pendingTrace = null;
    if (formResponseId) {
      pendingTrace = await this.deps.pendingRoutingTraceRepository.findByFormResponseId(formResponseId);
    } else if (queuedFormResponseId) {
      pendingTrace =
        await this.deps.pendingRoutingTraceRepository.findByQueuedFormResponseId(queuedFormResponseId);
    }

    if (!pendingTrace) {
      return null;
    }

    // 2. Extract assignment reason from trace
    const assignmentReasonData = this.extractAssignmentReasonFromTrace(pendingTrace.trace, {
      isRerouting,
      reroutedByEmail,
    });

    let assignmentReasonId: number | undefined;

    // 3. Create assignment reason record if we have trace-based data
    if (assignmentReasonData) {
      const createdReason = await prisma.assignmentReason.create({
        data: {
          bookingId,
          reasonEnum: assignmentReasonData.reasonEnum,
          reasonString: assignmentReasonData.reasonString,
        },
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
   * Priority: Salesforce > Routing Form
   */
  private extractAssignmentReasonFromTrace(
    trace: RoutingTrace,
    context: { isRerouting: boolean; reroutedByEmail?: string | null }
  ): { reasonEnum: AssignmentReasonEnum; reasonString: string } | null {
    // Check for Salesforce contact owner step
    const salesforceStep = trace.find(
      (step) => step.domain === "salesforce" && step.step === "contact-owner-found"
    );

    if (salesforceStep && salesforceStep.data) {
      const { email, recordType, recordId, rrSkipToAccountLookupField, rrSKipToAccountLookupFieldName } =
        salesforceStep.data as {
          email?: string;
          recordType?: string | null;
          recordId?: string;
          rrSkipToAccountLookupField?: boolean;
          rrSKipToAccountLookupFieldName?: string | null;
        };

      // If we have an email, record the Salesforce assignment reason
      // recordType might be null in some cases (e.g., when only email lookup was performed)
      if (email) {
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

    // Check for routing form route matched step
    const routingFormStep = trace.find(
      (step) => step.domain === "routing_form" && step.step === "route-matched"
    );

    if (routingFormStep && routingFormStep.data) {
      const { fallbackUsed } = routingFormStep.data as { fallbackUsed?: boolean };

      const reasonEnum = context.isRerouting
        ? AssignmentReasonEnum.REROUTED
        : fallbackUsed
          ? AssignmentReasonEnum.ROUTING_FORM_ROUTING_FALLBACK
          : AssignmentReasonEnum.ROUTING_FORM_ROUTING;

      return {
        reasonEnum,
        reasonString:
          context.isRerouting && context.reroutedByEmail ? `Rerouted by ${context.reroutedByEmail}` : "",
      };
    }

    return null;
  }

  private buildSalesforceReasonString(data: {
    email: string;
    recordType: string;
    recordId?: string;
    rrSkipToAccountLookupField?: boolean;
    rrSKipToAccountLookupFieldName?: string | null;
  }): string {
    const { email, recordType, recordId, rrSkipToAccountLookupField, rrSKipToAccountLookupFieldName } = data;

    if (rrSkipToAccountLookupField && rrSKipToAccountLookupFieldName) {
      return `Salesforce account lookup field: ${rrSKipToAccountLookupFieldName} - ${email}${
        recordId ? ` (Account ID: ${recordId})` : ""
      }`;
    }

    const recordLabel = recordType.toLowerCase();
    return `Salesforce ${recordLabel} owner: ${email}${recordId ? ` (${recordType} ID: ${recordId})` : ""}`;
  }
}
