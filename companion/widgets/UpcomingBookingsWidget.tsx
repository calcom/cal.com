import { FlexWidget, TextWidget } from "react-native-android-widget";

interface BookingData {
  id: string;
  title: string;
  startTime: string;
  attendeeName: string | null;
}

interface WidgetProps {
  bookings: BookingData[];
}

function BookingItem({ booking }: { booking: BookingData }) {
  return (
    <FlexWidget
      style={{
        flexDirection: "column",
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5E5",
      }}
    >
      <TextWidget
        text={booking.title}
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: "#000000",
        }}
        maxLines={1}
      />
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 2,
        }}
      >
        <TextWidget
          text={booking.startTime}
          style={{
            fontSize: 12,
            color: "#666666",
          }}
        />
      </FlexWidget>
      {booking.attendeeName && (
        <TextWidget
          text={booking.attendeeName}
          style={{
            fontSize: 11,
            color: "#888888",
            marginTop: 2,
          }}
          maxLines={1}
        />
      )}
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
    >
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E5E5",
        }}
      >
        <TextWidget
          text="Upcoming"
          style={{
            fontSize: 14,
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
            text="No upcoming bookings"
            style={{
              fontSize: 13,
              color: "#888888",
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
