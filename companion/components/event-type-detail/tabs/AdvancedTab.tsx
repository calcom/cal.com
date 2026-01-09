import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { openInAppBrowser } from "@/utils/browser";

// Interface language options matching API V2 enum
const interfaceLanguageOptions = [
  { label: "Browser Default", value: "" },
  { label: "English", value: "en" },
  { label: "العربية", value: "ar" },
  { label: "Azərbaycan", value: "az" },
  { label: "Български", value: "bg" },
  { label: "বাংলা", value: "bn" },
  { label: "Català", value: "ca" },
  { label: "Čeština", value: "cs" },
  { label: "Dansk", value: "da" },
  { label: "Deutsch", value: "de" },
  { label: "Ελληνικά", value: "el" },
  { label: "Español", value: "es" },
  { label: "Español latinoamericano", value: "es-419" },
  { label: "Eesti", value: "et" },
  { label: "Euskara", value: "eu" },
  { label: "Suomi", value: "fi" },
  { label: "Français", value: "fr" },
  { label: "עברית", value: "he" },
  { label: "Magyar", value: "hu" },
  { label: "Italiano", value: "it" },
  { label: "日本語", value: "ja" },
  { label: "ខ្មែរ", value: "km" },
  { label: "한국어", value: "ko" },
  { label: "Nederlands", value: "nl" },
  { label: "Norsk", value: "no" },
  { label: "Polski", value: "pl" },
  { label: "Português", value: "pt" },
  { label: "Português (Brasil)", value: "pt-BR" },
  { label: "Română", value: "ro" },
  { label: "Русский", value: "ru" },
  { label: "Slovenčina (Slovensko)", value: "sk-SK" },
  { label: "Српски", value: "sr" },
  { label: "Svenska", value: "sv" },
  { label: "Türkçe", value: "tr" },
  { label: "Українська", value: "uk" },
  { label: "Tiếng Việt", value: "vi" },
  { label: "中文（中国）", value: "zh-CN" },
  { label: "中文（台灣）", value: "zh-TW" },
];

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
  // New API V2 props
  disableCancelling: boolean;
  setDisableCancelling: (value: boolean) => void;
  disableRescheduling: boolean;
  setDisableRescheduling: (value: boolean) => void;
  sendCalVideoTranscription: boolean;
  setSendCalVideoTranscription: (value: boolean) => void;
  interfaceLanguage: string;
  setInterfaceLanguage: (value: string) => void;
  showOptimizedSlots: boolean;
  setShowOptimizedSlots: (value: boolean) => void;
}

export function AdvancedTab(props: AdvancedTabProps) {
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const getLanguageLabel = (value: string) => {
    const option = interfaceLanguageOptions.find((opt) => opt.value === value);
    return option?.label || "Browser Default";
  };

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

      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Disable Cancelling</Text>
            <Text className="text-sm text-[#666]">
              Guests and Organizer can no longer cancel the event with calendar invite or email.
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

      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Disable Rescheduling</Text>
            <Text className="text-sm text-[#666]">
              Guests and Organizer can no longer reschedule the event with calendar invite or email.
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

      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">
              Send Cal Video Transcription Emails
            </Text>
            <Text className="text-sm text-[#666]">
              Send emails with the transcription of the Cal Video after the meeting ends.
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

      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <Text className="mb-1.5 text-base font-medium text-[#333]">Interface Language</Text>
        <Text className="mb-3 text-sm text-[#666]">
          Set your preferred language for the booking interface.
        </Text>
        <TouchableOpacity
          className="flex-row items-center justify-between rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] px-3 py-3"
          onPress={() => setShowLanguagePicker(true)}
        >
          <Text className="text-base text-[#333]">{getLanguageLabel(props.interfaceLanguage)}</Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>

        {/* Language Picker Modal */}
        <Modal
          visible={showLanguagePicker}
          animationType="slide"
          transparent={Platform.OS !== "ios"}
          presentationStyle={Platform.OS === "ios" ? "formSheet" : undefined}
          onRequestClose={() => setShowLanguagePicker(false)}
        >
          {Platform.OS === "ios" ? (
            <View
              style={{
                flex: 1,
                backgroundColor: isLiquidGlassAvailable() ? "transparent" : "#F2F2F7",
              }}
            >
              {/* Glass Header */}
              {isLiquidGlassAvailable() ? (
                <GlassView
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 60, // Standard header height
                    zIndex: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                  }}
                  glassEffectStyle="regular"
                >
                  <TouchableOpacity
                    onPress={() => setShowLanguagePicker(false)}
                    className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#E5E5EA]"
                  >
                    <Ionicons name="close" size={20} color="#8E8E93" />
                  </TouchableOpacity>

                  <Text className="text-[17px] font-semibold text-black">Select Language</Text>

                  {/* Spacer to balance the centered title since we removed the right button */}
                  <View className="h-8 w-8" />
                </GlassView>
              ) : (
                <View className="absolute left-0 right-0 top-0 z-10 h-[60px] flex-row items-center justify-between border-b border-[#E5E5EA] bg-white px-4">
                  <TouchableOpacity
                    onPress={() => setShowLanguagePicker(false)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-[#E5E5EA]"
                  >
                    <Ionicons name="close" size={20} color="#8E8E93" />
                  </TouchableOpacity>

                  <Text className="text-[17px] font-semibold text-black">Select Language</Text>

                  {/* Spacer to balance the centered title */}
                  <View className="h-8 w-8" />
                </View>
              )}

              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingTop: 80, paddingHorizontal: 16, paddingBottom: 40 }}
              >
                <View className="overflow-hidden rounded-xl border border-gray-300/40 bg-white/60">
                  {interfaceLanguageOptions.map((option, index) => (
                    <TouchableOpacity
                      key={option.value}
                      className={`flex-row items-center justify-between px-4 py-3 active:bg-white/80 ${
                        index !== interfaceLanguageOptions.length - 1
                          ? "border-b border-gray-300/40"
                          : ""
                      }`}
                      onPress={() => {
                        props.setInterfaceLanguage(option.value);
                        setShowLanguagePicker(false);
                      }}
                    >
                      <Text className="text-base text-[#333]">{option.label}</Text>
                      {props.interfaceLanguage === option.value ? (
                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View className="flex-1 justify-end bg-black/50">
              <View className="max-h-[70%] rounded-t-3xl bg-white">
                <View className="flex-row items-center justify-between border-b border-[#E5E5EA] p-4">
                  <Text className="text-lg font-semibold text-[#333]">Select Language</Text>
                  <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <ScrollView className="p-2">
                  {interfaceLanguageOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      className={`flex-row items-center justify-between rounded-lg p-4 ${
                        props.interfaceLanguage === option.value ? "bg-[#F0F0F0]" : ""
                      }`}
                      onPress={() => {
                        props.setInterfaceLanguage(option.value);
                        setShowLanguagePicker(false);
                      }}
                    >
                      <Text className="text-base text-[#333]">{option.label}</Text>
                      {props.interfaceLanguage === option.value ? (
                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </Modal>
      </View>

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
                    : "border-gray-300 bg-white"
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
                    : "border-gray-300 bg-white"
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

      <View className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-base font-medium text-[#333]">Optimized slots</Text>
            <Text className="text-sm text-[#666]">
              Arrange time slots to optimize availability.
            </Text>
          </View>
          <Switch
            value={props.showOptimizedSlots}
            onValueChange={props.setShowOptimizedSlots}
            trackColor={{ false: "#E5E5EA", true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </View>
  );
}
