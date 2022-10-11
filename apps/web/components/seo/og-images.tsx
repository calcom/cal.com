import React from "react";

const urlPrefix = process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBAPP_URL;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <div tw="flex w-full h-full">
    <img
      tw="flex absolute left-0 top-0 w-full h-[110%]"
      src={`${urlPrefix}/bg-grid.jpg`}
      alt="background"
      width="1200"
      height="300"
    />
    <div tw="flex flex-col w-full h-full items-center justify-center">{children}</div>
  </div>
);

export interface MeetingImageProps {
  name: string;
  title: string;
  users: string[];
}

export const Meeting = ({ name, title, users }: MeetingImageProps) => (
  <Wrapper>
    <div tw="flex items-center justify-center font-regular" style={{ fontFamily: "cal", fontWeight: "300" }}>
      <img src={`${urlPrefix}/cal-logo-word-dark.svg`} width="300" alt="Logo" />
      <div tw="font-bold text-[#f9fafb] text-[100px] mx-8">/</div>
      <div tw="flex flex-row-reverse">
        {/* We reverse the array because we aboce we also use flex-row-reverse.
        This makes sure the users are rendered in the correct order again, but with
        the added benefit of the first image being on top of the second, without
        needing to mess with z-index. */}
        {users.reverse().map((username) => (
          <img
            tw="rounded-full mr-[-120px]"
            key={username}
            src={`${urlPrefix}/${username}/avatar.png`}
            alt="Profile picture"
            width="200"
          />
        ))}
      </div>
    </div>
    <div tw="flex text-[72px] w-full flex-col p-8 text-[#f9fafb]">
      <div tw="flex">
        Meet <strong tw="flex font-bold ml-4">{name}</strong>
      </div>
      <div tw="flex text-[32px]">{title}</div>
    </div>
  </Wrapper>
);

export interface AppImageProps {
  name: string;
  description: string;
  slug: string;
}

export const App = ({ name, description, slug }: AppImageProps) => (
  <Wrapper>
    <img
      src={`${urlPrefix}/cal-logo-word-dark.svg`}
      width="150"
      alt="Logo"
      tw="absolute right-[40px] top-[40px]"
    />
    <div tw="flex items-center justify-center font-regular" style={{ fontFamily: "cal", fontWeight: "300" }}>
      <div tw="flex flex-row-reverse bg-white p-8 rounded-md">
        <img src={`${urlPrefix}${slug}`} alt="App icon" width="75" />
      </div>
    </div>
    <div tw="flex mt-8 items-center justify-center w-full flex-col p-8 text-[#f9fafb]">
      <div tw="flex text-[72px]">{name}</div>
      <div tw="flex text-[32px]">{description}</div>
    </div>
  </Wrapper>
);
