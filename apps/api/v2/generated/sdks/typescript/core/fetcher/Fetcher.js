"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetcher = void 0;
const form_data_1 = __importDefault(require("form-data"));
const qs_1 = __importDefault(require("qs"));
const INITIAL_RETRY_DELAY = 1;
const MAX_RETRY_DELAY = 60;
const DEFAULT_MAX_RETRIES = 2;
function fetcherImpl(args) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const headers = {};
        if (args.body !== undefined && args.contentType != null) {
            headers["Content-Type"] = args.contentType;
        }
        if (args.headers != null) {
            for (const [key, value] of Object.entries(args.headers)) {
                if (value != null) {
                    headers[key] = value;
                }
            }
        }
        const url = Object.keys((_a = args.queryParameters) !== null && _a !== void 0 ? _a : {}).length > 0
            ? `${args.url}?${qs_1.default.stringify(args.queryParameters, { arrayFormat: "repeat" })}`
            : args.url;
        let body = undefined;
        if (args.body instanceof form_data_1.default) {
            // @ts-expect-error
            body = args.body;
        }
        else {
            body = JSON.stringify(args.body);
        }
        const fetchFn = typeof fetch == "function" ? fetch : require("node-fetch");
        const makeRequest = () => __awaiter(this, void 0, void 0, function* () {
            const controller = new AbortController();
            let abortId = undefined;
            if (args.timeoutMs != null) {
                abortId = setTimeout(() => controller.abort(), args.timeoutMs);
            }
            const response = yield fetchFn(url, {
                method: args.method,
                headers,
                body,
                signal: controller.signal,
                credentials: args.withCredentials ? "include" : undefined,
            });
            if (abortId != null) {
                clearTimeout(abortId);
            }
            return response;
        });
        try {
            let response = yield makeRequest();
            for (let i = 0; i < ((_b = args.maxRetries) !== null && _b !== void 0 ? _b : DEFAULT_MAX_RETRIES); ++i) {
                if (response.status === 408 ||
                    response.status === 409 ||
                    response.status === 429 ||
                    response.status >= 500) {
                    const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(i, 2), MAX_RETRY_DELAY);
                    yield new Promise((resolve) => setTimeout(resolve, delay));
                    response = yield makeRequest();
                }
                else {
                    break;
                }
            }
            let body;
            if (response.body != null && args.responseType === "blob") {
                body = yield response.blob();
            }
            else if (response.body != null && args.responseType === "streaming") {
                body = response.body;
            }
            else {
                const text = yield response.text();
                if (text.length > 0) {
                    try {
                        body = JSON.parse(text);
                    }
                    catch (err) {
                        return {
                            ok: false,
                            error: {
                                reason: "non-json",
                                statusCode: response.status,
                                rawBody: text,
                            },
                        };
                    }
                }
            }
            if (response.status >= 200 && response.status < 400) {
                return {
                    ok: true,
                    body: body,
                    headers: response.headers,
                };
            }
            else {
                return {
                    ok: false,
                    error: {
                        reason: "status-code",
                        statusCode: response.status,
                        body,
                    },
                };
            }
        }
        catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                return {
                    ok: false,
                    error: {
                        reason: "timeout",
                    },
                };
            }
            else if (error instanceof Error) {
                return {
                    ok: false,
                    error: {
                        reason: "unknown",
                        errorMessage: error.message,
                    },
                };
            }
            return {
                ok: false,
                error: {
                    reason: "unknown",
                    errorMessage: JSON.stringify(error),
                },
            };
        }
    });
}
exports.fetcher = fetcherImpl;
