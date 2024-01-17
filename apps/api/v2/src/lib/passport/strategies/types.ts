export class BaseStrategy {
  success!: (user: unknown) => void;
  error!: (error: Error) => void;
}
