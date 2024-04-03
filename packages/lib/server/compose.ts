/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

type ExtendableRequest<T> = T extends NextApiRequest ? T : NextApiRequest;
type ExtendableResponse<T, Data = any> = T extends NextApiResponse ? T : NextApiResponse<Data>;

export type Handler<Req = NextApiRequest, Res = NextApiResponse, Data = any> = (
  req: ExtendableRequest<Req>,
  res: ExtendableResponse<Res, Data>
) => void | Promise<void>;

type ComposeHandlers<Req, Res = NextApiResponse, Data = any> = Array<
  (handler: Handler<Req, Res, Data>) => Handler<Req, Res, Data>
>;

/**
 * Composes multiple API handlers into one.
 * Stripped down version of `next-api-compose`.
 * @see https://github.com/neg4n/next-api-compose
 * @param {ComposeHandlers} chain Array of handlers to run by order.
 * @param {NextApiHandler} handler The final API handler.
 * @returns Single composed handler.
 */
export const compose =
  <Req, Res = NextApiResponse, Data = any>(
    chain: ComposeHandlers<Req, Res>,
    handler: Handler<Req, Res, Data>
  ) =>
  (req: ExtendableRequest<Req>, res: ExtendableResponse<Res, Data>) =>
    chain.length === 0
      ? handler(req, res)
      : chain.reduceRight<Handler<Req, Res, Data>>(
          (prevHandler, currentHandler) => async (req, res) => {
            await currentHandler(prevHandler)(req, res);
          },
          handler
        )(req, res);
