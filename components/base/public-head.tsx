import { PageHead } from "./head";
import React, { FC, ReactNode } from "react";

type PublicHeadProps = {
  title: string;
  name: string;
  avatar: string;
  rescheduleUid?: string | string[] | undefined;
  description?: string;
};

const metaInfo = (type: string, name: string): ReactNode => {
  return (
    <>
      <meta property={`${type}:url`} content="https://calendso/" />
      <meta property={`${type}:title`} content={`Meet ${name} via Calendso`} />
    </>
  );
};

const metaDescription = (type: string, name: string, description?: string): ReactNode => {
  if (description === undefined) {
    return <meta property={`${type}:description`} content={`Book a time with ${name}`} />;
  }
  return <meta property={`${type}:description`} content={description} />;
};

const metaImage = (type: string, name: string, avatar: string, description?: string): ReactNode => {
  return (
    <meta
      property={`${type}:image`}
      content={
        "https://og-image-one-pi.vercel.app/" +
        encodeURIComponent(
          "Meet **" + name + "** <br>" + `${description === undefined ? "" : description}`
        ).replace(/'/g, "%27") +
        ".png?md=1&images=https%3A%2F%2Fcalendso.com%2Fcalendso-logo-white.svg&images=" +
        encodeURIComponent(avatar)
      }
    />
  );
};

export const PublicHead: FC<PublicHeadProps> = (props) => {
  const { title, name, avatar, description, rescheduleUid = null } = props;

  let content = (
    <>
      <meta name="title" content={`Meet ${name} via Calendso`} />
      <meta name="description" content={`Book a time with ${name}`} />

      <meta property="og:type" content="website" />
      {metaInfo("og", name)}
      {metaDescription("og", name)}
      {metaImage("og", name, avatar)}

      <meta property="twitter:card" content="summary_large_image" />
      {metaInfo("twitter", name)}
      {metaDescription("twitter", name)}
      {metaImage("twitter", name, avatar)}
    </>
  );

  if (rescheduleUid) {
    content = (
      <>
        <meta name="title" content={`Meet ${name} via Calendso`} />
        <meta name="description" content={description} />

        <meta property="og:type" content="website" />
        {metaInfo("og", name)}
        {metaDescription("og", name, description)}
        {metaImage("og", name, avatar, description)}

        <meta property="twitter:card" content="summary_large_image" />
        {metaInfo("twitter", name)}
        {metaDescription("twitter", name, description)}
        {metaImage("twitter", name, avatar, description)}
      </>
    );
  }

  return <PageHead title={title}>{content}</PageHead>;
};

PublicHead.defaultProps = {};
