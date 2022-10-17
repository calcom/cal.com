import React from "react";

// Ensures tw prop is typed.
declare module "react" {
  interface HTMLAttributes<T> {
    tw?: string;
  }
}

const urlPrefix = process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBAPP_URL;

export interface MeetingImageProps {
  name: string;
  title: string;
  users: string[];
}

export interface AppImageProps {
  name: string;
  description: string;
  slug: string;
}

export const constructMeetingImage = ({ title, name, users }: MeetingImageProps): string => {
  return [
    `?type=meeting`,
    `&title=${encodeURIComponent(title)}`,
    `&name=${encodeURIComponent(name)}`,
    `${users.map((username) => `&users=${encodeURIComponent(username)}`)}`,
    // Joinining a multiline string for readability.
  ].join("");
};

export const constructAppImage = ({ name, slug, description }: AppImageProps): string => {
  return [
    `?type=app`,
    `&name=${encodeURIComponent(name)}`,
    `&slug=${encodeURIComponent(slug)}`,
    `&description=${encodeURIComponent(description)}`,
    // Joinining a multiline string for readability.
  ].join("");
};

const Wrapper = ({
  children,
  variant = "light",
}: {
  children: React.ReactNode;
  variant?: "light" | "dark";
}) => (
  <div tw="flex w-full h-full">
    <img
      tw="flex absolute left-0 top-0 w-full h-[110%]"
      src={`${urlPrefix}/social-bg-${variant}.jpg`}
      alt="background"
      width="1200"
      height="300"
    />
    <div tw="flex flex-col w-full h-full items-start justify-center max-w-[80%] mx-auto">{children}</div>
  </div>
);

export const Meeting = ({ name, title, users }: MeetingImageProps) => (
  <Wrapper>
    <div tw="min-h-[500px] flex flex-col justify-start">
      <div
        tw="flex items-center justify-center font-regular"
        style={{ fontFamily: "cal", fontWeight: "300" }}>
        <img src={`${urlPrefix}/cal-logo-word-black.svg`} width="300" alt="Logo" />
        <div tw="font-bold text-black text-[80px] mx-8">/</div>
        <div tw="flex flex-row">
          {users.map((username) => (
            <img
              tw="rounded-full mr-[-36px] border-[6px] border-black"
              key={username}
              src={`https://cal.com/${username}/avatar.png`}
              alt="Profile picture"
              width="200"
            />
          ))}
        </div>
      </div>
      <div tw="flex text-[54px] w-full flex-col text-black mt-auto">
        <div tw="flex">
          Meet <strong tw="flex ml-4 font-medium">{name}</strong>
        </div>
        <div tw="flex">{title}</div>
      </div>
    </div>
  </Wrapper>
);

export const App = ({ name, description, slug }: AppImageProps) => (
  <Wrapper variant="dark">
    <img
      src={`${urlPrefix}/cal-logo-word-dark.svg`}
      width="150"
      alt="Logo"
      tw="absolute right-[40px] top-[40px]"
    />
    <div tw="flex items-center justify-center">
      <div tw="flex items-center justify-center flex-row-reverse bg-[#1E1F23] p-8 rounded-md w-[172px] h-[172px]">
        <img src={`${urlPrefix}${slug}`} alt="App icon" width="125" />
      </div>
    </div>
    <div tw="flex mt-10 text-center items-center justify-center w-[80%] flex-col text-[#f9fafb]">
      <div tw="flex text-[56px] mb-6" style={{ fontFamily: "cal", fontWeight: "300" }}>
        {name}
      </div>
      <div tw="flex text-[40px] font-[inter]">{description}</div>
    </div>
  </Wrapper>
);
