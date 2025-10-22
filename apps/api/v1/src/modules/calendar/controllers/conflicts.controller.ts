import { Request, Response, NextFunction } from 'express';
import { ConflictsService } from '../services/conflicts.service';
import { ApiError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';

export class ConflictsController {
  private conflictsService: ConflictsService;

  constructor() {
    this.conflictsService = new ConflictsService();
  }

  /**
   * Check for conflicts in a time range
   * GET /api/v1/calendar/conflicts/check
   */
  checkConflicts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { calendarId, startTime, endTime, excludeEventId } = req.query;

      if (!calendarId || !startTime || !endTime) {
        throw new ApiError(400, 'Missing required parameters: calendarId, startTime, endTime');
      }

      const conflicts = await this.conflictsService.checkConflicts({
        calendarId: calendarId as string,
        startTime: new Date(startTime as string),
        endTime: new Date(endTime as string),
        excludeEventId: excludeEventId as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: {
          hasConflicts: conflicts.length > 0,
          conflicts,
          count: conflicts.length,
        },
      });
    } catch (error) {
      logger.error('Error checking conflicts:', error);
      next(error);
    }
  };

  /**
   * Get all conflicts for a calendar
   * GET /api/v1/calendar/conflicts/:calendarId
   */
  getCalendarConflicts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { calendarId } = req.params;
      const { startDate, endDate } = req.query;

      if (!calendarId) {
        throw new ApiError(400, 'Calendar ID is required');
      }

      const conflicts = await this.conflictsService.getCalendarConflicts({
        calendarId,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.status(200).json({
        success: true,
        data: {
          conflicts,
          count: conflicts.length,
        },
      });
    } catch (error) {
      logger.error('Error getting calendar conflicts:', error);
      next(error);
    }
  };

  /**
   * Resolve a conflict
   * POST /api/v1/calendar/conflicts/:conflictId/resolve
   */
  resolveConflict = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { conflictId } = req.params;
      const { resolution, eventIdToKeep, eventIdToModify } = req.body;

      if (!conflictId) {
        throw new ApiError(400, 'Conflict ID is required');
      }

      if (!resolution) {
        throw new ApiError(400, 'Resolution strategy is required');
      }

      const result = await this.conflictsService.resolveConflict({
        conflictId,
        resolution,
        eventIdToKeep,
        eventIdToModify,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Conflict resolved successfully',
      });
    } catch (error) {
      logger.error('Error resolving conflict:', error);
      next(error);
    }
  };

  /**
   * Get conflict suggestions
   * GET /api/v1/calendar/conflicts/:conflictId/suggestions
   */
  getConflictSuggestions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { conflictId } = req.params;

      if (!conflictId) {
        throw new ApiError(400, 'Conflict ID is required');
      }

      const suggestions = await this.conflictsService.getConflictSuggestions(conflictId);

      res.status(200).json({
        success: true,
        data: {
          suggestions,
        },
      });
    } catch (error) {
      logger.error('Error getting conflict suggestions:', error);
      next(error);
    }
  };

  /**
   * Batch check conflicts for multiple events
   * POST /api/v1/calendar/conflicts/batch-check
   */
  batchCheckConflicts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { events } = req.body;

      if (!events || !Array.isArray(events) || events.length === 0) {
        throw new ApiError(400, 'Events array is required and must not be empty');
      }

      const results = await this.conflictsService.batchCheckConflicts(events);

      res.status(200).json({
        success: true,
        data: {
          results,
          totalChecked: events.length,
          totalConflicts: results.filter(r => r.hasConflicts).length,
        },
      });
    } catch (error) {
      logger.error('Error batch checking conflicts:', error);
      next(error);
    }
  };

  /**
   * Get conflict statistics for a calendar
   * GET /api/v1/calendar/conflicts/:calendarId/stats
   */
  getConflictStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { calendarId } = req.params;
      const { startDate, endDate } = req.query;

      if (!calendarId) {
        throw new ApiError(400, 'Calendar ID is required');
      }

      const stats = await this.conflictsService.getConflictStats({
        calendarId,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting conflict stats:', error);
      next(error);
    }
  };
}