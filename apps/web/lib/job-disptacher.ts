import { JobDispatcher } from "@calid/job-dispatcher";
import { queueRegistry } from "@calid/queue";

const dispatcher = new JobDispatcher({ queueRegistry });
export default dispatcher;
