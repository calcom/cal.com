import { Request, Response, NextFunction } from 'express';
import { EventsService } from '../services/events.service';
import { CreateEventDto, UpdateEventDto, EventQueryDto } from '../dto/events.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

export class EventsController {
  private eventsService: EventsService;

  constructor() {
    this.eventsService = new EventsService();
  }

  /**
   * Create a new calendar event
   * POST /api/v1/calendars/:calendarId/events
   */
  createEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { calendarId } = req.params;
      const createEventDto = plainToClass(CreateEventDto, req.body);

      const errors = await validate(createEventDto);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints
          }))
        });
        return;
      }

      const event = await this.eventsService.createEvent(calendarId, createEventDto, req.user);

      res.status(201).json({
        success: true,
        data: event
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all events for a calendar
   * GET /api/v1/calendars/:calendarId/events
   */
  getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { calendarId } = req.params;
      const queryDto = plainToClass(EventQueryDto, req.query);

      const errors = await validate(queryDto);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints
          }))
        });
        return;
      }

      const events = await this.eventsService.getEvents(calendarId, queryDto, req.user);

      res.status(200).json({
        success: true,
        data: events
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single event by ID
   * GET /api/v1/calendars/:calendarId/events/:eventId
   */
  getEventById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { calendarId, eventId } = req.params;

      const event = await this.eventsService.getEventById(calendarId, eventId, req.user);

      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: event
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an event
   * PUT /api/v1/calendars/:calendarId/events/:eventId
   */
  updateEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { calendarId, eventId } = req.params;
      const updateEventDto = plainToClass(UpdateEventDto, req.body);

      const errors = await validate(updateEventDto);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints
          }))
        });
        return;
      }

      const event = await this.eventsService.updateEvent(calendarId, eventId, updateEventDto, req.user);

      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: event
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete an event
   * DELETE /api/v1/calendars/:calendarId/events/:eventId
   */
  deleteEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { calendarId, eventId } = req.params;

      await this.eventsService.deleteEvent(calendarId, eventId, req.user);

      res.status(200).json({
        success: true,
        message: 'Event deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get event instances (for recurring events)
   * GET /api/v1/calendars/:calendarId/events/:eventId/instances
   */
  getEventInstances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { calendarId, eventId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate query parameters are required'
        });
        return;
      }

      const instances = await this.eventsService.getEventInstances(
        calendarId,
        eventId,
        new Date(startDate as string),
        new Date(endDate as string),
        req.user
      );

      res.status(200).json({
        success: true,
        data: instances
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk create events
   * POST /api/v1/calendars/:calendarId/events/bulk
   */
  bulkCreateEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { calendarId } = req.params;
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({
          success: false,
          message: 'events array is required and must not be empty'
        });
        return;
      }

      const createEventDtos = events.map(event => plainToClass(CreateEventDto, event));

      for (const dto of createEventDtos) {
        const errors = await validate(dto);
        if (errors.length > 0) {
          res.status(400).json({
            success: false,
            message: 'Validation failed for one or more events',
            errors: errors.map(err => ({
              property: err.property,
              constraints: err.constraints
            }))
          });
          return;
        }
      }

      const createdEvents = await this.eventsService.bulkCreateEvents(calendarId, createEventDtos, req.user);

      res.status(201).json({
        success: true,
        data: createdEvents
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search events
   * GET /api/v1/calendars/:calendarId/events/search
   */
  searchEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { calendarId } = req.params;
      const { q, startDate, endDate, limit = 50, offset = 0 } = req.query;

      if (!q) {
        res.status(400).json({
          success: false,
          message: 'Search query parameter "q" is required'
        });
        return;
      }

      const events = await this.eventsService.searchEvents(
        calendarId,
        q as string,
        {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10)
        },
        req.user
      );

      res.status(200).json({
        success: true,
        data: events
      });
    } catch (error) {
      next(error);
    }
  };
}