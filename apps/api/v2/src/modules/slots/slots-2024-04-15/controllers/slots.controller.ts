import {
  SUCCESS_STATUS,
  VERSION_2024_04_15,
  VERSION_2024_06_11,
  VERSION_2024_06_14,
  VERSION_2024_08_13,
} from "@calcom/platform-constants";
import { TRPCError } from "@calcom/platform-libraries";
import {
  ApiResponse,
  GetAvailableSlotsInput_2024_04_15,
  RemoveSelectedSlotInput_2024_04_15,
  ReserveSlotInput_2024_04_15,
} from "@calcom/platform-types";
import { BadRequestException, Body, Controller, Delete, Get, Post, Query, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiExcludeController as DocsExcludeController,
} from "@nestjs/swagger";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { TRPC_ERROR_CODE, TRPC_ERROR_MAP, TRPCErrorCode } from "@/filters/trpc-exception.filter";
import { AvailableSlotsService } from "@/lib/services/available-slots.service";
import { SlotsService_2024_04_15 } from "@/modules/slots/slots-2024-04-15/services/slots.service";
import type { RangeSlots, TimeSlots } from "@/modules/slots/slots-2024-04-15/services/slots-output.service";
import { SlotsOutputService_2024_04_15 } from "@/modules/slots/slots-2024-04-15/services/slots-output.service";
import { SlotsWorkerService_2024_04_15 } from "@/modules/slots/slots-2024-04-15/services/slots-worker.service";

@Controller({
  path: "/v2/slots",
  version: [VERSION_2024_04_15, VERSION_2024_06_11, VERSION_2024_06_14, VERSION_2024_08_13],
})
@DocsExcludeController(true)
export class SlotsController_2024_04_15 {
  constructor(
    private readonly slotsService: SlotsService_2024_04_15,
    private readonly config: ConfigService,
    private readonly slotsOutputService: SlotsOutputService_2024_04_15,
    private readonly slotsWorkerService: SlotsWorkerService_2024_04_15,
    private readonly availableSlotsService: AvailableSlotsService
  ) {}

  @Post("/reserve")
  @ApiCreatedResponse({
    description: "Successful response returning uid of reserved slot.",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "success" },
        data: {
          type: "object",
          properties: {
            uid: { type: "string", example: "e2a7bcf9-cc7b-40a0-80d3-657d391775a6" },
          },
        },
      },
    },
  })
  @ApiOperation({ summary: "Reserve a slot" })
  async reserveSlot(
    @Body() body: ReserveSlotInput_2024_04_15,
    @Res({ passthrough: true }) res: ExpressResponse,
    @Req() req: ExpressRequest
  ): Promise<ApiResponse<string>> {
    const uid = await this.slotsService.reserveSlot(body, req.cookies?.uid);

    res.cookie("uid", uid);
    return {
      status: SUCCESS_STATUS,
      data: uid,
    };
  }

  @Delete("/selected-slot")
  @ApiOkResponse({
    description: "Response deleting reserved slot by uid.",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "success" },
      },
    },
  })
  @ApiOperation({ summary: "Delete a selected slot" })
  async deleteSelectedSlot(
    @Query() params: RemoveSelectedSlotInput_2024_04_15,
    @Req() req: ExpressRequest
  ): Promise<ApiResponse> {
    const uid = req.cookies?.uid || params.uid;

    await this.slotsService.deleteSelectedslot(uid);

    return {
      status: SUCCESS_STATUS,
    };
  }

  @Get("/available")
  @ApiOkResponse({
    description: "Available time slots retrieved successfully",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "success" },
        data: {
          type: "object",
          properties: {
            slots: {
              type: "object",
              additionalProperties: {
                type: "array",
                items: {
                  type: "object",
                  oneOf: [
                    {
                      properties: {
                        time: {
                          type: "string",
                          format: "date-time",
                          example: "2024-09-25T08:00:00.000Z",
                        },
                      },
                    },
                    {
                      properties: {
                        startTime: {
                          type: "string",
                          format: "date-time",
                          example: "2024-09-25T08:00:00.000Z",
                        },
                        endTime: {
                          type: "string",
                          format: "date-time",
                          example: "2024-09-25T08:30:00.000Z",
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      example: {
        status: "success",
        data: {
          slots: {
            // Default format (when slotFormat is 'time' or not provided)
            "2024-09-25": [{ time: "2024-09-25T08:00:00.000Z" }, { time: "2024-09-25T08:15:00.000Z" }],
            // Alternative format (when slotFormat is 'range')
            "2024-09-26": [
              {
                startTime: "2024-09-26T08:00:00.000Z",
                endTime: "2024-09-26T08:30:00.000Z",
              },
              {
                startTime: "2024-09-26T08:15:00.000Z",
                endTime: "2024-09-26T08:45:00.000Z",
              },
            ],
          },
        },
      },
    },
  })
  @ApiOperation({ summary: "Get available slots" })
  async getAvailableSlots(
    @Query() query: GetAvailableSlotsInput_2024_04_15,
    @Req() req: ExpressRequest
  ): Promise<ApiResponse<{ slots: TimeSlots["slots"] | RangeSlots["slots"] }>> {
    try {
      const isTeamEvent =
        query.isTeamEvent ?? (await this.slotsService.checkIfIsTeamEvent(query.eventTypeId));

      // Do not use workers in E2E, not supported by TS-JEST
      // Or if explicitly disabled via specific env var
      const shouldUseAvailableSlotsService =
        this.config.get<boolean>("e2e") || !this.config.get<boolean>("enableSlotsWorkers");
      const slotsArgs = {
        input: {
          ...query,
          isTeamEvent,
        },
        ctx: {
          req,
        },
      };

      let availableSlots: TimeSlots;

      if (shouldUseAvailableSlotsService) {
        availableSlots = await this.availableSlotsService.getAvailableSlots(slotsArgs);
      } else {
        availableSlots = await this.slotsWorkerService.getAvailableSlotsInWorker(slotsArgs);
      }

      const { slots } = await this.slotsOutputService.getOutputSlots(
        availableSlots,
        query.duration,
        query.eventTypeId,
        query.slotFormat,
        query.timeZone
      );

      return {
        data: {
          slots,
        },
        status: SUCCESS_STATUS,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Invalid time range given")) {
          throw new BadRequestException(
            "Invalid time range given - check the 'startTime' and 'endTime' query parameters."
          );
        }

        if (TRPC_ERROR_MAP[error.message as keyof typeof TRPC_ERROR_CODE]) {
          throw new TRPCError({ code: error.message as TRPCErrorCode });
        }
      }

      throw error;
    }
  }
}
