export interface AdminAction<TInput, TResult> {
  execute(input: TInput): Promise<TResult>;
}
