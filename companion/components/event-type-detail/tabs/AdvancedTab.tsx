/**
 * AdvancedTab Component
 *
 * Unified Settings app style for iOS, Android, and Web.
 * Uses native iOS pickers via ContextMenu and grouped rows for consistency.
 */

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { showInfoAlert, showNotAvailableAlert } from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";
import { NavigationRow, SettingRow, SettingsGroup } from "../SettingsUI";
import { getColors } from "@/constants/colors";
import { useColorScheme } from "react-native";

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

// Local components removed in favor of SettingsUI

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
  redirectEnabled: boolean;
  setRedirectEnabled: (value: boolean) => void;
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
  disableCancelling: boolean;
  setDisableCancelling: (value: boolean) => void;
  disableRescheduling: boolean;
  setDisableRescheduling: (value: boolean) => void;
  sendCalVideoTranscription: boolean;
  setSendCalVideoTranscription: (value: boolean) => void;
  interfaceLanguageEnabled: boolean;
  setInterfaceLanguageEnabled: (value: boolean) => void;
  interfaceLanguage: string;
  setInterfaceLanguage: (value: string) => void;
  showOptimizedSlots: boolean;
  setShowOptimizedSlots: (value: boolean) => void;
}

export function AdvancedTab(props: AdvancedTabProps) {
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const colorScheme = useColorScheme();
  const theme = getColors(colorScheme === "dark");

  const getLanguageLabel = (value: string) => {
    const option = interfaceLanguageOptions.find((opt) => opt.value === value);
    return option?.label || "Browser Default";
  };

  // handleNotAvailable replaced by global utility

  return (
    <View className="gap-6">
      {/* Booking Confirmation Group */}
      <SettingsGroup header="Confirmation">
        <SettingRow
          isFirst
          title="Requires confirmation"
          description="The booking needs to be manually confirmed before it is pushed to your calendar and a confirmation is sent."
          learnMoreUrl="https://cal.com/help/event-types/how-to-requires"
          value={props.requiresConfirmation}
          onValueChange={(value) => {
            if (value && props.seatsEnabled) {
              Alert.alert(
                "Disable 'Offer seats' first",
                "You need to:\n1. Disable 'Offer seats' and Save\n2. Then enable 'Requires confirmation' and Save again"
              );
              return;
            }
            props.setRequiresConfirmation(value);
          }}
        />
        <SettingRow
          title="Booker email verification"
          description="To ensure booker's email verification before scheduling events."
          value={props.requiresBookerEmailVerification}
          onValueChange={props.setRequiresBookerEmailVerification}
          isLast
        />
      </SettingsGroup>

      {/* Cancellation & Rescheduling Group */}
      <SettingsGroup header="Cancellation & Rescheduling">
        <SettingRow
          isFirst
          title="Disable Cancelling"
          description="Guests and organizer can no longer cancel the event with calendar invite or email."
          value={props.disableCancelling}
          onValueChange={props.setDisableCancelling}
          learnMoreUrl="https://cal.com/help/event-types/disable-canceling-rescheduling#disable-cancelling"
        />
        <SettingRow
          title="Disable Rescheduling"
          description="Guests and Organizer can no longer reschedule the event with calendar invite or email."
          value={props.disableRescheduling}
          onValueChange={props.setDisableRescheduling}
          learnMoreUrl="https://cal.com/help/event-types/disable-canceling-rescheduling#disable-rescheduling"
        />
        <SettingRow
          title="Reschedule past events"
          description="Enabling this option allows for past events to be rescheduled."
          value={props.allowReschedulingPastEvents}
          onValueChange={props.setAllowReschedulingPastEvents}
          learnMoreUrl="https://cal.com/help/event-types/allow-rescheduling"
        />
        <SettingRow
          title="Book via reschedule link"
          description="When enabled, users will be able to create a new booking when trying to reschedule a cancelled booking."
          value={props.allowBookingThroughRescheduleLink}
          onValueChange={props.setAllowBookingThroughRescheduleLink}
          isLast
        />
      </SettingsGroup>

      {/* Privacy Group */}
      <SettingsGroup header="Privacy">
        <SettingRow
          isFirst
          title="Hide notes in calendar"
          description="For privacy reasons, additional inputs and notes will be hidden in the calendar entry. They will still be sent to your email."
          value={props.hideCalendarNotes}
          onValueChange={props.setHideCalendarNotes}
          learnMoreUrl="https://cal.com/help/event-types/hide-notes"
        />
        <SettingRow
          title="Hide calendar event details"
          description="When a calendar is shared, events are visible to readers but their details are hidden from those without write access."
          value={props.hideCalendarEventDetails}
          onValueChange={props.setHideCalendarEventDetails}
        />
        <SettingRow
          title="Hide organizer's email"
          description="Hide organizer's email address from the booking screen, email notifications, and calendar events."
          value={props.hideOrganizerEmail}
          onValueChange={props.setHideOrganizerEmail}
          learnMoreUrl="https://cal.com/help/event-types/hideorganizersemail#hide-organizers-email"
          isLast
        />
      </SettingsGroup>

      {/* Features Group */}
      <SettingsGroup header="Features">
        <SettingRow
          isFirst
          title="Cal Video Transcription"
          description="Send emails with the transcription of the Cal Video after the meeting ends."
          value={props.sendCalVideoTranscription}
          onValueChange={props.setSendCalVideoTranscription}
        />
        <SettingRow
          title="Optimized slots"
          description="Arrange time slots to optimize availability."
          value={props.showOptimizedSlots}
          onValueChange={props.setShowOptimizedSlots}
          learnMoreUrl="https://cal.com/help/event-types/optimized-slots#optimized-slots"
        />
        <SettingRow
          title="Lock timezone"
          description="To lock the timezone on booking page, useful for in-person events."
          value={props.lockTimezone}
          onValueChange={props.setLockTimezone}
          learnMoreUrl="https://cal.com/help/event-types/lock-timezone"
        />
        <SettingRow
          title="Offer seats"
          description="Offer seats for booking. This automatically disables guest & opt-in bookings."
          value={props.seatsEnabled}
          onValueChange={(value) => {
            if (value && props.requiresConfirmation) {
              Alert.alert(
                "Disable 'Requires confirmation' first",
                "You need to:\n1. Disable 'Requires confirmation' and Save\n2. Then enable 'Offer seats' and Save again"
              );
              return;
            }
            props.setSeatsEnabled(value);
          }}
          learnMoreUrl="https://cal.com/help/event-types/offer-seats"
          isLast
        />
      </SettingsGroup>

      {/* Timezone selector - shown when lock timezone is enabled */}
      {props.lockTimezone ? (
        <SettingsGroup header="Timezone">
          <NavigationRow
            isFirst
            isLast
            title="Locked Timezone"
            value={props.lockedTimezone || "Europe/London"}
            onPress={() => openInAppBrowser("https://app.cal.com/event-types", "Select Timezone")}
          />
        </SettingsGroup>
      ) : null}

      {/* Seats Configuration - shown when enabled */}
      {props.seatsEnabled ? (
        <SettingsGroup header="Seats">
          <View className="bg-white pl-4" style={{ backgroundColor: theme.backgroundSecondary }}>
            <View
              className="pt-4 pb-3 pr-4"
              style={{ borderBottomWidth: 1, borderBottomColor: theme.borderSubtle }}
            >
              <Text className="mb-2 text-[13px]" style={{ color: theme.textSecondary }}>
                Seats per booking
              </Text>
              <TextInput
                className="rounded-lg px-3 py-2 text-[17px]"
                style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                value={props.seatsPerTimeSlot}
                onChangeText={props.setSeatsPerTimeSlot}
                placeholder="2"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>
          <SettingRow
            title="Share attendee info"
            description="Share attendee information between guests."
            value={props.showAttendeeInfo}
            onValueChange={props.setShowAttendeeInfo}
          />
          <SettingRow
            title="Show available seats"
            description="Show the number of available seats to bookers."
            value={props.showAvailabilityCount}
            onValueChange={props.setShowAvailabilityCount}
            isLast
          />
        </SettingsGroup>
      ) : null}

      {/* Language */}
      <SettingsGroup header="Language">
        <SettingRow
          isFirst
          title="Custom interface language"
          description="Override the default browser language for the booking page."
          value={props.interfaceLanguageEnabled}
          onValueChange={props.setInterfaceLanguageEnabled}
          isLast={!props.interfaceLanguageEnabled}
        />
        {props.interfaceLanguageEnabled ? (
          <NavigationRow
            isLast
            title="Select Language"
            value={getLanguageLabel(props.interfaceLanguage)}
            onPress={() => setShowLanguagePicker(true)}
            options={interfaceLanguageOptions}
            onSelect={props.setInterfaceLanguage}
          />
        ) : null}
      </SettingsGroup>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        animationType="slide"
        transparent={Platform.OS !== "ios"}
        presentationStyle={Platform.OS === "ios" ? "formSheet" : undefined}
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
          {Platform.OS !== "ios" ? (
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setShowLanguagePicker(false)}
            />
          ) : null}
          <View
            className={
              Platform.OS === "ios"
                ? "flex-1"
                : "h-[70%] w-full rounded-t-[20px] bg-[#F2F2F7] dark:bg-black"
            }
          >
            {/* Header */}
            <View
              className="h-[60px] flex-row items-center justify-between px-4"
              style={{
                backgroundColor: theme.backgroundSecondary,
                borderBottomWidth: 1,
                borderBottomColor: theme.borderSubtle,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowLanguagePicker(false)}
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.backgroundEmphasis }}
              >
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
              <Text className="text-[17px] font-semibold" style={{ color: theme.text }}>
                Select Language
              </Text>
              <View className="h-8 w-8" />
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
            >
              <View
                className="overflow-hidden rounded-[10px]"
                style={{ backgroundColor: theme.backgroundSecondary }}
              >
                {interfaceLanguageOptions.map((option, index) => (
                  <View
                    key={option.value}
                    className="pl-4"
                    style={{ backgroundColor: theme.backgroundSecondary }}
                  >
                    <TouchableOpacity
                      className={`flex-row items-center justify-between py-3 pr-4`}
                      style={{
                        borderBottomWidth: index !== interfaceLanguageOptions.length - 1 ? 1 : 0,
                        borderBottomColor: theme.borderSubtle,
                      }}
                      onPress={() => {
                        props.setInterfaceLanguage(option.value);
                        setShowLanguagePicker(false);
                      }}
                    >
                      <Text className="text-[17px]" style={{ color: theme.text }}>
                        {option.label}
                      </Text>
                      {props.interfaceLanguage === option.value ? (
                        <Ionicons name="checkmark" size={20} color={theme.accent} />
                      ) : null}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Redirect */}
      <SettingsGroup header="Redirect">
        <SettingRow
          isFirst
          title="Redirect on booking"
          description="Redirect to a custom URL after a successful booking."
          value={props.redirectEnabled}
          onValueChange={props.setRedirectEnabled}
          isLast={!props.redirectEnabled}
        />
        {props.redirectEnabled ? (
          <>
            <View className="bg-white pl-4" style={{ backgroundColor: theme.backgroundSecondary }}>
              <View
                className="pt-4 pb-3 pr-4"
                style={{ borderBottomWidth: 1, borderBottomColor: theme.borderSubtle }}
              >
                <Text className="mb-2 text-[13px]" style={{ color: theme.textSecondary }}>
                  Redirect URL
                </Text>
                <TextInput
                  className="rounded-lg px-3 py-2 text-[17px]"
                  style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                  value={props.successRedirectUrl}
                  onChangeText={props.setSuccessRedirectUrl}
                  placeholder="https://example.com/thank-you"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <Text className="mt-2 text-[13px]" style={{ color: theme.warning }}>
                  Adding a redirect will disable the success page.
                </Text>
              </View>
            </View>
            <SettingRow
              title="Forward parameters"
              description="Forward parameters such as ?email=...&name=... to the redirect URL."
              value={props.forwardParamsSuccessRedirect}
              onValueChange={props.setForwardParamsSuccessRedirect}
              isLast
            />
          </>
        ) : null}
      </SettingsGroup>

      {/* Configure on Web Section */}
      <SettingsGroup header="Advanced Settings">
        <NavigationRow
          isFirst
          title="Private Links"
          onPress={() => {
            if (props.eventTypeId && props.eventTypeId !== "new") {
              showNotAvailableAlert();
            } else {
              showInfoAlert("Info", "Save the event type first to configure this setting.");
            }
          }}
        />
        <NavigationRow
          title="Custom Reply-To Email"
          onPress={() => {
            if (props.eventTypeId && props.eventTypeId !== "new") {
              showNotAvailableAlert();
            } else {
              showInfoAlert("Info", "Save the event type first to configure this setting.");
            }
          }}
          isLast
        />
      </SettingsGroup>

      {/* Event type colors */}
      {/* Event type colors */}
      <SettingsGroup header="Event Type Colors">
        <View className="bg-white pl-4" style={{ backgroundColor: theme.backgroundSecondary }}>
          <View
            className="pt-4 pb-3 pr-4"
            style={{ borderBottomWidth: 1, borderBottomColor: theme.borderSubtle }}
          >
            <Text className="mb-2 text-[13px]" style={{ color: theme.textSecondary }}>
              Light Theme
            </Text>
            <View className="flex-row items-center gap-3">
              <View
                className="h-8 w-8 rounded-lg border"
                style={{
                  borderColor: theme.borderLight,
                  backgroundColor: props.eventTypeColorLight.startsWith("#")
                    ? props.eventTypeColorLight
                    : `#${props.eventTypeColorLight}`,
                }}
              />
              <TextInput
                className="flex-1 rounded-lg px-3 py-2 text-[17px]"
                style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                value={props.eventTypeColorLight}
                onChangeText={props.setEventTypeColorLight}
                placeholder="292929"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>
        <View className="bg-white pl-4" style={{ backgroundColor: theme.backgroundSecondary }}>
          <View className="pt-3 pb-4 pr-4">
            <Text className="mb-2 text-[13px]" style={{ color: theme.textSecondary }}>
              Dark Theme
            </Text>
            <View className="flex-row items-center gap-3">
              <View
                className="h-8 w-8 rounded-lg border"
                style={{
                  borderColor: theme.borderLight,
                  backgroundColor: props.eventTypeColorDark.startsWith("#")
                    ? props.eventTypeColorDark
                    : `#${props.eventTypeColorDark}`,
                }}
              />
              <TextInput
                className="flex-1 rounded-lg px-3 py-2 text-[17px]"
                style={{ backgroundColor: theme.backgroundMuted, color: theme.text }}
                value={props.eventTypeColorDark}
                onChangeText={props.setEventTypeColorDark}
                placeholder="fafafa"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>
      </SettingsGroup>
    </View>
  );
}
