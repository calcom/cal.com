/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { workflows } from "@calcom/web/lib/templates/workflows";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession({ req, res });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  try {
    const { workflowId, slug } = req.body;

    if (!workflowId && !slug) {
      return res
        .status(400)
        .json({ message: "Missing required fields: Either workflowId or slug must be provided" });
    }

    const templateWorkflow = workflows.find((form: any) =>
      workflowId ? form.id === workflowId : slugify(form.name) === slug
    );

    if (!templateWorkflow) {
      console.error("Template search params:", { workflowId, slug });
      console.error(
        "Available templates:",
        workflows.map((w) => ({ id: w.id, name: w.name }))
      );
      return res.status(404).json({ message: "Template workflow not found" });
    }

    const newWorkflow = await prisma.workflow.create({
      data: {
        name: templateWorkflow.name,
        userId: session.user.id,
        steps: {
          create: Array.isArray(templateWorkflow.template.steps)
            ? templateWorkflow.template.steps.map((step) => ({
                stepNumber: step.stepNumber,
                action: "EMAIL_ATTENDEE",
                template: "CUSTOM",
                emailSubject: step.emailSubject || "",
                reminderBody: step.reminderBody || "",
                includeCalendarEvent: step.includeCalendarEvent ?? false,
              }))
            : [],
        },
        trigger: templateWorkflow.template.trigger as
          | "BEFORE_EVENT"
          | "AFTER_EVENT"
          | "EVENT_CANCELLED"
          | "NEW_EVENT"
          | "RESCHEDULE_EVENT"
          | "AFTER_HOSTS_CAL_VIDEO_NO_SHOW"
          | "AFTER_GUESTS_CAL_VIDEO_NO_SHOW",
        time: templateWorkflow.template.time || 0,
      },
    });

    return res.status(200).json(newWorkflow);
  } catch (error) {
    console.error("Error creating workflow:", {
      error,
      body: req.body,
      userId: session.user.id,
    });
    return res.status(500).json({
      message: "Error creating workflow",
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined,
    });
  }
}
