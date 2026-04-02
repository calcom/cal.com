import { ROUTING_TRACE_DOMAINS } from "../constants";
import type { RoutingStep, RoutingTrace } from "../repositories/RoutingTraceRepository.interface";
import { RoutingFormTracePresenter } from "./RoutingFormTracePresenter";
import { SalesforceRoutingTracePresenter } from "./SalesforceRoutingTracePresenter";

export interface PresentedStep {
  message: string;
  domain: string;
  step: string;
  timestamp: number;
}

export class RoutingTracePresenter {
  static present(trace: RoutingTrace): PresentedStep[] {
    return trace.map((step) => ({
      message: RoutingTracePresenter.presentStep(step),
      domain: step.domain,
      step: step.step,
      timestamp: step.timestamp,
    }));
  }

  private static presentStep(step: RoutingStep): string {
    switch (step.domain) {
      case ROUTING_TRACE_DOMAINS.SALESFORCE:
        return SalesforceRoutingTracePresenter.present(step);
      case ROUTING_TRACE_DOMAINS.ROUTING_FORM:
        return RoutingFormTracePresenter.present(step);
      default:
        return `${step.domain}: ${step.step}`;
    }
  }
}
