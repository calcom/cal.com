export type AuditActorType = "USER" | "GUEST" | "ATTENDEE" | "SYSTEM" | "APP";

type AuditActor = {
  id: string;
  type: AuditActorType;
  userUuid: string | null;
  attendeeId: number | null;
  credentialId: number | null;
  email: string | null;
  phone: string | null;
  name: string | null;
  createdAt: Date;
}
export interface IAuditActorRepository {
  findByUserUuid(userUuid: string): Promise<AuditActor | null>;
  createIfNotExistsUserActor(params: { userUuid: string }): Promise<AuditActor>;
  createIfNotExistsAttendeeActor(params: { attendeeId: number }): Promise<AuditActor>;
  createIfNotExistsGuestActor(params: { email: string | null; name: string | null; phone: string | null }): Promise<AuditActor>;
  createIfNotExistsAppActor(params:
    | { credentialId: number }
    | { email: string; name: string }
  ): Promise<AuditActor>;
}

