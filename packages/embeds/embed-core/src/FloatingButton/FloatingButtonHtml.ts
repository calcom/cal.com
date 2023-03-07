const getHtml = ({
  buttonText,
  buttonClasses,
  buttonColor,
  buttonTextColor,
}: {
  buttonText: string;
  buttonClasses: string[];
  buttonColor: string;
  buttonTextColor: string;
}) => {
  // IT IS A REQUIREMENT THAT ALL POSSIBLE CLASSES ARE HERE OTHERWISE TAILWIND WONT GENERATE THE CSS FOR CONDITIONAL CLASSES
  // To not let all these classes apply and visible, keep it hidden initially
  return `<button class="z-[10000000000] hidden fixed md:bottom-6 bottom-4 md:right-10 right-4 md:left-10 left-4 ${buttonClasses.join(
    " "
  )} flex h-16 origin-center bg-red-50 transform cursor-pointer items-center
rounded-full py-4 px-6 text-base outline-none drop-shadow-md transition focus:outline-none fo
cus:ring-4 focus:ring-gray-600 focus:ring-opacity-50 active:scale-95" 
style="background-color:${buttonColor}; color:${buttonTextColor} z-index: 10001">
<div id="button-icon" class="mr-3 flex items-center justify-center">
  <svg
	class="h-7 w-7"
	fill="none"
	stroke="currentColor"
	viewBox="0 0 24 24"
	xmlns="http://www.w3.org/2000/svg">
	<path
	  strokeLinecap="round"
	  strokeLinejoin="round"
	  strokeWidth="2"
	  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
  </svg>
</div>
<div id="button" class="font-semibold leading-5 antialiased">${buttonText}</div>
</button>`;
};

export default getHtml;
