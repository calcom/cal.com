import React from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { openInAppBrowser } from "../../../utils/browser";

interface AdvancedTabProps {
  // Confirmation settings
  requiresConfirmation: boolean;
  setRequiresConfirmation: (value: boolean) => void;

  // Additional settings (Note: disableCancelling, disableRescheduling, sendCalVideoTranscription not in API v2)
  autoTranslate: boolean;
  setAutoTranslate: (value: boolean) => void;
  requiresBookerEmailVerification: boolean;
  setRequiresBookerEmailVerification: (value: boolean) => void;
  hideCalendarNotes: boolean;
  setHideCalendarNotes: (value: boolean) => void;
  hideCalendarEventDetails: boolean;
  setHideCalendarEventDetails: (value: boolean) => void;
  hideOrganizerEmail: boolean;
  setHideOrganizerEmail: (value: boolean) => void;
  lockTimezone: boolean;
  setLockTimezone: (value: boolean) => void;
  allowReschedulingPastEvents: boolean;
  setAllowReschedulingPastEvents: (value: boolean) => void;
  allowBookingThroughRescheduleLink: boolean;
  setAllowBookingThroughRescheduleLink: (value: boolean) => void;

  // Redirect on booking
  successRedirectUrl: string;
  setSuccessRedirectUrl: (value: string) => void;
  forwardParamsSuccessRedirect: boolean;
  setForwardParamsSuccessRedirect: (value: boolean) => void;

  // Custom reply-to email
  customReplyToEmail: string;
  setCustomReplyToEmail: (value: string) => void;

  // Event type colors
  eventTypeColorLight: string;
  setEventTypeColorLight: (value: string) => void;
  eventTypeColorDark: string;
  setEventTypeColorDark: (value: string) => void;

  // Seats
  seatsEnabled: boolean;
  setSeatsEnabled: (value: boolean) => void;
  seatsPerTimeSlot: string;
  setSeatsPerTimeSlot: (value: string) => void;
  showAttendeeInfo: boolean;
  setShowAttendeeInfo: (value: boolean) => void;
  showAvailabilityCount: boolean;
  setShowAvailabilityCount: (value: boolean) => void;

  // Event type ID for private links
  eventTypeId: string;
}

export function AdvancedTab(props: AdvancedTabProps) {
  return (
    <View className="gap-3">
      {/* 1. Requires confirmation */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Requires confirmation</Text>
            <Text className="text-sm text-[#666]">
              The booking needs to be manually confirmed before it is pushed to your calendar and a
              confirmation is sent.
            </Text>
          </View>
          <Switch
            value={props.requiresConfirmation}
            onValueChange={props.setRequiresConfirmation}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 2. Disable Cancelling - Not in API v2, link to web */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <Text className="mb-1.5 text-base font-medium text-[#333]">Disable Cancelling</Text>
        <Text className="mb-3 text-sm text-[#666]">
          Guests and Organizer can no longer cancel the event with calendar invite or email.
        </Text>
        <TouchableOpacity
          className="flex-row items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-2 py-3 md:px-4"
          onPress={() => {
            if (props.eventTypeId && props.eventTypeId !== "new") {
              openInAppBrowser(
                `https://app.cal.com/event-types/${props.eventTypeId}?tabName=advanced`,
                "Disable Cancelling"
              );
            } else {
              Alert.alert("Info", "Save the event type first to configure this setting.");
            }
          }}
        >
          <Ionicons name="settings-outline" size={20} color="#666" />
          <Text className="ml-2 text-base text-[#666]">Configure on Web</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Disable Rescheduling - Not in API v2, link to web */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <Text className="mb-1.5 text-base font-medium text-[#333]">Disable Rescheduling</Text>
        <Text className="mb-3 text-sm text-[#666]">
          Guests and Organizer can no longer reschedule the event with calendar invite or email.
        </Text>
        <TouchableOpacity
          className="flex-row items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-2 py-3 md:px-4"
          onPress={() => {
            if (props.eventTypeId && props.eventTypeId !== "new") {
              openInAppBrowser(
                `https://app.cal.com/event-types/${props.eventTypeId}?tabName=advanced`,
                "Disable Rescheduling"
              );
            } else {
              Alert.alert("Info", "Save the event type first to configure this setting.");
            }
          }}
        >
          <Ionicons name="settings-outline" size={20} color="#666" />
          <Text className="ml-2 text-base text-[#666]">Configure on Web</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Send Cal Video Transcription Emails - Not in API v2, link to web */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <Text className="mb-1.5 text-base font-medium text-[#333]">
          Send Cal Video Transcription Emails
        </Text>
        <Text className="mb-3 text-sm text-[#666]">
          Send emails with the transcription of the Cal Video after the meeting ends. (Requires a
          paid plan)
        </Text>
        <TouchableOpacity
          className="flex-row items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-2 py-3 md:px-4"
          onPress={() => {
            if (props.eventTypeId && props.eventTypeId !== "new") {
              openInAppBrowser(
                `https://app.cal.com/event-types/${props.eventTypeId}?tabName=advanced`,
                "Cal Video Transcription"
              );
            } else {
              Alert.alert("Info", "Save the event type first to configure this setting.");
            }
          }}
        >
          <Ionicons name="settings-outline" size={20} color="#666" />
          <Text className="ml-2 text-base text-[#666]">Configure on Web</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Auto translate title and description */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">
              Auto translate title and description
            </Text>
            <Text className="text-sm text-[#666]">
              Automatically translate titles and descriptions to the visitor's browser language
              using AI.
            </Text>
          </View>
          <Switch
            value={props.autoTranslate}
            onValueChange={props.setAutoTranslate}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 6. Interface Language - Link to web (not available in API) */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <Text className="mb-1.5 text-base font-medium text-[#333]">Interface Language</Text>
        <Text className="mb-3 text-sm text-[#666]">
          Set your preferred language for the booking interface.
        </Text>
        <TouchableOpacity
          className="flex-row items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-2 py-3 md:px-4"
          onPress={() => {
            if (props.eventTypeId && props.eventTypeId !== "new") {
              openInAppBrowser(
                `https://app.cal.com/event-types/${props.eventTypeId}?tabName=advanced`,
                "Interface Language"
              );
            } else {
              Alert.alert("Info", "Save the event type first to configure interface language.");
            }
          }}
        >
          <Ionicons name="globe-outline" size={20} color="#666" />
          <Text className="ml-2 text-base text-[#666]">Configure on Web</Text>
        </TouchableOpacity>
      </View>

      {/* 7. Requires booker email verification */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">
              Requires booker email verification
            </Text>
            <Text className="text-sm text-[#666]">
              To ensure booker's email verification before scheduling events.
            </Text>
          </View>
          <Switch
            value={props.requiresBookerEmailVerification}
            onValueChange={props.setRequiresBookerEmailVerification}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 8. Hide notes in calendar */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Hide notes in calendar</Text>
            <Text className="text-sm text-[#666]">
              For privacy reasons, additional inputs and notes will be hidden in the calendar entry.
              They will still be sent to your email.
            </Text>
          </View>
          <Switch
            value={props.hideCalendarNotes}
            onValueChange={props.setHideCalendarNotes}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 9. Hide calendar event details on shared calendars */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">
              Hide calendar event details on shared calendars
            </Text>
            <Text className="text-sm text-[#666]">
              When a calendar is shared, events are visible to readers but their details are hidden
              from those without write access.
            </Text>
          </View>
          <Switch
            value={props.hideCalendarEventDetails}
            onValueChange={props.setHideCalendarEventDetails}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 10. Redirect on booking */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <Text className="mb-1.5 text-base font-medium text-[#333]">Redirect on booking</Text>
        <Text className="mb-3 text-sm text-[#666]">
          Redirect to a custom URL after a successful booking.
        </Text>
        <TextInput
          className="mb-3 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-base text-black"
          value={props.successRedirectUrl}
          onChangeText={props.setSuccessRedirectUrl}
          placeholder="https://example.com/thank-you"
          placeholderTextColor="#8E8E93"
          keyboardType="url"
          autoCapitalize="none"
        />
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-sm text-[#333]">
            Forward parameters such as ?email=...&name=...
          </Text>
          <Switch
            value={props.forwardParamsSuccessRedirect}
            onValueChange={props.setForwardParamsSuccessRedirect}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
        {props.successRedirectUrl ? (
          <Text className="mt-2 text-xs text-[#FF9500]">
            Adding a redirect will disable the success page. Make sure to mention "Booking
            Confirmed" on your custom success page.
          </Text>
        ) : null}
      </View>

      {/* 11. Private Links */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <Text className="mb-1.5 text-base font-medium text-[#333]">Private Links</Text>
        <Text className="mb-3 text-sm text-[#666]">
          Generate private URLs without exposing the username, with configurable expiry and usage
          limits.
        </Text>
        <TouchableOpacity
          className="flex-row items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-2 py-3 md:px-4"
          onPress={() => {
            if (props.eventTypeId && props.eventTypeId !== "new") {
              openInAppBrowser(
                `https://app.cal.com/event-types/${props.eventTypeId}?tabName=advanced`,
                "Private Links"
              );
            } else {
              Alert.alert("Info", "Save the event type first to manage private links.");
            }
          }}
        >
          <Ionicons name="link-outline" size={20} color="#666" />
          <Text className="ml-2 text-base text-[#666]">Manage Private Links</Text>
        </TouchableOpacity>
      </View>

      {/* 12. Offer seats */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Offer seats</Text>
            <Text className="text-sm text-[#666]">
              Offer seats for booking. This automatically disables guest & opt-in bookings.
            </Text>
          </View>
          <Switch
            value={props.seatsEnabled}
            onValueChange={props.setSeatsEnabled}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Seats Configuration - shown when enabled */}
        {props.seatsEnabled && (
          <View className="mt-4 gap-3 border-t border-[#E5E5EA] pt-4">
            <View>
              <Text className="mb-1.5 text-sm font-medium text-[#333]">Seats per time slot</Text>
              <TextInput
                className="rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-base text-black"
                value={props.seatsPerTimeSlot}
                onChangeText={props.setSeatsPerTimeSlot}
                placeholder="2"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
              />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-[#333]">Show attendee info to other guests</Text>
              <Switch
                value={props.showAttendeeInfo}
                onValueChange={props.setShowAttendeeInfo}
                trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-[#333]">Display available seat count</Text>
              <Switch
                value={props.showAvailabilityCount}
                onValueChange={props.setShowAvailabilityCount}
                trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        )}
      </View>

      {/* 13. Hide organizer's email */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Hide organizer's email</Text>
            <Text className="text-sm text-[#666]">
              Hide organizer's email address from the booking screen, email notifications, and
              calendar events.
            </Text>
          </View>
          <Switch
            value={props.hideOrganizerEmail}
            onValueChange={props.setHideOrganizerEmail}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 14. Lock timezone on booking page */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">
              Lock timezone on booking page
            </Text>
            <Text className="text-sm text-[#666]">
              To lock the timezone on booking page, useful for in-person events.
            </Text>
          </View>
          <Switch
            value={props.lockTimezone}
            onValueChange={props.setLockTimezone}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 15. Allow rescheduling past events */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">
              Allow rescheduling past events
            </Text>
            <Text className="text-sm text-[#666]">
              Enabling this option allows for past events to be rescheduled.
            </Text>
          </View>
          <Switch
            value={props.allowReschedulingPastEvents}
            onValueChange={props.setAllowReschedulingPastEvents}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 16. Allow booking through reschedule link */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">
              Allow booking through reschedule link
            </Text>
            <Text className="text-sm text-[#666]">
              When enabled, users will be able to create a new booking when trying to reschedule a
              cancelled booking.
            </Text>
          </View>
          <Switch
            value={props.allowBookingThroughRescheduleLink}
            onValueChange={props.setAllowBookingThroughRescheduleLink}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 17. Custom Reply-To email */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <Text className="mb-1.5 text-base font-medium text-[#333]">Custom 'Reply-To' email</Text>
        <Text className="mb-3 text-sm text-[#666]">
          Use a different email address as the replyTo for confirmation emails instead of the
          organizer's email.
        </Text>
        <TextInput
          className="rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-base text-black"
          value={props.customReplyToEmail}
          onChangeText={props.setCustomReplyToEmail}
          placeholder="reply@example.com"
          placeholderTextColor="#8E8E93"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* 18. Event type color */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <Text className="mb-1.5 text-base font-medium text-[#333]">Event type color</Text>
        <Text className="mb-3 text-sm text-[#666]">
          This is only used for event type & booking differentiation within the app. It is not
          displayed to bookers.
        </Text>
        <View className="gap-3">
          <View>
            <Text className="mb-2 text-sm font-medium text-[#333]">
              Event Type Color (Light Theme)
            </Text>
            <View className="flex-row items-center gap-3">
              <View
                className="h-12 w-12 rounded-lg border border-[#E5E5EA]"
                style={{
                  backgroundColor: props.eventTypeColorLight.startsWith("#")
                    ? props.eventTypeColorLight
                    : `#${props.eventTypeColorLight}`,
                }}
              />
              <TextInput
                className="flex-1 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-base text-black"
                value={props.eventTypeColorLight}
                onChangeText={props.setEventTypeColorLight}
                placeholder="292929"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
              />
            </View>
          </View>
          <View>
            <Text className="mb-2 text-sm font-medium text-[#333]">
              Event Type Color (Dark Theme)
            </Text>
            <View className="flex-row items-center gap-3">
              <View
                className="h-12 w-12 rounded-lg border border-[#E5E5EA]"
                style={{
                  backgroundColor: props.eventTypeColorDark.startsWith("#")
                    ? props.eventTypeColorDark
                    : `#${props.eventTypeColorDark}`,
                }}
              />
              <TextInput
                className="flex-1 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-base text-black"
                value={props.eventTypeColorDark}
                onChangeText={props.setEventTypeColorDark}
                placeholder="fafafa"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>
      </View>

      {/* 19. Optimized slots - Link to web (not available in API) */}
      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <Text className="mb-1.5 text-base font-medium text-[#333]">Optimized slots</Text>
        <Text className="mb-3 text-sm text-[#666]">
          Arrange time slots to optimize availability.
        </Text>
        <TouchableOpacity
          className="flex-row items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-2 py-3 md:px-4"
          onPress={() => {
            if (props.eventTypeId && props.eventTypeId !== "new") {
              openInAppBrowser(
                `https://app.cal.com/event-types/${props.eventTypeId}?tabName=advanced`,
                "Optimized Slots"
              );
            } else {
              Alert.alert("Info", "Save the event type first to configure optimized slots.");
            }
          }}
        >
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text className="ml-2 text-base text-[#666]">Configure on Web</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
