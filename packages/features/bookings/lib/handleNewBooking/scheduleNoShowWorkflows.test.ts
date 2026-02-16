import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Workflow } from "@calcom/types/Workflow";
import { scheduleNoShowTriggers } from "./scheduleNoShowTriggers";
import tasker from "@calcom/features/tasker";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { DailyLocationType } from "@calcom/app-store/constants";

vi.mock("@calcom/features/tasker", () => ({
    default: {
        create: vi.fn(),
    },
}));

vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({
    default: vi.fn().mockResolvedValue([]),
}));

describe("scheduleNoShowTriggers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should schedule tasks for no-show workflows", async () => {
        const booking = {
            startTime: new Date(),
            id: 1,
            location: DailyLocationType,
            uid: "uid-1",
        };
        const workflows = [
            {
                id: 1,
                trigger: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
            },
            {
                id: 2,
                trigger: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
            },
        ];

        await scheduleNoShowTriggers({
            booking,
            organizerUser: { id: 1 },
            eventTypeId: 1,
            workflows: workflows as unknown as Workflow[],
        });

        expect(tasker.create).toHaveBeenCalledWith(
            "triggerNoShow",
            expect.objectContaining({
                triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
                workflow: workflows[0],
            })
        );

        expect(tasker.create).toHaveBeenCalledWith(
            "triggerNoShow",
            expect.objectContaining({
                triggerEvent: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
                workflow: workflows[1],
            })
        );
    });
});
