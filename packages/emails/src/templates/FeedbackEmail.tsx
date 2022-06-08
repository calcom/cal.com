import { BaseEmailHtml, Info } from "../components";

export interface Feedback {
  username: string;
  email: string;
  rating: string;
  comment: string;
}

export const FeedbackEmail = (props: Feedback & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => {
  return (
    <BaseEmailHtml subject="Feedback" title="Feedback">
      <Info label="Username" description={props.username} withSpacer />
      <Info label="Email" description={props.email} withSpacer />
      <Info label="Rating" description={props.rating} withSpacer />
      <Info label="Comment" description={props.comment} withSpacer />
    </BaseEmailHtml>
  );
};
