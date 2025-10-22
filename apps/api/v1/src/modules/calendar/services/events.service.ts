import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Event } from '../entities/event.entity';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { QueryEventsDto } from '../dto/query-events.dto';
import { CalendarsService } from './calendars.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    private readonly calendarsService: CalendarsService,
  ) {}

  async create(userId: string, createEventDto: CreateEventDto): Promise<Event> {
    const calendar = await this.calendarsService.findOne(userId, createEventDto.calendarId);
    
    if (!calendar) {
      throw new NotFoundException(`Calendar with ID ${createEventDto.calendarId} not found`);
    }

    if (calendar.userId !== userId) {
      throw new ForbiddenException('You do not have permission to create events in this calendar');
    }

    this.validateEventDates(createEventDto.startTime, createEventDto.endTime);

    const event = this.eventsRepository.create({
      ...createEventDto,
      calendar,
      userId,
    });

    return await this.eventsRepository.save(event);
  }

  async findAll(userId: string, queryEventsDto: QueryEventsDto): Promise<Event[]> {
    const { calendarId, startDate, endDate, status, limit = 100, offset = 0 } = queryEventsDto;

    const queryBuilder = this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.calendar', 'calendar')
      .where('event.userId = :userId', { userId });

    if (calendarId) {
      queryBuilder.andWhere('event.calendarId = :calendarId', { calendarId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('event.startTime >= :startDate', { startDate });
      queryBuilder.andWhere('event.endTime <= :endDate', { endDate });
    } else if (startDate) {
      queryBuilder.andWhere('event.startTime >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('event.endTime <= :endDate', { endDate });
    }

    if (status) {
      queryBuilder.andWhere('event.status = :status', { status });
    }

    queryBuilder
      .orderBy('event.startTime', 'ASC')
      .skip(offset)
      .take(limit);

    return await queryBuilder.getMany();
  }

  async findOne(userId: string, id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: ['calendar'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    if (event.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this event');
    }

    return event;
  }

  async update(userId: string, id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(userId, id);

    if (updateEventDto.calendarId && updateEventDto.calendarId !== event.calendarId) {
      const newCalendar = await this.calendarsService.findOne(userId, updateEventDto.calendarId);
      
      if (!newCalendar) {
        throw new NotFoundException(`Calendar with ID ${updateEventDto.calendarId} not found`);
      }

      if (newCalendar.userId !== userId) {
        throw new ForbiddenException('You do not have permission to move events to this calendar');
      }
    }

    if (updateEventDto.startTime || updateEventDto.endTime) {
      const startTime = updateEventDto.startTime || event.startTime;
      const endTime = updateEventDto.endTime || event.endTime;
      this.validateEventDates(startTime, endTime);
    }

    Object.assign(event, updateEventDto);

    return await this.eventsRepository.save(event);
  }

  async remove(userId: string, id: string): Promise<void> {
    const event = await this.findOne(userId, id);
    await this.eventsRepository.remove(event);
  }

  async findByCalendar(userId: string, calendarId: string): Promise<Event[]> {
    const calendar = await this.calendarsService.findOne(userId, calendarId);

    if (!calendar) {
      throw new NotFoundException(`Calendar with ID ${calendarId} not found`);
    }

    return await this.eventsRepository.find({
      where: { calendarId, userId },
      order: { startTime: 'ASC' },
    });
  }

  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Event[]> {
    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    return await this.eventsRepository.find({
      where: {
        userId,
        startTime: MoreThanOrEqual(startDate),
        endTime: LessThanOrEqual(endDate),
      },
      relations: ['calendar'],
      order: { startTime: 'ASC' },
    });
  }

  async countByCalendar(userId: string, calendarId: string): Promise<number> {
    return await this.eventsRepository.count({
      where: { calendarId, userId },
    });
  }

  async findUpcoming(userId: string, limit: number = 10): Promise<Event[]> {
    const now = new Date();

    return await this.eventsRepository.find({
      where: {
        userId,
        startTime: MoreThanOrEqual(now),
        status: 'confirmed',
      },
      relations: ['calendar'],
      order: { startTime: 'ASC' },
      take: limit,
    });
  }

  private validateEventDates(startTime: Date, endTime: Date): void {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }
  }
}