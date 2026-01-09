export const REDIRECT_APPS = [
  "amie",
  "autocheckin",
  "bolna",
  "chatbase",
  "clic",
  "deel",
  "elevenlabs",
  "granola",
  "greetmate-ai",
  "lindy",
  "linear",
  "millis-ai",
  "monobot",
  "retell-ai",
  "synthflow",
  "telli",
  "vimcal",
  "wordpress",
  "zapier",
];

export const isRedirectApp = (slug: string): boolean => {
  return REDIRECT_APPS.includes(slug);
};
