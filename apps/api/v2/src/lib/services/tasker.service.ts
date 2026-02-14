import { Injectable } from "@nestjs/common";

import { getTasker, type Tasker } from "@calcom/platform-libraries";

@Injectable()
export class TaskerService {
  private readonly tasker: Tasker;

  constructor() {
    this.tasker = getTasker();
  }

  getTasker(): Tasker {
    return this.tasker;
  }
}
