import { SENDER_ID } from "@calcom/lib/constants";

const restrictedCountryPrefixes = [
  "+93",
  "+54",
  "+374",
  "+1",
  "+375",
  "+32",
  "+229",
  "+55",
  "+237",
  "+56",
  "+86",
  "+57",
  "+243",
  "+506",
  "+53",
  "+42",
  "+593",
  "+20",
  "+503",
  "+251",
  "+594",
  "+233",
  "+224",
  "+245",
  "+852",
  "+36",
  "+91",
  "+62",
  "+98",
  "+972",
  "+225",
  "+962",
  "+7",
  "+254",
  "+965",
  "+996",
  "+231",
  "+60",
  "+52",
  "+212",
  "+95",
  "+674",
  "+977",
  "+64",
  "+505",
  "+234",
  "+968",
  "+507",
  "+595",
  "+51",
  "+63",
  "+974",
  "+7",
  "+250",
  "+966",
  "+27",
  "+82",
  "+211",
  "+94",
  "+249",
  "+268",
  "+963",
  "+886",
  "+255",
  "+66",
  "+216",
  "+90",
  "+256",
  "+598",
  "+58",
  "+84",
  "+260",
  "+61",
  "+971",
  "+420",
  "+381",
  "+65",
];

export function getSenderId(phoneNumber?: string | null, sender?: string | null) {
  if (!phoneNumber) {
    return sender || SENDER_ID;
  }

  const hasRestrictedPrefix = restrictedCountryPrefixes.some((countryCode) => {
    const prefixLength = countryCode.length;
    const phonePrefix = phoneNumber.substring(0, prefixLength);
    return phonePrefix === countryCode;
  });

  if (hasRestrictedPrefix) {
    return "";
  }

  const resolvedSenderIdentifier = sender || SENDER_ID;
  return resolvedSenderIdentifier;
}
