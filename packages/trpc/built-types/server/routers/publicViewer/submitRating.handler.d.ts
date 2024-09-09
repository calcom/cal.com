import type { TSubmitRatingInputSchema } from "./submitRating.schema";
type SubmitRatingOptions = {
    input: TSubmitRatingInputSchema;
};
export declare const submitRatingHandler: ({ input }: SubmitRatingOptions) => Promise<void>;
export default submitRatingHandler;
