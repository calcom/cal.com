import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { determineOptOutType } from "../lib/reminders/providers/twilioProvider";
import { WorkflowOptOutContactRepository } from "../lib/repository/workflowOptOutContact";
import { WorkflowOptOutService } from "../lib/service/workflowOptOutService";

const handleSMSResponse = async (request: NextRequest) => {
  try {
    const optOutResult = await determineOptOutType(request);
    if ("error" in optOutResult) {
      return NextResponse.json({ message: optOutResult.error }, { status: 400 });
    }

    if (optOutResult.optOutStatus) {
      await WorkflowOptOutService.optOutPhoneNumber(optOutResult.phoneNumber);
    } else {
      await WorkflowOptOutContactRepository.removePhoneNumber(optOutResult.phoneNumber);
    }

    return NextResponse.json({ message: "Opt status updated successfully" }, { status: 200 });
  } catch (e) {
    console.error("Error processing user response webhook:", e);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};

export default handleSMSResponse;
