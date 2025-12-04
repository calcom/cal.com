import { Injectable } from "@nestjs/common";

import type { CalMeetingSession } from "@calcom/platform-libraries/conferencing";

@Injectable()
export class CalVideoOutputService {
  getOutputVideoSessions(sessions: CalMeetingSession[]) {
    return sessions.map((session) => ({
      id: session.id,
      room: session.room,
      startTime: session.start_time,
      duration: session.duration,
      ongoing: session.ongoing,
      maxParticipants: session.max_participants,
      participants: session.participants.map((participant) => ({
        userId: participant.user_id,
        userName: participant.user_name,
        joinTime: participant.join_time,
        duration: participant.duration,
      })),
    }));
  }
}
