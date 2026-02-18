/* eslint-disable @typescript-eslint/no-explicit-any */
type GetSSRResult<TProps> =
  //
  { props: TProps } | { redirect: { destination: string; permanent: boolean } } | { notFound: boolean };

type GetSSRFn<TProps> = (...args: any[]) => Promise<GetSSRResult<TProps>>;

export type inferSSRProps<TFn extends GetSSRFn<any>> =
  TFn extends GetSSRFn<infer TProps> ? NonNullable<TProps> : never;
