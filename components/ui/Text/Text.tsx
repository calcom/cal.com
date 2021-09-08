import React from "react";
import Body from "./Body";
import Caption from "./Caption";
import Caption2 from "./Caption2";
import Footnote from "./Footnote";
import Headline from "./Headline";
import Largetitle from "./Largetitle";
import Overline from "./Overline";
import Subheadline from "./Subheadline";
import Subtitle from "./Subtitle";
import Title from "./Title";
import Title2 from "./Title2";
import Title3 from "./Title3";

type Props = {
  variant?:
    | "overline"
    | "caption"
    | "body"
    | "caption2"
    | "footnote"
    | "headline"
    | "largetitle"
    | "subheadline"
    | "subtitle"
    | "title"
    | "title2"
    | "title3";
  children: any;
  text?: string;
  tx?: string;
  className?: string;
};

export type TextProps = {
  children: any;
  text?: string;
  tx?: string;
  className?: string;
};

/**
 * static let largeTitle: Font
 * A font with the large title text style.
 *
 * static let title: Font
 * A font with the title text style.
 *
 * static let title2: Font
 * Create a font for second level hierarchical headings.
 *
 * static let title3: Font
 * Create a font for third level hierarchical headings.
 *
 * static let headline: Font
 * A font with the headline text style.
 *
 * static let subheadline: Font
 * A font with the subheadline text style.
 *
 * static let body: Font
 * A font with the body text style.
 *
 * static let callout: Font
 * A font with the callout text style.
 *
 * static let caption: Font
 * A font with the caption text style.
 *
 * static let caption2: Font
 * Create a font with the alternate caption text style.
 *
 * static let footnote: Font
 * A font with the footnote text style.
 */

const Text: React.FunctionComponent<Props> = (props: Props) => {
  switch (props?.variant) {
    case "overline":
      return (
        <Overline text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Overline>
      );
    case "body":
      return (
        <Body text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Body>
      );
    case "caption":
      return (
        <Caption text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Caption>
      );
    case "caption2":
      return (
        <Caption2 text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Caption2>
      );
    case "footnote":
      return (
        <Footnote text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Footnote>
      );
    case "headline":
      return (
        <Headline text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Headline>
      );
    case "largetitle":
      return (
        <Largetitle text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Largetitle>
      );
    case "subheadline":
      return (
        <Subheadline text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Subheadline>
      );
    case "subtitle":
      return (
        <Subtitle text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Subtitle>
      );
    case "title":
      return (
        <Title text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Title>
      );
    case "title2":
      return (
        <Title2 text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Title2>
      );
    case "title3":
      return (
        <Title3 text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Title3>
      );
    default:
      return (
        <Body text={props?.text} tx={props?.tx} className={props?.className}>
          {props.children}
        </Body>
      );
  }
};

export default Text;
