import React from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AdvancedTabProps {
  // Calendar event name
  calendarEventName: string;
  setCalendarEventName: (value: string) => void;
  
  // Add to calendar email
  addToCalendarEmail: string;
  setAddToCalendarEmail: (value: string) => void;
  
  // Layout
  selectedLayouts: string[];
  setSelectedLayouts: (layouts: string[]) => void;
  defaultLayout: string;
  setDefaultLayout: (layout: string) => void;
  
  // Confirmation settings
  requiresConfirmation: boolean;
  setRequiresConfirmation: (value: boolean) => void;
  disableCancelling: boolean;
  setDisableCancelling: (value: boolean) => void;
  disableRescheduling: boolean;
  setDisableRescheduling: (value: boolean) => void;
  
  // Additional settings
  sendCalVideoTranscription: boolean;
  setSendCalVideoTranscription: (value: boolean) => void;
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
}

export function AdvancedTab(props: AdvancedTabProps) {
  const layoutOptions = [
    { id: "MONTH_VIEW", label: "Month", icon: "calendar-outline" },
    { id: "WEEK_VIEW", label: "Weekly", icon: "calendar-outline" },
    { id: "COLUMN_VIEW", label: "Column", icon: "list-outline" },
  ];

  return (
    <View className="gap-3">
      {/* Calendar Event Name Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <Text className="text-base font-semibold text-[#333] mb-1.5">Calendar event name</Text>
        <TextInput
          className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black mb-2"
          value={props.calendarEventName}
          onChangeText={props.setCalendarEventName}
          placeholder="30min between Pro Example and {Scheduler}"
          placeholderTextColor="#8E8E93"
        />
        <Text className="text-xs text-[#666]">
          Use variables like {"{"}Scheduler{"}"} for booker name, {"{"}Organizer{"}"} for your name
        </Text>
      </View>

      {/* Add to Calendar Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <Text className="text-base font-semibold text-[#333] mb-1.5">Add to calendar</Text>
        <Text className="text-sm text-[#666] mb-3">
          We'll display this email address as the organizer, and send confirmation emails here.
        </Text>
        <TextInput
          className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
          value={props.addToCalendarEmail}
          onChangeText={props.setAddToCalendarEmail}
          placeholder="pro@example.com"
          placeholderTextColor="#8E8E93"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Layout Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <Text className="text-base font-semibold text-[#333] mb-1.5">Layout</Text>
        <Text className="text-sm text-[#666] mb-3">
          You can select multiple and your bookers can switch views.
        </Text>

        {/* Layout Options */}
        <View className="gap-2 mb-4">
          {layoutOptions.map((layout) => (
            <TouchableOpacity
              key={layout.id}
              className={`flex-row items-center justify-between p-3 rounded-lg border ${
                props.selectedLayouts.includes(layout.id)
                  ? "border-black bg-[#F0F0F0]"
                  : "border-[#E5E5EA]"
              }`}
              onPress={() => {
                if (props.selectedLayouts.includes(layout.id)) {
                  // Don't allow deselecting if it's the only one
                  if (props.selectedLayouts.length > 1) {
                    props.setSelectedLayouts(props.selectedLayouts.filter((l) => l !== layout.id));
                    // If removing the default, set a new default
                    if (props.defaultLayout === layout.id) {
                      const remaining = props.selectedLayouts.filter((l) => l !== layout.id);
                      props.setDefaultLayout(remaining[0]);
                    }
                  }
                } else {
                  props.setSelectedLayouts([...props.selectedLayouts, layout.id]);
                }
              }}>
              <View className="flex-row items-center gap-2">
                <Ionicons name={layout.icon as any} size={20} color="#333" />
                <Text className="text-base text-[#333]">{layout.label}</Text>
              </View>
              {props.selectedLayouts.includes(layout.id) && (
                <Ionicons name="checkmark-circle" size={20} color="#000" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Default View */}
        {props.selectedLayouts.length > 1 && (
          <View>
            <Text className="text-sm font-medium text-[#333] mb-2">Default view</Text>
            <View className="gap-2">
              {props.selectedLayouts.map((layoutId) => {
                const layout = layoutOptions.find((l) => l.id === layoutId);
                if (!layout) return null;
                return (
                  <TouchableOpacity
                    key={layout.id}
                    className={`flex-row items-center justify-between p-3 rounded-lg border ${
                      props.defaultLayout === layout.id
                        ? "border-black bg-[#F0F0F0]"
                        : "border-[#E5E5EA]"
                    }`}
                    onPress={() => props.setDefaultLayout(layout.id)}>
                    <Text className="text-base text-[#333]">{layout.label}</Text>
                    {props.defaultLayout === layout.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#000" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Booking Questions Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <Text className="text-base font-semibold text-[#333] mb-1.5">Booking questions</Text>
        <Text className="text-sm text-[#666] mb-3">
          Customize the questions asked on the booking page.
        </Text>
        <TouchableOpacity
          className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-2 md:px-4 py-3 flex-row items-center justify-center"
          onPress={() =>
            Alert.alert("Coming Soon", "Booking questions customization will be available soon.")
          }>
          <Ionicons name="add-circle-outline" size={20} color="#666" />
          <Text className="text-base text-[#666] ml-2">Manage booking questions</Text>
        </TouchableOpacity>
      </View>

      {/* Requires confirmation */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">Requires confirmation</Text>
            <Text className="text-sm text-[#666]">
              The booking needs to be manually confirmed before it is pushed to your calendar
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

      {/* Disable Cancelling */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">Disable Cancelling</Text>
            <Text className="text-sm text-[#666]">
              Guests can no longer cancel the event with calendar invite or email
            </Text>
          </View>
          <Switch
            value={props.disableCancelling}
            onValueChange={props.setDisableCancelling}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Disable Rescheduling */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">Disable Rescheduling</Text>
            <Text className="text-sm text-[#666]">
              Guests can no longer reschedule the event with calendar invite or email
            </Text>
          </View>
          <Switch
            value={props.disableRescheduling}
            onValueChange={props.setDisableRescheduling}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Send Cal Video Transcription Emails */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">
              Send Cal Video Transcription Emails
            </Text>
            <Text className="text-sm text-[#666]">
              Send emails with the transcription of the Cal Video after the meeting ends
            </Text>
          </View>
          <Switch
            value={props.sendCalVideoTranscription}
            onValueChange={props.setSendCalVideoTranscription}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Auto translate */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">
              Auto translate title and description
            </Text>
            <Text className="text-sm text-[#666]">
              Automatically translate titles and descriptions to the visitor's browser language using
              AI
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

      {/* Requires booker email verification */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">
              Requires booker email verification
            </Text>
            <Text className="text-sm text-[#666]">
              To ensure booker's email verification before scheduling events
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

      {/* Hide notes in calendar */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">Hide notes in calendar</Text>
            <Text className="text-sm text-[#666]">
              For privacy reasons, additional inputs and notes will be hidden in the calendar entry
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

      {/* Hide calendar event details */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">
              Hide calendar event details on shared calendars
            </Text>
            <Text className="text-sm text-[#666]">
              When a calendar is shared, events are visible but details are hidden from those
              without write access
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

      {/* Hide organizer's email */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">Hide organizer's email</Text>
            <Text className="text-sm text-[#666]">
              Hide organizer's email address from the booking screen, email notifications, and
              calendar events
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

      {/* Lock timezone */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">
              Lock timezone on booking page
            </Text>
            <Text className="text-sm text-[#666]">
              To lock the timezone on booking page, useful for in-person events
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

      {/* Allow rescheduling past events */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">
              Allow rescheduling past events
            </Text>
            <Text className="text-sm text-[#666]">
              Enabling this option allows for past events to be rescheduled
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

      {/* Allow booking through reschedule link */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base text-[#333] font-medium mb-1">
              Allow booking through reschedule link
            </Text>
            <Text className="text-sm text-[#666]">
              When enabled, users will be able to create a new booking when trying to reschedule a
              cancelled booking
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

      {/* Redirect on booking Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <Text className="text-base font-semibold text-[#333] mb-1.5">Redirect on booking</Text>
        <Text className="text-sm text-[#666] mb-3">
          Redirect to a custom URL after a successful booking
        </Text>
        <TextInput
          className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black mb-3"
          value={props.successRedirectUrl}
          onChangeText={props.setSuccessRedirectUrl}
          placeholder="https://example.com/thank-you"
          placeholderTextColor="#8E8E93"
          keyboardType="url"
          autoCapitalize="none"
        />
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-[#333]">Forward query parameters</Text>
          <Switch
            value={props.forwardParamsSuccessRedirect}
            onValueChange={props.setForwardParamsSuccessRedirect}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Custom Reply-To Email Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <Text className="text-base font-semibold text-[#333] mb-1.5">Custom 'Reply-To' email</Text>
        <Text className="text-sm text-[#666] mb-3">
          Use a different email address as the replyTo for confirmation emails instead of the
          organizer's email
        </Text>
        <TextInput
          className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
          value={props.customReplyToEmail}
          onChangeText={props.setCustomReplyToEmail}
          placeholder="reply@example.com"
          placeholderTextColor="#8E8E93"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Event Type Color Card */}
      <View className="bg-white rounded-2xl p-5 border border-[#E5E5EA]">
        <Text className="text-base font-semibold text-[#333] mb-1.5">Event type color</Text>
        <Text className="text-sm text-[#666] mb-3">
          This is only used for event type & booking differentiation within the app. It is not
          displayed to bookers.
        </Text>
        <View className="gap-3">
          <View>
            <Text className="text-sm font-medium text-[#333] mb-2">Light theme color</Text>
            <View className="flex-row items-center gap-3">
              <View
                className="w-12 h-12 rounded-lg border border-[#E5E5EA]"
                style={{ backgroundColor: props.eventTypeColorLight }}
              />
              <TextInput
                className="flex-1 bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                value={props.eventTypeColorLight}
                onChangeText={props.setEventTypeColorLight}
                placeholder="#292929"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
              />
            </View>
          </View>
          <View>
            <Text className="text-sm font-medium text-[#333] mb-2">Dark theme color</Text>
            <View className="flex-row items-center gap-3">
              <View
                className="w-12 h-12 rounded-lg border border-[#E5E5EA]"
                style={{ backgroundColor: props.eventTypeColorDark }}
              />
              <TextInput
                className="flex-1 bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
                value={props.eventTypeColorDark}
                onChangeText={props.setEventTypeColorDark}
                placeholder="#FAFAFA"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

