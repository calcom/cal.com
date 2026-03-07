import type {
  CreateDelegationCredentialOutput,
  DelegationCredentialOutput,
  UpdateDelegationCredentialOutput,
} from "../../generated/types.gen";

export type DelegationCredential = DelegationCredentialOutput;
export type DelegationCredentialResponse = CreateDelegationCredentialOutput["data"];
export type DelegationCredentialUpdateResponse = UpdateDelegationCredentialOutput["data"];
