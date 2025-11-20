export type AuditActorType = "USER" | "GUEST" | "ATTENDEE" | "SYSTEM";

type AuditActor = {
  id: string;
  type: AuditActorType;
  userUuid: string | null;
  attendeeId: number | null;
  email: string | null;
  phone: string | null;
  name: string | null;
  createdAt: Date;
}
export interface IAuditActorRepository {
  findByUserUuid(userUuid: string): Promise<AuditActor | null>;
  findSystemActorOrThrow(): Promise<AuditActor>;
  // TODO: To be implemented in followup PR
  // upsertUserActor(userUuid: string): Promise<AuditActor>;
  // upsertGuestActor(email: string, name?: string, phone?: string): Promise<AuditActor>;
  // findByAttendeeId(attendeeId: number): Promise<AuditActor | null>;
}

