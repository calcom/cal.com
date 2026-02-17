import { AsyncLocalStorage } from "node:async_hooks";

import type { AssignmentReasonRepository } from "@calcom/features/assignment-reason/repositories/AssignmentReasonRepository";
import logger from "@calcom/lib/logger";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";

import { ROUTING_TRACE_DOMAINS, ROUTING_TRACE_STEPS } from "../constants";
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
  private static als = new AsyncLocalStorage<RoutingTraceService>();

  /**
   * Get the current RoutingTraceService from AsyncLocalStorage.
   * Returns undefined if not within a trace context.
   */
  static getCurrent(): RoutingTraceService | undefined {
    return this.als.getStore();
  }

  /**
   * Run a function within this trace service's context.
   * Any code within the callback can access this trace service via getCurrent().
   */
  run<T>(fn: () => T): T {
    return RoutingTraceService.als.run(this, fn);
  }

  /**
   * Run an async function within this trace service's context.
   * Any code within the callback can access this trace service via getCurrent().
   */
  runAsync<T>(fn: () => Promise<T>): Promise<T> {
    return RoutingTraceService.als.run(this, fn);
  }

  private routingTraceSteps: RoutingStep[] = [];

  constructor(private readonly deps: IRoutingTraceServiceDeps) {}

  /** For debugging - get the number of steps recorded */
  getStepsCount(): number {
    return this.routingTraceSteps.length;
  }

  /** To be called by the domain specific routing trace services */
  addStep({ domain, step, data = {} }: { domain: string; step: string; data?: Record<string, unknown> }) {
    this.routingTraceSteps.push({ domain, step, timestamp: Date.now(), data });
  }

  /** Save pending trace when routing form is submitted (before booking is created) */
  async savePendingRoutingTrace(args: { formResponseId: number } | { queuedFormResponseId: string }) {
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
    organizerEmail: string;
    isRerouting: boolean;
    reroutedByEmail?: string | null;
  }): Promise<ProcessRoutingTraceResult | null> {
    const {
      formResponseId,
      queuedFormResponseId,
      bookingId,
      bookingUid,
      organizerEmail,
      isRerouting,
      reroutedByEmail,
    } = args;

    let pendingTrace = null;
    if (formResponseId) {
      pendingTrace = await this.deps.pendingRoutingTraceRepository.findByFormResponseId(formResponseId);
    } else if (queuedFormResponseId) {
      pendingTrace =
        await this.deps.pendingRoutingTraceRepository.findByQueuedFormResponseId(queuedFormResponseId);
    }

    if (!pendingTrace) {
      logger.warn("Could not find pending routing trace for form response", {
        formResponseId,
        queuedFormResponseId,
        bookingId,
      });
      return null;
    }

    const assignmentReasonData = this.extractAssignmentReasonFromTrace(pendingTrace.trace, {
      organizerEmail,
      isRerouting,
      reroutedByEmail,
    });

    let assignmentReasonId: number | undefined;

    if (assignmentReasonData) {
      const createdReason = await this.deps.assignmentReasonRepository.createAssignmentReason({
        bookingId,
        reasonEnum: assignmentReasonData.reasonEnum,
        reasonString: assignmentReasonData.reasonString,
      });
      assignmentReasonId = createdReason.id;
    }

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
    const crmAssignmentStep = trace.find(
      (step) =>
        step.domain === ROUTING_TRACE_DOMAINS.SALESFORCE &&
        step.step === ROUTING_TRACE_STEPS.SALESFORCE_ASSIGNMENT
    );

    if (crmAssignmentStep && crmAssignmentStep.data) {
      const { email, recordType, recordId, rrSkipToAccountLookupField, rrSKipToAccountLookupFieldName } =
        crmAssignmentStep.data as {
          email?: string;
          recordType?: string | null;
          recordId?: string;
          rrSkipToAccountLookupField?: boolean;
          rrSKipToAccountLookupFieldName?: string | null;
        };

      if (email && email.toLowerCase() === context.organizerEmail.toLowerCase()) {
        return {
          reasonEnum: AssignmentReasonEnum.SALESFORCE_ASSIGNMENT,
          reasonString: this.buildSalesforceReasonString({
            email,
            recordType: recordType ?? "Contact",
            recordId,
            rrSkipToAccountLookupField,
            rrSKipToAccountLookupFieldName,
          }),
        };
      }
    }

    const routingFormStep = trace.find(
      (step) =>
        step.domain === ROUTING_TRACE_DOMAINS.ROUTING_FORM &&
        step.step === ROUTING_TRACE_STEPS.ATTRIBUTE_LOGIC_EVALUATED
    );

    if (routingFormStep && routingFormStep.data) {
      const { routeIsFallback, attributeRoutingDetails } = routingFormStep.data as {
        routeIsFallback?: boolean;
        attributeRoutingDetails?: Array<{ attributeName: string; attributeValue: string }>;
      };

      const reasonEnum = context.isRerouting
        ? AssignmentReasonEnum.REROUTED
        : routeIsFallback
          ? AssignmentReasonEnum.ROUTING_FORM_ROUTING_FALLBACK
          : AssignmentReasonEnum.ROUTING_FORM_ROUTING;

      return {
        reasonEnum,
        reasonString: this.buildRoutingFormReasonString({
          isRerouting: context.isRerouting,
          reroutedByEmail: context.reroutedByEmail,
          attributeRoutingDetails,
        }),
      };
    }

    logger.warn("Could not extract assignment reason from routing trace - no matching steps found", {
      traceSteps: trace.map((s) => `${s.domain}:${s.step}`),
    });
    return null;
  }

  private buildRoutingFormReasonString(data: {
    isRerouting: boolean;
    reroutedByEmail?: string | null;
    attributeRoutingDetails?: Array<{ attributeName: string; attributeValue: string }>;
  }): string {
    const { isRerouting, reroutedByEmail, attributeRoutingDetails } = data;

    const reroutingPart = isRerouting && reroutedByEmail ? `Rerouted by ${reroutedByEmail}` : "";

    const attributesPart =
      attributeRoutingDetails && attributeRoutingDetails.length > 0
        ? attributeRoutingDetails
            .map(({ attributeName, attributeValue }) => `${attributeName}: ${attributeValue}`)
            .join(", ")
        : "";

    return `${reroutingPart} ${attributesPart}`.trim();
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
