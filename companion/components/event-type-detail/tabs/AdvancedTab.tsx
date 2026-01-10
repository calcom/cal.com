/**
 * AdvancedTab Component
 *
 * Unified Settings app style for iOS, Android, and Web.
 * Uses native iOS pickers via ContextMenu and grouped rows for consistency.
 */

import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
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

import { showInfoAlert } from "@/utils/alerts";
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

// Section header
function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      className="mb-2 ml-4 text-[13px] uppercase tracking-wide text-[#6D6D72]"
      style={{ letterSpacing: 0.5 }}
    >
      {title}
    </Text>
  );
}

// Settings group container
function SettingsGroup({
  children,
  header,
  footer,
}: {
  children: React.ReactNode;
  header?: string;
  footer?: string;
}) {
  return (
    <View>
      {header ? <SectionHeader title={header} /> : null}
      <View className="overflow-hidden rounded-[14px] bg-white">{children}</View>
      {footer ? <Text className="ml-4 mt-2 text-[13px] text-[#6D6D72]">{footer}</Text> : null}
    </View>
  );
}

// Toggle row with indented separator
function SettingRow({
  title,
  description,
  value,
  onValueChange,
  learnMoreUrl,
  isFirst = false,
  isLast = false,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  learnMoreUrl?: string;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const height = isFirst || isLast ? 52 : 44;
  const showDescription = () => {
    if (!description) return;

    const buttons: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default" | "destructive";
    }[] = [{ text: "OK", style: "cancel" }];

    if (learnMoreUrl) {
      buttons.unshift({
        text: "Learn more",
        onPress: () => openInAppBrowser(learnMoreUrl, "Learn more"),
      });
    }

    Alert.alert(title, description, buttons);
  };

  return (
    <View className="bg-white pl-4">
      <View
        className={`flex-row items-center pr-4 ${!isLast ? "border-b border-[#E5E5E5]" : ""}`}
        style={{ height }}
      >
        <TouchableOpacity
          className="flex-1 flex-row items-center"
          style={{ height }}
          onPress={description ? showDescription : undefined}
          activeOpacity={description ? 0.7 : 1}
          disabled={!description}
        >
          <Text className="text-[17px] text-black" style={{ fontWeight: "400" }}>
            {title}
          </Text>
          {description ? (
            <Ionicons name="chevron-down" size={12} color="#C7C7CC" style={{ marginLeft: 6 }} />
          ) : null}
        </TouchableOpacity>
        <View style={{ alignSelf: "center" }}>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: "#E9E9EA", true: "#000000" }}
            thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
          />
        </View>
      </View>
    </View>
  );
}

// Navigation row (with chevron)
function NavigationRow({
  title,
  value,
  onPress,
  isFirst = false,
  isLast = false,
  options,
  onSelect,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  options?: { label: string; value: string }[];
  onSelect?: (value: string) => void;
}) {
  const height = isFirst || isLast ? 52 : 44;
  return (
    <View className="bg-white pl-4" style={{ height }}>
      <View
        className={`flex-1 flex-row items-center justify-between pr-4 ${
          !isLast ? "border-b border-[#E5E5E5]" : ""
        }`}
        style={{ height }}
      >
        <Text className="text-[17px] text-black" style={{ fontWeight: "400" }}>
          {title}
        </Text>
        <View className="flex-row items-center">
          {Platform.OS === "ios" && options && onSelect ? (
            <>
              {value ? (
                <Text className="mr-2 text-[17px] text-[#8E8E93]" numberOfLines={1}>
                  {value}
                </Text>
              ) : null}
              <IOSPickerTrigger options={options} selectedValue={value || ""} onSelect={onSelect} />
            </>
          ) : (
            <TouchableOpacity
              className="flex-row items-center"
              onPress={onPress}
              activeOpacity={0.5}
            >
              {value ? (
                <Text className="mr-1 text-[17px] text-[#8E8E93]" numberOfLines={1}>
                  {value}
                </Text>
              ) : null}
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// iOS Native Picker trigger component
function IOSPickerTrigger({
  options,
  selectedValue,
  onSelect,
}: {
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <Host matchContents>
      <ContextMenu
        modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered")]}
        activationMethod="singlePress"
      >
        <ContextMenu.Items>
          {options.map((opt) => (
            <Button
              key={opt.value}
              systemImage={selectedValue === opt.label ? "checkmark" : undefined}
              onPress={() => onSelect(opt.value)}
              label={opt.label}
            />
          ))}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <HStack>
            <Image systemName="chevron.up.chevron.down" color="primary" size={13} />
          </HStack>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
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
    <View className="gap-6">
      {/* Booking Confirmation Group */}
      <SettingsGroup header="Confirmation">
        <SettingRow
          isFirst
          title="Requires confirmation"
          description="The booking needs to be manually confirmed before it is pushed to your calendar and a confirmation is sent."
          value={props.requiresConfirmation}
          onValueChange={props.setRequiresConfirmation}
        />
        <SettingRow
          title="Email verification"
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
          description="Guests and Organizer can no longer cancel the event with calendar invite or email."
          value={props.disableCancelling}
          onValueChange={props.setDisableCancelling}
        />
        <SettingRow
          title="Disable Rescheduling"
          description="Guests and Organizer can no longer reschedule the event with calendar invite or email."
          value={props.disableRescheduling}
          onValueChange={props.setDisableRescheduling}
        />
        <SettingRow
          title="Reschedule past events"
          description="Enabling this option allows for past events to be rescheduled."
          value={props.allowReschedulingPastEvents}
          onValueChange={props.setAllowReschedulingPastEvents}
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
          onValueChange={props.setSeatsEnabled}
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
          <View className="bg-white pl-4">
            <View className="border-b border-[#E5E5E5] pt-4 pb-3 pr-4">
              <Text className="mb-2 text-[13px] text-[#6D6D72]">Seats per booking</Text>
              <TextInput
                className="rounded-lg bg-[#F2F2F7] px-3 py-2 text-[17px] text-black"
                value={props.seatsPerTimeSlot}
                onChangeText={props.setSeatsPerTimeSlot}
                placeholder="2"
                placeholderTextColor="#8E8E93"
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
        <NavigationRow
          isFirst
          isLast
          title="Interface Language"
          value={getLanguageLabel(props.interfaceLanguage)}
          onPress={() => setShowLanguagePicker(true)}
          options={interfaceLanguageOptions}
          onSelect={props.setInterfaceLanguage}
        />
      </SettingsGroup>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        animationType="slide"
        transparent={Platform.OS !== "ios"}
        presentationStyle={Platform.OS === "ios" ? "formSheet" : undefined}
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: Platform.OS === "ios" ? "#F2F2F7" : "rgba(0,0,0,0.5)",
          }}
        >
          {Platform.OS !== "ios" ? (
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setShowLanguagePicker(false)}
            />
          ) : null}
          <View
            style={
              Platform.OS === "ios"
                ? { flex: 1 }
                : {
                    backgroundColor: "#F2F2F7",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    maxHeight: "70%",
                  }
            }
          >
            {/* Header */}
            <View className="h-[60px] flex-row items-center justify-between border-b border-[#E5E5E5] bg-white px-4">
              <TouchableOpacity
                onPress={() => setShowLanguagePicker(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#E5E5EA]"
              >
                <Ionicons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
              <Text className="text-[17px] font-semibold text-black">Select Language</Text>
              <View className="h-8 w-8" />
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
            >
              <View className="overflow-hidden rounded-[10px] bg-white">
                {interfaceLanguageOptions.map((option, index) => (
                  <View key={option.value} className="bg-white pl-4">
                    <TouchableOpacity
                      className={`flex-row items-center justify-between py-3 pr-4 ${
                        index !== interfaceLanguageOptions.length - 1
                          ? "border-b border-[#E5E5E5]"
                          : ""
                      }`}
                      onPress={() => {
                        props.setInterfaceLanguage(option.value);
                        setShowLanguagePicker(false);
                      }}
                    >
                      <Text className="text-[17px] text-black">{option.label}</Text>
                      {props.interfaceLanguage === option.value ? (
                        <Ionicons name="checkmark" size={20} color="#000000" />
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
        <View className="bg-white pl-4">
          <View className="border-b border-[#E5E5E5] pt-4 pb-3 pr-4">
            <Text className="mb-2 text-[13px] text-[#6D6D72]">
              Redirect URL after successful booking
            </Text>
            <TextInput
              className="rounded-lg bg-[#F2F2F7] px-3 py-2 text-[17px] text-black"
              value={props.successRedirectUrl}
              onChangeText={props.setSuccessRedirectUrl}
              placeholder="https://example.com/thank-you"
              placeholderTextColor="#8E8E93"
              keyboardType="url"
              autoCapitalize="none"
            />
            {props.successRedirectUrl ? (
              <Text className="mt-2 text-[13px] text-[#FF9500]">
                Adding a redirect will disable the success page.
              </Text>
            ) : null}
          </View>
        </View>
        <SettingRow
          title="Forward parameters"
          description="Forward parameters such as ?email=...&name=... to the redirect URL."
          value={props.forwardParamsSuccessRedirect}
          onValueChange={props.setForwardParamsSuccessRedirect}
          isLast
        />
      </SettingsGroup>

      {/* Configure on Web Section */}
      <SettingsGroup header="Advanced Settings">
        <NavigationRow
          isFirst
          title="Private Links"
          onPress={() => {
            if (props.eventTypeId && props.eventTypeId !== "new") {
              openInAppBrowser(
                `https://app.cal.com/event-types/${props.eventTypeId}?tabName=advanced`,
                "Private Links"
              );
            } else {
              showInfoAlert("Info", "Save the event type first to configure this setting.");
            }
          }}
        />
        <NavigationRow
          title="Custom Reply-To Email"
          onPress={() => {
            if (props.eventTypeId && props.eventTypeId !== "new") {
              openInAppBrowser(
                `https://app.cal.com/event-types/${props.eventTypeId}?tabName=advanced`,
                "Custom Reply-To"
              );
            } else {
              showInfoAlert("Info", "Save the event type first to configure this setting.");
            }
          }}
          isLast
        />
      </SettingsGroup>

      {/* Event type colors */}
      <SettingsGroup header="Event Type Colors">
        <View className="bg-white pl-4">
          <View className="border-b border-[#E5E5E5] pt-4 pb-3 pr-4">
            <Text className="mb-2 text-[13px] text-[#6D6D72]">Light Theme</Text>
            <View className="flex-row items-center gap-3">
              <View
                className="h-8 w-8 rounded-lg border border-[#C6C6C8]"
                style={{
                  backgroundColor: props.eventTypeColorLight.startsWith("#")
                    ? props.eventTypeColorLight
                    : `#${props.eventTypeColorLight}`,
                }}
              />
              <TextInput
                className="flex-1 rounded-lg bg-[#F2F2F7] px-3 py-2 text-[17px] text-black"
                value={props.eventTypeColorLight}
                onChangeText={props.setEventTypeColorLight}
                placeholder="292929"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>
        <View className="bg-white pl-4">
          <View className="pt-3 pb-4 pr-4">
            <Text className="mb-2 text-[13px] text-[#6D6D72]">Dark Theme</Text>
            <View className="flex-row items-center gap-3">
              <View
                className="h-8 w-8 rounded-lg border border-[#C6C6C8]"
                style={{
                  backgroundColor: props.eventTypeColorDark.startsWith("#")
                    ? props.eventTypeColorDark
                    : `#${props.eventTypeColorDark}`,
                }}
              />
              <TextInput
                className="flex-1 rounded-lg bg-[#F2F2F7] px-3 py-2 text-[17px] text-black"
                value={props.eventTypeColorDark}
                onChangeText={props.setEventTypeColorDark}
                placeholder="fafafa"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>
      </SettingsGroup>
    </View>
  );
}
