import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Calendar } from '../entities/calendar.entity';
import { CreateCalendarDto } from '../dto/create-calendar.dto';
import { UpdateCalendarDto } from '../dto/update-calendar.dto';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Calendar)
    private readonly calendarRepository: Repository<Calendar>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createCalendarDto: CreateCalendarDto, userId: string): Promise<Calendar> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const calendar = this.calendarRepository.create({
      ...createCalendarDto,
      owner: user,
      createdBy: user,
      updatedBy: user,
    });

    return await this.calendarRepository.save(calendar);
  }

  async findAll(userId: string): Promise<Calendar[]> {
    return await this.calendarRepository.find({
      where: { owner: { id: userId } },
      relations: ['owner', 'events'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Calendar> {
    const calendar = await this.calendarRepository.findOne({
      where: { id },
      relations: ['owner', 'events', 'createdBy', 'updatedBy'],
    });

    if (!calendar) {
      throw new NotFoundException(`Calendar with ID ${id} not found`);
    }

    if (calendar.owner.id !== userId) {
      throw new ForbiddenException('You do not have access to this calendar');
    }

    return calendar;
  }

  async update(id: string, updateCalendarDto: UpdateCalendarDto, userId: string): Promise<Calendar> {
    const calendar = await this.findOne(id, userId);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(calendar, updateCalendarDto);
    calendar.updatedBy = user;

    return await this.calendarRepository.save(calendar);
  }

  async remove(id: string, userId: string): Promise<void> {
    const calendar = await this.findOne(id, userId);
    await this.calendarRepository.remove(calendar);
  }

  async findBySlug(slug: string): Promise<Calendar> {
    const calendar = await this.calendarRepository.findOne({
      where: { slug },
      relations: ['owner', 'events'],
    });

    if (!calendar) {
      throw new NotFoundException(`Calendar with slug ${slug} not found`);
    }

    return calendar;
  }

  async findPublicCalendars(): Promise<Calendar[]> {
    return await this.calendarRepository.find({
      where: { isPublic: true },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });
  }

  async togglePublic(id: string, userId: string): Promise<Calendar> {
    const calendar = await this.findOne(id, userId);
    calendar.isPublic = !calendar.isPublic;
    return await this.calendarRepository.save(calendar);
  }

  async validateOwnership(calendarId: string, userId: string): Promise<boolean> {
    const calendar = await this.calendarRepository.findOne({
      where: { id: calendarId },
      relations: ['owner'],
    });

    if (!calendar) {
      throw new NotFoundException(`Calendar with ID ${calendarId} not found`);
    }

    return calendar.owner.id === userId;
  }

  async getCalendarStats(id: string, userId: string): Promise<any> {
    const calendar = await this.findOne(id, userId);

    const totalEvents = calendar.events?.length || 0;
    const upcomingEvents = calendar.events?.filter(event => new Date(event.startTime) > new Date()).length || 0;
    const pastEvents = calendar.events?.filter(event => new Date(event.endTime) < new Date()).length || 0;

    return {
      totalEvents,
      upcomingEvents,
      pastEvents,
      createdAt: calendar.createdAt,
      updatedAt: calendar.updatedAt,
    };
  }

  async duplicateCalendar(id: string, userId: string, newName?: string): Promise<Calendar> {
    const originalCalendar = await this.findOne(id, userId);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const duplicatedCalendar = this.calendarRepository.create({
      name: newName || `${originalCalendar.name} (Copy)`,
      description: originalCalendar.description,
      timezone: originalCalendar.timezone,
      color: originalCalendar.color,
      isPublic: false,
      slug: `${originalCalendar.slug}-copy-${Date.now()}`,
      owner: user,
      createdBy: user,
      updatedBy: user,
    });

    return await this.calendarRepository.save(duplicatedCalendar);
  }

  async searchCalendars(query: string, userId: string): Promise<Calendar[]> {
    return await this.calendarRepository
      .createQueryBuilder('calendar')
      .leftJoinAndSelect('calendar.owner', 'owner')
      .where('owner.id = :userId', { userId })
      .andWhere('(calendar.name ILIKE :query OR calendar.description ILIKE :query)', { query: `%${query}%` })
      .orderBy('calendar.createdAt', 'DESC')
      .getMany();
  }

  async bulkDelete(ids: string[], userId: string): Promise<void> {
    for (const id of ids) {
      await this.remove(id, userId);
    }
  }

  async getCalendarsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Calendar[]> {
    return await this.calendarRepository
      .createQueryBuilder('calendar')
      .leftJoinAndSelect('calendar.owner', 'owner')
      .leftJoinAndSelect('calendar.events', 'events')
      .where('owner.id = :userId', { userId })
      .andWhere('events.startTime >= :startDate', { startDate })
      .andWhere('events.endTime <= :endDate', { endDate })
      .orderBy('calendar.createdAt', 'DESC')
      .getMany();
  }
}