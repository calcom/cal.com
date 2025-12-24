import React from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { openInAppBrowser } from "../../../utils/browser";

interface ConfigureOnWebCardProps {
  title: string;
  description: string;
  eventTypeId: string;
  browserTitle: string;
}

function ConfigureOnWebCard({
  title,
  description,
  eventTypeId,
  browserTitle,
}: ConfigureOnWebCardProps) {
  return (
    <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
      <Text className="mb-1.5 text-base font-medium text-[#333]">{title}</Text>
      <Text className="mb-3 text-sm text-[#666]">{description}</Text>
      <TouchableOpacity
        className="flex-row items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-2 py-3 md:px-4"
        onPress={() => {
          if (eventTypeId && eventTypeId !== "new") {
            openInAppBrowser(
              `https://app.cal.com/event-types/${eventTypeId}?tabName=advanced`,
              browserTitle
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
  );
}

interface AdvancedTabProps {
  requiresConfirmation: boolean;
  setRequiresConfirmation: (value: boolean) => void;
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
  lockedTimezone: string;
  setLockedTimezone: (value: string) => void;
  allowReschedulingPastEvents: boolean;
  setAllowReschedulingPastEvents: (value: boolean) => void;
  allowBookingThroughRescheduleLink: boolean;
  setAllowBookingThroughRescheduleLink: (value: boolean) => void;
  successRedirectUrl: string;
  setSuccessRedirectUrl: (value: string) => void;
  forwardParamsSuccessRedirect: boolean;
  setForwardParamsSuccessRedirect: (value: boolean) => void;
  customReplyToEmail: string;
  setCustomReplyToEmail: (value: string) => void;
  eventTypeColorLight: string;
  setEventTypeColorLight: (value: string) => void;
  eventTypeColorDark: string;
  setEventTypeColorDark: (value: string) => void;
  seatsEnabled: boolean;
  setSeatsEnabled: (value: boolean) => void;
  seatsPerTimeSlot: string;
  setSeatsPerTimeSlot: (value: string) => void;
  showAttendeeInfo: boolean;
  setShowAttendeeInfo: (value: boolean) => void;
  showAvailabilityCount: boolean;
  setShowAvailabilityCount: (value: boolean) => void;
  eventTypeId: string;
}

export function AdvancedTab(props: AdvancedTabProps) {
  return (
    <View className="gap-3">
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

      <ConfigureOnWebCard
        title="Disable Cancelling"
        description="Guests and Organizer can no longer cancel the event with calendar invite or email."
        eventTypeId={props.eventTypeId}
        browserTitle="Disable Cancelling"
      />

      <ConfigureOnWebCard
        title="Disable Rescheduling"
        description="Guests and Organizer can no longer reschedule the event with calendar invite or email."
        eventTypeId={props.eventTypeId}
        browserTitle="Disable Rescheduling"
      />

      <ConfigureOnWebCard
        title="Send Cal Video Transcription Emails"
        description="Send emails with the transcription of the Cal Video after the meeting ends. (Requires a paid plan)"
        eventTypeId={props.eventTypeId}
        browserTitle="Cal Video Transcription"
      />

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

      <ConfigureOnWebCard
        title="Interface Language"
        description="Set your preferred language for the booking interface."
        eventTypeId={props.eventTypeId}
        browserTitle="Interface Language"
      />

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

      <View className="rounded-2xl border border-[#E5E5EA] bg-white">
        <View className="flex-row items-start justify-between p-5">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Offer seats</Text>
            <Text className="text-sm text-[#666]">
              Offer seats for booking. This automatically disables guest & opt-in bookings.{" "}
              <Text
                className="text-sm text-[#007AFF]"
                onPress={() =>
                  openInAppBrowser("https://cal.com/help/event-types/offer-seats", "Learn more")
                }
              >
                Learn more
              </Text>
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
        {props.seatsEnabled ? (
          <View className="gap-4 border-t border-[#E5E5EA] p-5">
            {/* Number of seats per booking */}
            <View>
              <Text className="mb-2 text-sm font-medium text-[#333]">
                Number of seats per booking
              </Text>
              <View className="flex-row items-center">
                <TextInput
                  className="w-20 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3 text-center text-base text-black"
                  value={props.seatsPerTimeSlot}
                  onChangeText={props.setSeatsPerTimeSlot}
                  placeholder="2"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />
                <Text className="ml-3 text-base text-[#666]">seats</Text>
              </View>
            </View>

            {/* Share attendee information between guests - Checkbox style */}
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => props.setShowAttendeeInfo(!props.showAttendeeInfo)}
              activeOpacity={0.7}
            >
              <View
                className={`mr-3 h-5 w-5 items-center justify-center rounded border ${
                  props.showAttendeeInfo
                    ? "border-[#111827] bg-[#111827]"
                    : "border-[#D1D5DB] bg-white"
                }`}
              >
                {props.showAttendeeInfo && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text className="text-sm text-[#333]">Share attendee information between guests</Text>
            </TouchableOpacity>

            {/* Show the number of available seats - Checkbox style */}
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => props.setShowAvailabilityCount(!props.showAvailabilityCount)}
              activeOpacity={0.7}
            >
              <View
                className={`mr-3 h-5 w-5 items-center justify-center rounded border ${
                  props.showAvailabilityCount
                    ? "border-[#111827] bg-[#111827]"
                    : "border-[#D1D5DB] bg-white"
                }`}
              >
                {props.showAvailabilityCount ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>
              <Text className="text-sm text-[#333]">Show the number of available seats</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

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

      <View className="rounded-2xl border border-[#E5E5EA] bg-white">
        <View className="flex-row items-start justify-between p-5">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">
              Lock timezone on booking page
            </Text>
            <Text className="text-sm text-[#666]">
              To lock the timezone on booking page, useful for in-person events.{" "}
              <Text
                className="text-sm text-[#007AFF]"
                onPress={() =>
                  openInAppBrowser("https://cal.com/help/event-types/lock-timezone", "Learn more")
                }
              >
                Learn more
              </Text>
            </Text>
          </View>
          <Switch
            value={props.lockTimezone}
            onValueChange={props.setLockTimezone}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Timezone selector - shown when enabled */}
        {props.lockTimezone ? (
          <View className="border-t border-[#E5E5EA] p-5">
            <Text className="mb-2 text-sm font-medium text-[#333]">Timezone</Text>
            <TouchableOpacity
              className="flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
              onPress={() => {
                Alert.alert(
                  "Select Timezone",
                  "To change the timezone, please use the Cal.com website for the full timezone selector.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Open Website",
                      onPress: () =>
                        openInAppBrowser("https://app.cal.com/event-types", "Cal.com Event Types"),
                    },
                  ]
                );
              }}
            >
              <Text className="text-base text-[#333]">
                {props.lockedTimezone || "Europe/London"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <ConfigureOnWebCard
        title="Allow rescheduling past events"
        description="Enabling this option allows for past events to be rescheduled."
        eventTypeId={props.eventTypeId}
        browserTitle="Allow Rescheduling Past Events"
      />

      <ConfigureOnWebCard
        title="Allow booking through reschedule link"
        description="When enabled, users will be able to create a new booking when trying to reschedule a cancelled booking."
        eventTypeId={props.eventTypeId}
        browserTitle="Allow Booking Through Reschedule Link"
      />

      <ConfigureOnWebCard
        title="Custom 'Reply-To' email"
        description="Use a different email address as the replyTo for confirmation emails instead of the organizer's email."
        eventTypeId={props.eventTypeId}
        browserTitle="Custom Reply-To Email"
      />

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

      <ConfigureOnWebCard
        title="Optimized slots"
        description="Arrange time slots to optimize availability."
        eventTypeId={props.eventTypeId}
        browserTitle="Optimized Slots"
      />
    </View>
  );
}
