import { BaseEmailHtml, Info } from "../components";

export interface Feedback {
  userId: number;
  rating: string;
  comment: string;
}

export const FeedbackEmail = (props: Feedback & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => {
  return (
    <BaseEmailHtml subject="Feedback" title="Feedback">
      <Info label="User id" description={props.userId} withSpacer />
      <Info label="Rating" description={props.rating} withSpacer />
      <Info label="Comment" description={props.comment} withSpacer />
    </BaseEmailHtml>
  );
};
