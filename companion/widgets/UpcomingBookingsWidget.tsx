"use no memo";
import { FlexWidget, TextWidget } from "react-native-android-widget";

interface BookingData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  startTimeISO?: string;
  attendeeName: string | null;
  hostName?: string | null;
  location?: string | null;
  hasVideoCall?: boolean;
}

interface WidgetProps {
  bookings: BookingData[];
}

// Calculate minutes until meeting starts
function getMinutesUntilStart(startTimeISO?: string): number | null {
  if (!startTimeISO) return null;
  try {
    const startDate = new Date(startTimeISO);
    const now = new Date();
    const minutes = Math.floor((startDate.getTime() - now.getTime()) / 60000);
    return Math.max(0, minutes);
  } catch {
    return null;
  }
}

// Get countdown text
function getCountdownText(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `In ${minutes}m`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `In ${hours}h`;
  }
  return null;
}

// Get accent color based on urgency - returns HexColor type
function getAccentColor(minutes: number | null): `#${string}` {
  if (minutes === null) return "#007AFF"; // Blue - default
  if (minutes <= 0) return "#34C759"; // Green - happening now
  if (minutes <= 30) return "#FF9500"; // Orange - starting soon
  return "#007AFF"; // Blue - default
}

// Get countdown text color - returns HexColor type
function getCountdownColor(minutes: number | null): `#${string}` {
  if (minutes === null) return "#8E8E93";
  if (minutes <= 0) return "#34C759"; // Green
  if (minutes <= 30) return "#FF9500"; // Orange
  return "#8E8E93"; // Gray
}

// Get first initial from name
function getInitial(name: string | null): string {
  if (!name) return "";
  return name.charAt(0).toUpperCase();
}

function BookingItem({ booking }: { booking: BookingData }) {
  const minutes = getMinutesUntilStart(booking.startTimeISO);
  const countdownText = getCountdownText(minutes);
  const accentColor = getAccentColor(minutes);
  const countdownColor = getCountdownColor(minutes);

  return (
    <FlexWidget
      style={{
        flexDirection: "row",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5EA",
      }}
      clickAction="OPEN_URI"
      clickActionData={{
        uri: `calcom://(tabs)/(bookings)/booking-detail?uid=${booking.id}`,
      }}
    >
      {/* Left accent bar */}
      <FlexWidget
        style={{
          width: 3,
          borderRadius: 2,
          backgroundColor: accentColor,
          marginRight: 8,
        }}
      />

      {/* Content */}
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: "column",
        }}
      >
        {/* Title row with video icon */}
        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TextWidget
            text={booking.title}
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#000000",
            }}
            maxLines={1}
          />
          {booking.hasVideoCall && (
            <TextWidget
              text=" 📹"
              style={{
                fontSize: 10,
                color: "#007AFF",
              }}
            />
          )}
        </FlexWidget>

        {/* Date and time with countdown */}
        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 2,
          }}
        >
          <TextWidget
            text={`${booking.date} • ${booking.startTime}`}
            style={{
              fontSize: 11,
              color: "#8E8E93",
            }}
          />
          {countdownText && (
            <TextWidget
              text={` • ${countdownText}`}
              style={{
                fontSize: 11,
                fontWeight: "500",
                color: countdownColor,
              }}
            />
          )}
        </FlexWidget>

        {/* Attendee info with initial circle */}
        {booking.attendeeName && (
          <FlexWidget
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            {/* Initial circle */}
            <FlexWidget
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: "#007AFF20",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 4,
              }}
            >
              <TextWidget
                text={getInitial(booking.attendeeName)}
                style={{
                  fontSize: 9,
                  fontWeight: "600",
                  color: "#007AFF",
                }}
              />
            </FlexWidget>
            <TextWidget
              text={booking.attendeeName}
              style={{
                fontSize: 11,
                color: "#8E8E93",
              }}
              maxLines={1}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}

export function UpcomingBookingsWidget({ bookings }: WidgetProps) {
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        flexDirection: "column",
      }}
      clickAction="OPEN_URI"
      clickActionData={{
        uri: "calcom://(tabs)/(bookings)",
      }}
    >
      {/* Header with calendar icon */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E5EA",
        }}
      >
        <TextWidget
          text="📅"
          style={{
            fontSize: 12,
            marginRight: 4,
          }}
        />
        <TextWidget
          text="Upcoming"
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: "#000000",
          }}
        />
      </FlexWidget>

      {bookings.length === 0 ? (
        <FlexWidget
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <TextWidget
            text="✓"
            style={{
              fontSize: 24,
              color: "#8E8E93",
            }}
          />
          <TextWidget
            text="No upcoming bookings"
            style={{
              fontSize: 12,
              color: "#8E8E93",
              marginTop: 4,
            }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: "column",
          }}
        >
          {bookings.slice(0, 4).map((booking) => (
            <BookingItem key={booking.id} booking={booking} />
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
