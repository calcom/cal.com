const ICON = `<svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
</svg>`;

const BTN_CLASSES = [
  "z-[999999999999] hidden fixed md:bottom-6 bottom-4 md:right-10 right-4 md:left-10 left-4",
  "flex h-16 origin-center bg-red-50 transform cursor-pointer items-center rounded-full",
  "py-4 px-6 text-base outline-none drop-shadow-md transition focus:outline-none",
  "focus:ring-4 focus:ring-gray-600 focus:ring-opacity-50 active:scale-95",
].join(" ");

export function makeFloatingHtml({
  label,
  classes,
  bgColor,
  textColor,
}: {
  label: string;
  classes: string[];
  bgColor: string;
  textColor: string;
}): string {
  const allClasses = `${BTN_CLASSES} ${classes.join(" ")}`;
  const inlineStyle = `background-color:${bgColor};color:${textColor}; z-index: 10001`;

  return `<button class="${allClasses}" style="${inlineStyle}">
  <div id="button-icon" class="mr-3 flex items-center justify-center">
    ${ICON}
  </div>
  <div id="button" class="font-semibold leading-5 antialiased">${label}</div>
</button>`;
}
