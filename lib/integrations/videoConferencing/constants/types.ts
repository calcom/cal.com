import DailyVideoConferencingService from "@lib/integrations/videoConferencing/services/DailyVideoConferencingService";
import ZoomVideoConferencingService from "@lib/integrations/videoConferencing/services/ZoomVideoConferencingService";

export type VideoConferencingServiceType =
  | typeof ZoomVideoConferencingService
  | typeof DailyVideoConferencingService;
