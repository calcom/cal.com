import type { Response as BaseResponse } from "express";

import { ApiResponse } from "@calcom/platform-types";

export type Response<T = unknown> = BaseResponse<ApiResponse<T>>;
