export enum HTTPMethod {
  CONNECT = "CONNECT",
  OPTIONS = "OPTIONS",
  POST = "POST",
  GET = "GET",
  HEAD = "HEAD",
  PUT = "PUT",
  PATCH = "PATCH",
  LINK = "LINK",
  UNLINK = "UNLINK",
  DELETE = "DELETE",
  TRACE = "TRACE",
}

export enum BodyEncoding {
  "utf-8",
  "base64",
}

export enum TransactionTestStatus {
  "pass",
  "fail",
  "skip",
}

export interface Transaction {
  id: string;
  name: string;
  origin: TransactionOrigin;
  host: string;
  port: number;
  protocol: "http:" | "https:";
  fullPath: string;
  request: TransactionRequest;
  expected: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    bodySchema: Record<string, any>;
  };
  real: {
    statusCode: string;
    headers: Record<string, string>;
    body: string;
    bodyEncoding: BodyEncoding;
  };
  skip: boolean;
  fail: boolean;

  test: TransactionTest;
}

export interface TransactionRequest {
  method: HTTPMethod;
  url: string;
  body?: string;
  bodyEncoding?: BodyEncoding;
  headers?: Record<string, string>;
}

export interface TransactionOrigin {
  filename: string;
  apiName: string;
  resourceGroupName: string;
  resourceName: string;
  actionName: string;
  exampleName: string;
}

export interface TransactionTest {
  start: Date;
  end: Date;
  duration: number;
  startedAt: number;
  title: string;
  request: TransactionRequest;
  actual: any;
  expected: any;
  status: TransactionTestStatus;
  message: string;
  results: any;
  valid: boolean;
  origin: TransactionOrigin;
}
