const getHtml = ({
  buttonText: _buttonText,
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
  return `<div id="chatbox-container" class="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-[999999999999] transform-gpu will-change-transform" style="visibility: hidden; opacity: 0; transform: translateY(8px); transition: all 300ms;">
<div id="chatbox" class="absolute inset-0 md:inset-auto md:bottom-16 md:right-0 w-full h-full shadow-2xl border-0 overflow-hidden transform-gpu transition-all duration-300 bg-white rounded-lg md:w-96 md:h-[600px]">
<div class="flex rounded-t-lg items-center justify-between p-4 bg-gray-900 text-white">
<div class="flex items-center gap-2">
<div class="w-2 h-2 bg-green-400 rounded-full"></div>
<span class="font-medium">Book a Meeting</span>
</div>
<div class="flex items-center gap-1">
<button id="fullscreen-btn" class="text-white hover:bg-white/20 h-8 w-8 p-0 rounded flex items-center justify-center transition-colors">
<svg id="fullscreen-icon" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
</svg>
</button>
<button id="close-btn" class="text-white hover:bg-white/20 h-8 w-8 p-0 rounded flex items-center justify-center transition-colors">
<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
</svg>
</button>
</div>
</div>
<div id="iframe-container" class="h-[calc(100vh-64px)] md:h-[calc(600px-64px)] overflow-hidden">
</div>
</div>
</div>
<button id="fab-button" class="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform-gpu will-change-transform flex items-center justify-center fixed bottom-6 right-6 md:relative md:bottom-auto md:right-auto hover:scale-110 active:scale-95 z-[999999999999] ${buttonClasses.join(
    " "
  )}" style="background-color:${buttonColor}; color:${buttonTextColor}">
<svg id="fab-icon" class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
</svg>
</button>`;
};

export default getHtml;
