import type { DelegationCredentialErrorDTO, DelegationCredentialErrorPayloadType } from "../../../dto/types";
import type { WebhookPayload } from "../../types";
import { BaseDelegationPayloadBuilder } from "../../base/BaseDelegationPayloadBuilder";

/**
 * Delegation payload builder for webhook version 2021-10-20.
 *
 * Handles DELEGATION_CREDENTIAL_ERROR events with:
 * - Error details
 * - Credential information
 * - User information
 */
export class DelegationPayloadBuilder extends BaseDelegationPayloadBuilder {
  /**
   * Build the delegation credential error webhook payload for v2021-10-20.
   */
  build(dto: DelegationCredentialErrorDTO): WebhookPayload {
    const payload: DelegationCredentialErrorPayloadType = {
      error: dto.error,
      credential: dto.credential,
      user: dto.user,
    };

    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload,
    };
  }
}

