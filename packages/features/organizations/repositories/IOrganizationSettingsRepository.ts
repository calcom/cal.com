export interface OrganizationEmailSettingsDto {
  disableAttendeeConfirmationEmail: boolean | null;
  disableAttendeeCancellationEmail: boolean | null;
  disableAttendeeRescheduledEmail: boolean | null;
  disableAttendeeRequestEmail: boolean | null;
  disableAttendeeReassignedEmail: boolean | null;
  disableAttendeeAwaitingPaymentEmail: boolean | null;
  disableAttendeeRescheduleRequestEmail: boolean | null;
  disableAttendeeLocationChangeEmail: boolean | null;
  disableAttendeeNewEventEmail: boolean | null;
}

export interface IOrganizationSettingsRepository {
  getEmailSettings(organizationId: number): Promise<OrganizationEmailSettingsDto | null>;
}
