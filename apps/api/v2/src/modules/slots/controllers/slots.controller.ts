import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { SlotsService } from "@/modules/slots/services/slots.service";
import { Query, Body, Controller, Get, Delete, Post, Req, Res } from "@nestjs/common";
import { ApiTags as DocsTags, ApiCreatedResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { Response as ExpressResponse, Request as ExpressRequest } from "express";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SlotFormat } from "@calcom/platform-enums";
import { getAvailableSlots } from "@calcom/platform-libraries";
import type { AvailableSlotsType } from "@calcom/platform-libraries";
import { RemoveSelectedSlotInput, ReserveSlotInput } from "@calcom/platform-types";
import { ApiResponse, GetAvailableSlotsInput } from "@calcom/platform-types";

@Controller({
  path: "/v2/slots",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Slots")
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

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
    @Body() body: ReserveSlotInput,
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
    @Query() params: RemoveSelectedSlotInput,
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
    @Query() query: GetAvailableSlotsInput,
    @Req() req: ExpressRequest
  ): Promise<ApiResponse<AvailableSlotsType>> {
    const isTeamEvent = await this.slotsService.checkIfIsTeamEvent(query.eventTypeId);
    const availableSlots = await getAvailableSlots({
      input: {
        ...query,
        isTeamEvent,
      },
      ctx: {
        req,
      },
    });

    const transformedSlots =
      query.slotFormat === SlotFormat.Range
        ? await this.slotsService.formatSlots(
            availableSlots,
            query.duration,
            query.eventTypeId,
            query.slotFormat
          )
        : availableSlots.slots;

    return {
      data: {
        slots: transformedSlots,
      },
      status: SUCCESS_STATUS,
    };
  }
}
