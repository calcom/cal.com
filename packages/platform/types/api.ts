export type ApiSuccessResponse<T> = { status: "success"; data: T };

export type ApiErrorResponse<E> = { status: "error"; error: E };

export type ApiResponse<T, E> = ApiErrorResponse<E> | ApiSuccessResponse<T>;
