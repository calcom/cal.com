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
  createIfNotExistsUserActor(params: { userUuid: string }): Promise<AuditActor>;
  createIfNotExistsGuestActor(email: string | null, name: string | null, phone: string | null): Promise<AuditActor>;
  findByAttendeeId(attendeeId: number): Promise<AuditActor | null>;
}

