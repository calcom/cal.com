export class ApiLogOutput {
  id: string;
  requestId: string;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  isError: boolean;
  timestamp: Date;
  errorMessage?: string;
}

export class ApiLogDetailOutput extends ApiLogOutput {
  path: string;
  queryParams?: any;
  requestHeaders?: any;
  requestBody?: any;
  responseBody?: any;
  responseHeaders?: any;
  errorStack?: string;
  errorCode?: string;
  userAgent?: string;
  ipAddress?: string;
}

export class ApiLogsListOutput {
  data: ApiLogOutput[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export class ApiLogsStatsOutput {
  totalCalls: number;
  errorCalls: number;
  errorRate: number;
  avgResponseTime: number;
}
