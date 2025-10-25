import { Request, Response, NextFunction } from 'express';
import { AvailabilityService } from '../services/availability.service';
import { CreateAvailabilityDto, UpdateAvailabilityDto, GetAvailabilityQueryDto } from '../dto/availability.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

export class AvailabilityController {
  private availabilityService: AvailabilityService;

  constructor() {
    this.availabilityService = new AvailabilityService();
  }

  public createAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto = plainToClass(CreateAvailabilityDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({ errors: errors.map((err) => Object.values(err.constraints || {})).flat() });
        return;
      }

      const availability = await this.availabilityService.createAvailability(userId, dto);
      res.status(201).json({ data: availability, message: 'Availability created successfully' });
    } catch (error) {
      next(error);
    }
  };

  public getAvailabilities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const queryDto = plainToClass(GetAvailabilityQueryDto, req.query);
      const errors = await validate(queryDto);

      if (errors.length > 0) {
        res.status(400).json({ errors: errors.map((err) => Object.values(err.constraints || {})).flat() });
        return;
      }

      const availabilities = await this.availabilityService.getAvailabilities(userId, queryDto);
      res.status(200).json({ data: availabilities, message: 'Availabilities retrieved successfully' });
    } catch (error) {
      next(error);
    }
  };

  public getAvailabilityById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const availabilityId = req.params.id;
      if (!availabilityId) {
        res.status(400).json({ error: 'Availability ID is required' });
        return;
      }

      const availability = await this.availabilityService.getAvailabilityById(userId, availabilityId);
      if (!availability) {
        res.status(404).json({ error: 'Availability not found' });
        return;
      }

      res.status(200).json({ data: availability, message: 'Availability retrieved successfully' });
    } catch (error) {
      next(error);
    }
  };

  public updateAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const availabilityId = req.params.id;
      if (!availabilityId) {
        res.status(400).json({ error: 'Availability ID is required' });
        return;
      }

      const dto = plainToClass(UpdateAvailabilityDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({ errors: errors.map((err) => Object.values(err.constraints || {})).flat() });
        return;
      }

      const availability = await this.availabilityService.updateAvailability(userId, availabilityId, dto);
      if (!availability) {
        res.status(404).json({ error: 'Availability not found' });
        return;
      }

      res.status(200).json({ data: availability, message: 'Availability updated successfully' });
    } catch (error) {
      next(error);
    }
  };

  public deleteAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const availabilityId = req.params.id;
      if (!availabilityId) {
        res.status(400).json({ error: 'Availability ID is required' });
        return;
      }

      const deleted = await this.availabilityService.deleteAvailability(userId, availabilityId);
      if (!deleted) {
        res.status(404).json({ error: 'Availability not found' });
        return;
      }

      res.status(200).json({ message: 'Availability deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  public getAvailableSlots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User ID is required' });
        return;
      }

      const { startDate, endDate, duration, timezone } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }

      const slots = await this.availabilityService.getAvailableSlots(
        userId,
        new Date(startDate as string),
        new Date(endDate as string),
        duration ? parseInt(duration as string, 10) : undefined,
        timezone as string
      );

      res.status(200).json({ data: slots, message: 'Available slots retrieved successfully' });
    } catch (error) {
      next(error);
    }
  };

  public checkAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId || req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User ID is required' });
        return;
      }

      const { startTime, endTime, timezone } = req.query;

      if (!startTime || !endTime) {
        res.status(400).json({ error: 'Start time and end time are required' });
        return;
      }

      const isAvailable = await this.availabilityService.checkAvailability(
        userId,
        new Date(startTime as string),
        new Date(endTime as string),
        timezone as string
      );

      res.status(200).json({ data: { available: isAvailable }, message: 'Availability checked successfully' });
    } catch (error) {
      next(error);
    }
  };
}

export default new AvailabilityController();