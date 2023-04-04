import React from "react";

import { CAL_URL, LOGO } from "./constants";

// Ensures tw prop is typed.
declare module "react" {
  interface HTMLAttributes<T> {
    tw?: string;
  }
}

export interface MeetingImageProps {
  title: string;
  profile: { name: string; image?: string | null };
  users?: { name: string; username: string }[];
}

export interface AppImageProps {
  name: string;
  description: string;
  slug: string;
}

export interface GenericImageProps {
  title: string;
  description: string;
}

export interface ScreenshotImageProps {
  image: string;
  /**
   * Fallback image to use if the image prop fails to load.
   */
  fallbackImage: string;
}

interface WrapperProps {
  children: React.ReactNode;
  variant?: "light" | "dark";
  rotateBackground?: boolean;
}

const joinMultipleNames = (names: string[] = []) => {
  const lastName = names.pop();
  return `${names.length > 0 ? `${names.join(", ")} & ${lastName}` : lastName}`;
};

/**
 * Test urls:
 * 1. 1 user http://localhost:3000/api/social/og/image?type=meeting&title=super%20long%20event%20title%20for%20testing%20purposes&meetingProfileName=Pro%20Example&meetingImage=http://localhost:3000/pro/avatar.png&names=Pro%20Example&usernames=pro
 * 2. Team event (collection), lot's of people, long title http://localhost:3000/api/social/og/image?type=meeting&title=Getting%20to%20know%20us%20and%20have%20a%20beer%20together&meetingProfileName=Seeded%20Team&names=Team%20Pro%20Example%202&names=Team%20Pro%20Example%203&names=Team%20Pro%20Example%204&names=Team%20Free%20Example&names=Team%20Pro%20Example&usernames=teampro2&usernames=teampro3&usernames=teampro4&usernames=teamfree&usernames=teampro
 * 3. Team event of 2 (collection), http://localhost:3000/api/social/og/image?type=meeting&title=Getting%20to%20know%20each%20other&meetingProfileName=Seeded%20Team&names=Team%20Pro%20Example%202&names=Team%20Pro%20Example%203&usernames=teampro2&usernames=teampro3
 * 4. Team event (round robin) http://localhost:3000/api/social/og/image?type=meeting&title=Round%20Robin%20Seeded%20Team%20Event&meetingProfileName=Seeded%20Team
 * 5. Dynamic collective (2 persons) http://localhost:3000/api/social/og/image?type=meeting&title=15min&meetingProfileName=Team%20Pro%20Example,%20Pro%20Example&names=Team%20Pro%20Example&names=Pro%20Example&usernames=teampro&usernames=pro
 */
export const constructMeetingImage = (
  { title, users = [], profile }: MeetingImageProps,
  encodeUri = true
): string => {
  const url = [
    `?type=meeting`,
    `&title=${encodeURIComponent(title)}`,
    `&meetingProfileName=${encodeURIComponent(profile.name)}`,
    profile.image && `&meetingImage=${encodeURIComponent(profile.image)}`,
    `${users.map((user) => `&names=${encodeURIComponent(user.name)}`).join("")}`,
    `${users.map((user) => `&usernames=${encodeURIComponent(user.username)}`).join("")}`,
    // Joining a multiline string for readability.
  ].join("");

  return encodeUri ? encodeURIComponent(url) : url;
};

/**
 * Test url:
 * http://localhost:3000/api/social/og/image?type=app&name=Huddle01&slug=/api/app-store/huddle01video/icon.svg&description=Huddle01%20is%20a%20new%20video%20conferencing%20software%20native%20to%20Web3%20and%20is%20comparable%20to%20a%20decentralized%20version%20of%20Zoom.%20It%20supports%20conversations%20for...
 */
export const constructAppImage = ({ name, slug, description }: AppImageProps, encodeUri = true): string => {
  const url = [
    `?type=app`,
    `&name=${encodeURIComponent(name)}`,
    `&slug=${encodeURIComponent(slug)}`,
    `&description=${encodeURIComponent(description)}`,
    // Joining a multiline string for readability.
  ].join("");

  return encodeUri ? encodeURIComponent(url) : url;
};

export const constructGenericImage = ({ title, description }: GenericImageProps, encodeUri = true) => {
  const url = [
    `?type=generic`,
    `&title=${encodeURIComponent(title)}`,
    `&description=${encodeURIComponent(description)}`,
    // Joining a multiline string for readability.
  ].join("");

  return encodeUri ? encodeURIComponent(url) : url;
};

const Wrapper = ({ children, variant = "light", rotateBackground }: WrapperProps) => (
  <div tw="flex w-full h-full">
    <img
      tw="flex absolute left-0 top-0 w-full h-[110%]"
      style={rotateBackground ? { transform: "rotate(180deg)" } : undefined}
      src={`${CAL_URL}/social-bg-${variant}-lines.jpg`}
      alt="background"
      width="1200"
      height="600"
    />
    <div tw="flex flex-col w-full h-full px-[80px] py-[70px] items-start justify-center">{children}</div>
  </div>
);

export const Meeting = ({ title, users = [], profile }: MeetingImageProps) => {
  // We filter attendees here based on whether they have an image and filter duplicates.
  // Users ALWAYS have an image (albeit a gray empty person avatar), so this mainly filters out
  // any non existing images for dynamic collectives, while at the same time removing them from
  // the names list, because the profile name of that event is a concatenation of all names.
  const attendees = (profile?.image ? [profile, ...users] : users).filter(
    (value, index, self) => self.findIndex((v) => v.name === value.name) == index
  );

  // Construct list of avatar urls, removes duplicates and empty profile images
  const avatars = attendees
    .map((user) => {
      if ("image" in user && user?.image) return user.image;
      if ("username" in user && user?.username) return `${CAL_URL}/${user.username}/avatar.png`;
      return null;
    })
    .filter(Boolean) as string[];

  // In case there is NO other attendee than the single meeting profile without an image, we add
  // that name back in here, since the event probably is a round robin event.
  const names = attendees.length > 0 ? attendees.map((user) => user.name) : [profile.name];

  return (
    <Wrapper variant="dark">
      <div tw="h-full flex flex-col justify-start">
        <div tw="flex items-center justify-center" style={{ fontFamily: "cal", fontWeight: 300 }}>
          <img src={`${CAL_URL}/${LOGO}`} width="350" alt="Logo" />
          {avatars.length > 0 && <div tw="font-bold text-emphasis text-[92px] mx-8 bottom-2">/</div>}
          <div tw="flex flex-row">
            {avatars.slice(0, 3).map((avatar) => (
              <img
                tw="rounded-full mr-[-36px] border-[6px] border-[#CDCED2]"
                key={avatar}
                src={avatar}
                alt="Profile picture"
                width="160"
              />
            ))}
            {avatars.length > 3 && (
              <div tw="flex items-center justify-center w-[160px] h-[160px] rounded-full bg-black text-inverted text-[54px] font-bold">
                <span tw="flex top-[-5px] left-[-5px]">+{avatars.length - 3}</span>
              </div>
            )}
          </div>
        </div>
        <div tw="relative flex text-[54px] w-full flex-col text-emphasis mt-auto">
          <div
            tw="flex w-[1040px] overflow-hidden"
            style={{ whiteSpace: "nowrap", fontFamily: "cal", textOverflow: "ellipsis" }}>
            Meet {joinMultipleNames(names)}
          </div>
          <div
            tw="flex mt-3 w-[1040px] overflow-hidden"
            style={{ whiteSpace: "nowrap", fontFamily: "inter", textOverflow: "ellipsis" }}>
            {title}
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

const VisualBlur = ({ visualSlug }: { visualSlug: string }) => {
  // Making a blur of a dark logo is very ugly. We use the filename to indicate,
  // when we don't want to render these blurry blob backgrounds.
  if (visualSlug.indexOf("dark") > -1) return null;

  return (
    <div tw="flex relative">
      {/* Blob top left */}
      <div
        tw="flex absolute top-[-100px] left-[-100px] w-[400px] h-[400px] opacity-80"
        style={{
          filter: "blur(98px)",
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          backgroundImage: `url(${CAL_URL}${visualSlug})`,
          backgroundSize: "400px 400px",
        }}
      />

      {/* Blob bottom right */}
      <div
        tw="flex absolute top-[230px] left-[660px] w-[630px] h-[630px] opacity-80"
        style={{
          filter: "blur(150px)",
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          backgroundImage: `url(${CAL_URL}${visualSlug})`,
          backgroundSize: "630px 630px",
        }}
      />
    </div>
  );
};

export const App = ({ name, description, slug }: AppImageProps) => (
  <Wrapper>
    <img src={`${CAL_URL}/${LOGO}`} width="150" alt="Logo" tw="absolute right-[48px] top-[48px]" />

    <VisualBlur visualSlug={slug} />

    <div tw="flex items-center w-full">
      <div tw="flex">
        <img src={`${CAL_URL}${slug}`} alt="App icon" width="172" />
      </div>
    </div>
    <div tw="flex mt-auto w-full flex-col text-emphasis">
      <div tw="flex text-[64px] mb-7" style={{ fontFamily: "cal", fontWeight: 600 }}>
        {name}
      </div>
      <div tw="flex text-[36px]" style={{ fontFamily: "inter" }}>
        {description}
      </div>
    </div>
  </Wrapper>
);

export const Generic = ({ title, description }: GenericImageProps) => (
  <Wrapper>
    <div tw="h-full flex flex-col justify-start">
      <div tw="flex items-center justify-center" style={{ fontFamily: "cal", fontWeight: 300 }}>
        <img src={`${CAL_URL}/cal-logo-word-black.svg`} width="350" alt="Logo" />
      </div>

      <div tw="relative flex text-[54px] w-full flex-col text-emphasis mt-auto">
        <div tw="flex w-[1040px]" style={{ fontFamily: "cal" }}>
          {title}
        </div>
        <div tw="flex mt-3 w-[1040px]" style={{ fontFamily: "inter" }}>
          {description}
        </div>
      </div>
    </div>
  </Wrapper>
);

export const ScreenShot = ({ image, fallbackImage }: ScreenshotImageProps) => (
  <Wrapper rotateBackground>
    <div tw="relative h-full w-full flex flex-col justify-center items-center">
      <div tw="relative mt-[140px] flex rounded-2xl" style={{ boxShadow: "0 0 45px -3px rgba(0,0,0,.3)" }}>
        <img
          src={fallbackImage}
          tw="absolute inset-0 rounded-2xl"
          width="1024"
          height="576"
          alt="screenshot"
        />
        <img src={image} width="1024" height="576" tw="rounded-2xl" alt="screenshot" />
      </div>
    </div>
  </Wrapper>
);
