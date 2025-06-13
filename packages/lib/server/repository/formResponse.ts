import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

interface RecordFormResponseInput {
  formId: string;
  response: Record<string, any>;
  chosenRouteId: string | null;
}

export class RoutingFormResponseRepository {
  private static newBookingResponseSelect = {
    id: true,
    response: true,
    form: {
      select: {
        routes: true,
        fields: true,
      },
    },
    chosenRouteId: true,
  };

  private static generateCreateFormResponseData(input: RecordFormResponseInput) {
    return {
      formId: input.formId,
      response: input.response,
      chosenRouteId: input.chosenRouteId,
    };
  }

  static async recordFormResponse(input: RecordFormResponseInput) {
    return await prisma.app_RoutingForms_FormResponse.create({
      data: this.generateCreateFormResponseData(input),
    });
  }

  static async recordQueuedFormResponse(input: RecordFormResponseInput) {
    return await prisma.app_RoutingForms_QueuedFormResponse.create({
      data: this.generateCreateFormResponseData(input),
    });
  }

  static async getFormResponseForNewBooking(routingFormResponseId: number) {
    return await prisma.app_RoutingForms_FormResponse.findUnique({
      where: {
        id: routingFormResponseId,
      },
      select: this.newBookingResponseSelect,
    });
  }

  static async writeQueuedFormResponseToFormResponse(queuedFormResponseId: number, bookerEmail: string) {
    const log = logger.getSubLogger({
      prefix: [`[writeQueuedFormResponseToFormResponse]: ${bookerEmail}`],
    });

    const queuedResponse = await prisma.app_RoutingForms_QueuedFormResponse.findUnique({
      where: {
        id: queuedFormResponseId,
      },
    });
    if (!queuedResponse) {
      log.error("Failed to find queued form response");
      return;
    }

    try {
      const result = await prisma.$transaction([
        prisma.app_RoutingForms_QueuedFormResponse.delete({
          where: {
            id: queuedFormResponseId,
          },
        }),
        prisma.app_RoutingForms_FormResponse.create({
          data: this.generateCreateFormResponseData(queuedResponse),
          select: this.newBookingResponseSelect,
        }),
      ]);
      return result[1];
    } catch (error) {
      logger.error("Failed to write queued form response to form response", error);
      throw new Error("Failed to write queued form response to form response");
    }
  }
}
