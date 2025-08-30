-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "App_enabled_idx" ON "App"("enabled");

-- CreateIndex
CREATE INDEX "App_RoutingForms_Form_userId_idx" ON "App_RoutingForms_Form"("userId");

-- CreateIndex
CREATE INDEX "App_RoutingForms_Form_disabled_idx" ON "App_RoutingForms_Form"("disabled");

-- CreateIndex
CREATE INDEX "App_RoutingForms_FormResponse_formFillerId_idx" ON "App_RoutingForms_FormResponse"("formFillerId");

-- CreateIndex
CREATE INDEX "App_RoutingForms_FormResponse_formId_idx" ON "App_RoutingForms_FormResponse"("formId");

-- CreateIndex
CREATE INDEX "Attendee_email_idx" ON "Attendee"("email");

-- CreateIndex
CREATE INDEX "Attendee_bookingId_idx" ON "Attendee"("bookingId");

-- CreateIndex
CREATE INDEX "Availability_userId_idx" ON "Availability"("userId");

-- CreateIndex
CREATE INDEX "Booking_eventTypeId_idx" ON "Booking"("eventTypeId");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_destinationCalendarId_idx" ON "Booking"("destinationCalendarId");

-- CreateIndex
CREATE INDEX "Booking_recurringEventId_idx" ON "Booking"("recurringEventId");

-- CreateIndex
CREATE INDEX "Booking_uid_idx" ON "Booking"("uid");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "BookingReference_bookingId_idx" ON "BookingReference"("bookingId");

-- CreateIndex
CREATE INDEX "BookingReference_credentialId_idx" ON "BookingReference"("credentialId");

-- CreateIndex
CREATE INDEX "BookingReference_type_idx" ON "BookingReference"("type");

-- CreateIndex
CREATE INDEX "BookingReference_uid_idx" ON "BookingReference"("uid");

-- CreateIndex
CREATE INDEX "BookingSeat_bookingId_idx" ON "BookingSeat"("bookingId");

-- CreateIndex
CREATE INDEX "BookingSeat_attendeeId_idx" ON "BookingSeat"("attendeeId");

-- CreateIndex
CREATE INDEX "Credential_userId_idx" ON "Credential"("userId");

-- CreateIndex
CREATE INDEX "Credential_appId_idx" ON "Credential"("appId");

-- CreateIndex
CREATE INDEX "DestinationCalendar_userId_idx" ON "DestinationCalendar"("userId");

-- CreateIndex
CREATE INDEX "DestinationCalendar_eventTypeId_idx" ON "DestinationCalendar"("eventTypeId");

-- CreateIndex
CREATE INDEX "DestinationCalendar_credentialId_idx" ON "DestinationCalendar"("credentialId");

-- CreateIndex
CREATE INDEX "EventType_userId_idx" ON "EventType"("userId");

-- CreateIndex
CREATE INDEX "EventType_teamId_idx" ON "EventType"("teamId");

-- CreateIndex
CREATE INDEX "EventTypeCustomInput_eventTypeId_idx" ON "EventTypeCustomInput"("eventTypeId");

-- CreateIndex
CREATE INDEX "Feature_enabled_idx" ON "Feature"("enabled");

-- CreateIndex
CREATE INDEX "Feature_stale_idx" ON "Feature"("stale");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "Feedback_rating_idx" ON "Feedback"("rating");

-- CreateIndex
CREATE INDEX "Host_userId_idx" ON "Host"("userId");

-- CreateIndex
CREATE INDEX "Host_eventTypeId_idx" ON "Host"("eventTypeId");

-- CreateIndex
CREATE INDEX "Membership_teamId_idx" ON "Membership"("teamId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_externalId_idx" ON "Payment"("externalId");

-- CreateIndex
CREATE INDEX "ReminderMail_referenceId_idx" ON "ReminderMail"("referenceId");

-- CreateIndex
CREATE INDEX "ReminderMail_reminderType_idx" ON "ReminderMail"("reminderType");

-- CreateIndex
CREATE INDEX "SelectedCalendar_userId_idx" ON "SelectedCalendar"("userId");

-- CreateIndex
CREATE INDEX "SelectedCalendar_integration_idx" ON "SelectedCalendar"("integration");

-- CreateIndex
CREATE INDEX "SelectedCalendar_externalId_idx" ON "SelectedCalendar"("externalId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "VerificationToken_token_idx" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerifiedNumber_userId_idx" ON "VerifiedNumber"("userId");

-- CreateIndex
CREATE INDEX "VerifiedNumber_teamId_idx" ON "VerifiedNumber"("teamId");

-- CreateIndex
CREATE INDEX "Workflow_userId_idx" ON "Workflow"("userId");

-- CreateIndex
CREATE INDEX "Workflow_teamId_idx" ON "Workflow"("teamId");

-- CreateIndex
CREATE INDEX "WorkflowReminder_bookingUid_idx" ON "WorkflowReminder"("bookingUid");

-- CreateIndex
CREATE INDEX "WorkflowReminder_workflowStepId_idx" ON "WorkflowReminder"("workflowStepId");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_idx" ON "WorkflowStep"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowsOnEventTypes_workflowId_idx" ON "WorkflowsOnEventTypes"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowsOnEventTypes_eventTypeId_idx" ON "WorkflowsOnEventTypes"("eventTypeId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_emailVerified_idx" ON "users"("emailVerified");

-- CreateIndex
CREATE INDEX "users_identityProvider_idx" ON "users"("identityProvider");

-- CreateIndex
CREATE INDEX "users_identityProviderId_idx" ON "users"("identityProviderId");
