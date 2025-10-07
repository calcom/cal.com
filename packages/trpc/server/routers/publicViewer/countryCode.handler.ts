import type { CreateInnerContextOptions } from "../../createContext";

type CountryCodeOptions = {
  ctx: CreateInnerContextOptions;
};

// export const countryCodeHandler = async ({ ctx }: CountryCodeOptions) => {
//   const { req } = ctx;

//   const countryCode: string | string[] = req?.headers?.["x-vercel-ip-country"] ?? "";
//   return { countryCode: Array.isArray(countryCode) ? countryCode[0] : countryCode };
// };

export const countryCodeHandler = async ({ ctx }: CountryCodeOptions) => {
  const { req } = ctx;

  const forwarded = req?.headers?.["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req?.socket?.remoteAddress;

  let country = "IN"; // fallback

  try {
    if (ip) {
      const apiKey = process.env.GEOLOCATION_API_KEY;
      if (apiKey) {
        const geoRes = await fetch(`https://api.ipgeolocation.io/v2/ipgeo?apiKey=${apiKey}&ip=${ip}`).catch(
          () => null
        ); // prevent fetch from throwing

        if (geoRes && geoRes.ok) {
          const geoData = await geoRes.json().catch(() => ({}));
          country = geoData?.location?.country_code2 || geoData?.country_code2 || "IN"; // fallback
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch GeoLocation:", err);
  }

  return { countryCode: country };
};

export default countryCodeHandler;
