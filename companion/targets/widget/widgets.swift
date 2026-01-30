import WidgetKit
import SwiftUI

struct BookingData: Codable, Identifiable {
    let id: String
    let title: String
    let startTime: String
    let endTime: String
    let attendeeName: String?
    let location: String?
}

struct WidgetData: Codable {
    let bookings: [BookingData]
    let lastUpdated: String?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> BookingEntry {
        BookingEntry(date: Date(), bookings: [
            BookingData(id: "1", title: "Team Meeting", startTime: "10:00 AM", endTime: "11:00 AM", attendeeName: "John Doe", location: nil)
        ])
    }

    func getSnapshot(in context: Context, completion: @escaping (BookingEntry) -> Void) {
        let entry = BookingEntry(date: Date(), bookings: loadBookings())
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<BookingEntry>) -> Void) {
        let bookings = loadBookings()
        let entry = BookingEntry(date: Date(), bookings: bookings)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func loadBookings() -> [BookingData] {
        guard let userDefaults = UserDefaults(suiteName: "group.com.cal.companion") else {
            return []
        }
        
        // react-native-shared-group-preferences stores data as a JSON string, not raw Data
        // Try reading as string first (the format used by the library)
        if let jsonString = userDefaults.string(forKey: "widgetBookings"),
           let data = jsonString.data(using: .utf8),
           let widgetData = try? JSONDecoder().decode(WidgetData.self, from: data) {
            return widgetData.bookings
        }
        
        // Fallback: try reading as raw Data (in case format changes)
        if let data = userDefaults.data(forKey: "widgetBookings"),
           let widgetData = try? JSONDecoder().decode(WidgetData.self, from: data) {
            return widgetData.bookings
        }
        
        return []
    }
}

struct BookingEntry: TimelineEntry {
    let date: Date
    let bookings: [BookingData]
}

struct BookingRowView: View {
    let booking: BookingData
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(booking.title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.primary)
                .lineLimit(1)
            
            HStack(spacing: 4) {
                Image(systemName: "clock")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
                Text("\(booking.startTime)")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
            
            if let attendee = booking.attendeeName {
                HStack(spacing: 4) {
                    Image(systemName: "person")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Text(attendee)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct UpcomingBookingsWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Image(systemName: "calendar")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.black)
                Text("Upcoming")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.black)
                Spacer()
            }
            .padding(.bottom, 8)
            
            if entry.bookings.isEmpty {
                Spacer()
                VStack(spacing: 4) {
                    Image(systemName: "calendar.badge.checkmark")
                        .font(.system(size: 24))
                        .foregroundColor(.secondary)
                    Text("No upcoming bookings")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                let maxBookings = family == .systemSmall ? 2 : 4
                ForEach(entry.bookings.prefix(maxBookings)) { booking in
                    BookingRowView(booking: booking)
                    if booking.id != entry.bookings.prefix(maxBookings).last?.id {
                        Divider()
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .padding(12)
    }
}

struct UpcomingBookingsWidget: Widget {
    let kind: String = "UpcomingBookingsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            UpcomingBookingsWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Upcoming Bookings")
        .description("View your upcoming Cal.com bookings at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    UpcomingBookingsWidget()
} timeline: {
    BookingEntry(date: .now, bookings: [
        BookingData(id: "1", title: "Team Standup", startTime: "10:00 AM", endTime: "10:30 AM", attendeeName: "John Doe", location: nil),
        BookingData(id: "2", title: "Product Review", startTime: "2:00 PM", endTime: "3:00 PM", attendeeName: "Jane Smith", location: nil)
    ])
    BookingEntry(date: .now, bookings: [])
}

#Preview(as: .systemMedium) {
    UpcomingBookingsWidget()
} timeline: {
    BookingEntry(date: .now, bookings: [
        BookingData(id: "1", title: "Team Standup", startTime: "10:00 AM", endTime: "10:30 AM", attendeeName: "John Doe", location: nil),
        BookingData(id: "2", title: "Product Review", startTime: "2:00 PM", endTime: "3:00 PM", attendeeName: "Jane Smith", location: nil),
        BookingData(id: "3", title: "Client Call", startTime: "4:00 PM", endTime: "5:00 PM", attendeeName: "Bob Wilson", location: nil)
    ])
}
