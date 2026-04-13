import type { RoutingStep, RoutingTrace } from "../repositories/RoutingTraceRepository.interface";
import { ROUTING_TRACE_DOMAINS } from "../constants";
import { RoutingFormTracePresenter } from "./RoutingFormTracePresenter";
import { SalesforceRoutingTracePresenter } from "./SalesforceRoutingTracePresenter";

export interface PresentedStep {
  message: string;
  round: string;
  domain: string;
  step: string;
  timestamp: number;
}

export interface PresentedGroup {
  round: string;
  domain: string;
  steps: PresentedStep[];
}

export class RoutingTracePresenter {
  static present(trace: RoutingTrace): PresentedStep[] {
    return trace.map((step) => ({
      message: RoutingTracePresenter.presentStep(step),
      round: RoutingTracePresenter.getRound(step),
      domain: step.domain,
      step: step.step,
      timestamp: step.timestamp,
    }));
  }

  /** Group consecutive steps that share the same round into visual groups. */
  static groupByRound(steps: PresentedStep[]): PresentedGroup[] {
    const groups: PresentedGroup[] = [];
    for (const step of steps) {
      const last = groups[groups.length - 1];
      if (last && last.round === step.round && last.domain === step.domain) {
        last.steps.push(step);
      } else {
        groups.push({ round: step.round, domain: step.domain, steps: [step] });
      }
    }
    return groups;
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

  private static getRound(step: RoutingStep): string {
    switch (step.domain) {
      case ROUTING_TRACE_DOMAINS.SALESFORCE:
        return SalesforceRoutingTracePresenter.getRound(step);
      case ROUTING_TRACE_DOMAINS.ROUTING_FORM:
        return "Routing Form";
      default:
        return step.domain;
    }
  }
}
