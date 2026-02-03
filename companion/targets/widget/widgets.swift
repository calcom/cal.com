import WidgetKit
import SwiftUI

// MARK: - Data Models

struct BookingData: Codable, Identifiable {
    let id: String
    let title: String
    let date: String
    let startTime: String
    let endTime: String
    let startTimeISO: String? // For countdown calculation
    let attendeeName: String?
    let hostName: String?
    let location: String?
    let hasVideoCall: Bool?
    
    // Calculate minutes until meeting starts
    var minutesUntilStart: Int? {
        guard let isoString = startTimeISO else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        // Try with fractional seconds first, then without
        var startDate = formatter.date(from: isoString)
        if startDate == nil {
            formatter.formatOptions = [.withInternetDateTime]
            startDate = formatter.date(from: isoString)
        }
        
        guard let start = startDate else { return nil }
        let minutes = Int(start.timeIntervalSinceNow / 60)
        return max(0, minutes)
    }
    
    // Check if meeting is happening now
    var isHappeningNow: Bool {
        guard let minutes = minutesUntilStart else { return false }
        return minutes <= 0
    }
    
    // Check if meeting is starting soon (within 30 min)
    var isStartingSoon: Bool {
        guard let minutes = minutesUntilStart else { return false }
        return minutes > 0 && minutes <= 30
    }
}

struct WidgetData: Codable {
    let bookings: [BookingData]
    let lastUpdated: String?
}

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> BookingEntry {
        BookingEntry(date: Date(), bookings: [
            BookingData(id: "1", title: "Team Meeting", date: "Mon, Feb 3", startTime: "10:00 AM", endTime: "11:00 AM", startTimeISO: nil, attendeeName: "John Doe", hostName: "You", location: nil, hasVideoCall: true)
        ])
    }

    func getSnapshot(in context: Context, completion: @escaping (BookingEntry) -> Void) {
        let entry = BookingEntry(date: Date(), bookings: loadBookings())
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<BookingEntry>) -> Void) {
        let bookings = loadBookings()
        let entry = BookingEntry(date: Date(), bookings: bookings)
        // Refresh every 5 minutes for more accurate countdowns
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func loadBookings() -> [BookingData] {
        guard let userDefaults = UserDefaults(suiteName: "group.com.cal.companion") else {
            return []
        }
        
        if let jsonString = userDefaults.string(forKey: "widgetBookings"),
           let data = jsonString.data(using: .utf8),
           let widgetData = try? JSONDecoder().decode(WidgetData.self, from: data) {
            return widgetData.bookings
        }
        
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

// MARK: - Booking Row View

struct BookingRowView: View {
    let booking: BookingData
    
    var body: some View {
        HStack(spacing: 8) {
            // Left accent bar (color based on urgency)
            RoundedRectangle(cornerRadius: 2)
                .fill(accentColor)
                .frame(width: 3)
            
            VStack(alignment: .leading, spacing: 2) {
                // Title row with video icon
                HStack(spacing: 4) {
                    Text(booking.title)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    
                    if booking.hasVideoCall == true {
                        Image(systemName: "video.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.blue)
                    }
                }
                
                // Date and time with countdown
                HStack(spacing: 4) {
                    Text("\(booking.date) • \(booking.startTime)")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                    
                    if let countdown = countdownText {
                        Text("•")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                        Text(countdown)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(countdownColor)
                    }
                }
                
                // Attendee info
                if let attendee = booking.attendeeName {
                    HStack(spacing: 4) {
                        // Attendee initial circle
                        Circle()
                            .fill(Color.accentColor.opacity(0.2))
                            .frame(width: 16, height: 16)
                            .overlay(
                                Text(String(attendee.prefix(1)).uppercased())
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundColor(.accentColor)
                            )
                        Text(attendee)
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private var accentColor: Color {
        if booking.isHappeningNow {
            return .green
        } else if booking.isStartingSoon {
            return .orange
        }
        return .accentColor
    }
    
    private var countdownText: String? {
        guard let minutes = booking.minutesUntilStart else { return nil }
        if minutes <= 0 {
            return "Now"
        } else if minutes < 60 {
            return "In \(minutes)m"
        } else if minutes < 1440 {
            let hours = minutes / 60
            return "In \(hours)h"
        }
        return nil
    }
    
    private var countdownColor: Color {
        guard let minutes = booking.minutesUntilStart else { return .secondary }
        if minutes <= 0 {
            return .green
        } else if minutes <= 30 {
            return .orange
        }
        return .secondary
    }
}

// MARK: - Widget Entry View

struct UpcomingBookingsWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        ZStack {
            // Subtle gradient background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.accentColor.opacity(0.05),
                    Color.clear
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack {
                    Image(systemName: "calendar")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.accentColor)
                    Text("Upcoming")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.primary)
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
                    if family == .systemMedium {
                        // Horizontal layout for medium widget
                        HStack(alignment: .top, spacing: 12) {
                            ForEach(entry.bookings.prefix(2)) { booking in
                                MediumBookingCard(booking: booking)
                            }
                        }
                        Spacer(minLength: 0)
                    } else {
                        // Vertical layout for small and large widgets
                        let maxBookings = family == .systemSmall ? 2 : 6
                        ForEach(entry.bookings.prefix(maxBookings)) { booking in
                            Link(destination: URL(string: "calcom://(tabs)/(bookings)/booking-detail?uid=\(booking.id)")!) {
                                BookingRowView(booking: booking)
                            }
                            if booking.id != entry.bookings.prefix(maxBookings).last?.id {
                                Divider()
                            }
                        }
                        Spacer(minLength: 0)
                    }
                }
            }
            .padding(12)
        }
        .widgetURL(URL(string: "calcom://(tabs)/(bookings)"))
    }
}

// MARK: - Medium Widget Card

struct MediumBookingCard: View {
    let booking: BookingData
    
    var body: some View {
        Link(destination: URL(string: "calcom://(tabs)/(bookings)/booking-detail?uid=\(booking.id)")!) {
            HStack(spacing: 6) {
                // Left accent bar
                RoundedRectangle(cornerRadius: 2)
                    .fill(accentColor)
                    .frame(width: 3)
                
                VStack(alignment: .leading, spacing: 3) {
                    // Title with video icon
                    HStack(spacing: 3) {
                        Text(booking.title)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                        
                        if booking.hasVideoCall == true {
                            Image(systemName: "video.fill")
                                .font(.system(size: 8))
                                .foregroundColor(.blue)
                        }
                    }
                    
                    // Date
                    HStack(spacing: 3) {
                        Image(systemName: "calendar")
                            .font(.system(size: 9))
                            .foregroundColor(.secondary)
                        Text(booking.date)
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    }
                    
                    // Time with countdown
                    HStack(spacing: 3) {
                        Image(systemName: "clock")
                            .font(.system(size: 9))
                            .foregroundColor(.secondary)
                        Text(booking.startTime)
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                        
                        if let countdown = countdownText {
                            Text("• \(countdown)")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(countdownColor)
                        }
                    }
                    
                    // Attendee
                    if let attendee = booking.attendeeName {
                        HStack(spacing: 3) {
                            Circle()
                                .fill(Color.accentColor.opacity(0.2))
                                .frame(width: 14, height: 14)
                                .overlay(
                                    Text(String(attendee.prefix(1)).uppercased())
                                        .font(.system(size: 8, weight: .semibold))
                                        .foregroundColor(.accentColor)
                                )
                            Text(attendee)
                                .font(.system(size: 10))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    
    private var accentColor: Color {
        if booking.isHappeningNow {
            return .green
        } else if booking.isStartingSoon {
            return .orange
        }
        return .accentColor
    }
    
    private var countdownText: String? {
        guard let minutes = booking.minutesUntilStart else { return nil }
        if minutes <= 0 {
            return "Now"
        } else if minutes < 60 {
            return "In \(minutes)m"
        } else if minutes < 1440 {
            let hours = minutes / 60
            return "In \(hours)h"
        }
        return nil
    }
    
    private var countdownColor: Color {
        guard let minutes = booking.minutesUntilStart else { return .secondary }
        if minutes <= 0 {
            return .green
        } else if minutes <= 30 {
            return .orange
        }
        return .secondary
    }
}

// MARK: - Widget Configuration

struct UpcomingBookingsWidget: Widget {
    let kind: String = "UpcomingBookingsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            UpcomingBookingsWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Upcoming Bookings")
        .description("View your upcoming Cal.com bookings at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    UpcomingBookingsWidget()
} timeline: {
    BookingEntry(date: .now, bookings: [
        BookingData(id: "1", title: "Team Standup", date: "Mon, Feb 3", startTime: "10:00 AM", endTime: "10:30 AM", startTimeISO: ISO8601DateFormatter().string(from: Date().addingTimeInterval(1800)), attendeeName: "John Doe", hostName: "You", location: nil, hasVideoCall: true),
        BookingData(id: "2", title: "Product Review", date: "Mon, Feb 3", startTime: "2:00 PM", endTime: "3:00 PM", startTimeISO: nil, attendeeName: "Jane Smith", hostName: "You", location: nil, hasVideoCall: false)
    ])
    BookingEntry(date: .now, bookings: [])
}

#Preview(as: .systemMedium) {
    UpcomingBookingsWidget()
} timeline: {
    BookingEntry(date: .now, bookings: [
        BookingData(id: "1", title: "Team Standup", date: "Mon, Feb 3", startTime: "10:00 AM", endTime: "10:30 AM", startTimeISO: ISO8601DateFormatter().string(from: Date().addingTimeInterval(600)), attendeeName: "John Doe", hostName: "You", location: nil, hasVideoCall: true),
        BookingData(id: "2", title: "Product Review", date: "Mon, Feb 3", startTime: "2:00 PM", endTime: "3:00 PM", startTimeISO: nil, attendeeName: "Jane Smith", hostName: "You", location: "Zoom", hasVideoCall: true)
    ])
}

#Preview(as: .systemLarge) {
    UpcomingBookingsWidget()
} timeline: {
    BookingEntry(date: .now, bookings: [
        BookingData(id: "1", title: "Team Standup", date: "Mon, Feb 3", startTime: "10:00 AM", endTime: "10:30 AM", startTimeISO: nil, attendeeName: "John Doe", hostName: "You", location: nil, hasVideoCall: true),
        BookingData(id: "2", title: "Product Review", date: "Mon, Feb 3", startTime: "2:00 PM", endTime: "3:00 PM", startTimeISO: nil, attendeeName: "Jane Smith", hostName: "You", location: nil, hasVideoCall: false),
        BookingData(id: "3", title: "Client Call", date: "Tue, Feb 4", startTime: "4:00 PM", endTime: "5:00 PM", startTimeISO: nil, attendeeName: "Bob Wilson", hostName: "You", location: nil, hasVideoCall: true),
        BookingData(id: "4", title: "Interview", date: "Tue, Feb 4", startTime: "5:30 PM", endTime: "6:00 PM", startTimeISO: nil, attendeeName: "Alice Johnson", hostName: "You", location: nil, hasVideoCall: false),
        BookingData(id: "5", title: "Wrap Up", date: "Wed, Feb 5", startTime: "6:00 PM", endTime: "6:15 PM", startTimeISO: nil, attendeeName: "Team", hostName: "You", location: nil, hasVideoCall: false)
    ])
}
