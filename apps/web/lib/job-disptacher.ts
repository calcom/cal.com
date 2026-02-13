import { JobDispatcher } from "@calid/job-dispatcher";
import { queueRegistry, queueEventsRegistry } from "@calid/queue";

const dispatcher = new JobDispatcher({ queueRegistry, queueEventsRegistry });
export default dispatcher;
