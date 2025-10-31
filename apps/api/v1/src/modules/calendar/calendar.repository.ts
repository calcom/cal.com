import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Calendar, CalendarEvent } from '@prisma/client';

@Injectable()
export class CalendarRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCalendar(data: Prisma.CalendarCreateInput): Promise<Calendar> {
    return this.prisma.calendar.create({
      data,
    });
  }

  async findCalendarById(id: string): Promise<Calendar | null> {
    return this.prisma.calendar.findUnique({
      where: { id },
      include: {
        events: true,
        owner: true,
      },
    });
  }

  async findCalendarsByUserId(userId: string): Promise<Calendar[]> {
    return this.prisma.calendar.findMany({
      where: { ownerId: userId },
      include: {
        events: true,
      },
    });
  }

  async findAllCalendars(skip?: number, take?: number): Promise<Calendar[]> {
    return this.prisma.calendar.findMany({
      skip,
      take,
      include: {
        events: true,
        owner: true,
      },
    });
  }

  async updateCalendar(
    id: string,
    data: Prisma.CalendarUpdateInput
  ): Promise<Calendar> {
    return this.prisma.calendar.update({
      where: { id },
      data,
    });
  }

  async deleteCalendar(id: string): Promise<Calendar> {
    return this.prisma.calendar.delete({
      where: { id },
    });
  }

  async createEvent(data: Prisma.CalendarEventCreateInput): Promise<CalendarEvent> {
    return this.prisma.calendarEvent.create({
      data,
    });
  }

  async findEventById(id: string): Promise<CalendarEvent | null> {
    return this.prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        calendar: true,
        attendees: true,
      },
    });
  }

  async findEventsByCalendarId(calendarId: string): Promise<CalendarEvent[]> {
    return this.prisma.calendarEvent.findMany({
      where: { calendarId },
      include: {
        attendees: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async findEventsByDateRange(
    calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    return this.prisma.calendarEvent.findMany({
      where: {
        calendarId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        attendees: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async updateEvent(
    id: string,
    data: Prisma.CalendarEventUpdateInput
  ): Promise<CalendarEvent> {
    return this.prisma.calendarEvent.update({
      where: { id },
      data,
    });
  }

  async deleteEvent(id: string): Promise<CalendarEvent> {
    return this.prisma.calendarEvent.delete({
      where: { id },
    });
  }

  async findUpcomingEvents(
    calendarId: string,
    limit?: number
  ): Promise<CalendarEvent[]> {
    return this.prisma.calendarEvent.findMany({
      where: {
        calendarId,
        startTime: {
          gte: new Date(),
        },
      },
      take: limit || 10,
      orderBy: {
        startTime: 'asc',
      },
      include: {
        attendees: true,
      },
    });
  }

  async findPastEvents(
    calendarId: string,
    limit?: number
  ): Promise<CalendarEvent[]> {
    return this.prisma.calendarEvent.findMany({
      where: {
        calendarId,
        endTime: {
          lt: new Date(),
        },
      },
      take: limit || 10,
      orderBy: {
        startTime: 'desc',
      },
      include: {
        attendees: true,
      },
    });
  }

  async countEventsByCalendarId(calendarId: string): Promise<number> {
    return this.prisma.calendarEvent.count({
      where: { calendarId },
    });
  }

  async countCalendarsByUserId(userId: string): Promise<number> {
    return this.prisma.calendar.count({
      where: { ownerId: userId },
    });
  }

  async findConflictingEvents(
    calendarId: string,
    startTime: Date,
    endTime: Date,
    excludeEventId?: string
  ): Promise<CalendarEvent[]> {
    return this.prisma.calendarEvent.findMany({
      where: {
        calendarId,
        id: excludeEventId ? { not: excludeEventId } : undefined,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });
  }

  async searchEvents(
    calendarId: string,
    searchTerm: string
  ): Promise<CalendarEvent[]> {
    return this.prisma.calendarEvent.findMany({
      where: {
        calendarId,
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { location: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        attendees: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async bulkCreateEvents(
    events: Prisma.CalendarEventCreateManyInput[]
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.calendarEvent.createMany({
      data: events,
    });
  }

  async bulkDeleteEvents(eventIds: string[]): Promise<Prisma.BatchPayload> {
    return this.prisma.calendarEvent.deleteMany({
      where: {
        id: { in: eventIds },
      },
    });
  }
}