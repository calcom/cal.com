export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const existingSidebar = document.getElementById('cal-companion-sidebar');
    if (existingSidebar) {
      return;
    }

    let isVisible = false;
    let isClosed = true;

    // Create sidebar container
    const sidebarContainer = document.createElement('div');
    sidebarContainer.id = 'cal-companion-sidebar';
    sidebarContainer.style.position = 'fixed';
    sidebarContainer.style.top = '0';
    sidebarContainer.style.right = '0';
    sidebarContainer.style.width = '400px';
    sidebarContainer.style.height = '100vh';
    sidebarContainer.style.zIndex = '2147483647';
    sidebarContainer.style.backgroundColor = 'white';
    sidebarContainer.style.border = '1px solid #ccc';
    sidebarContainer.style.borderTop = 'none';
    sidebarContainer.style.borderBottom = 'none';
    sidebarContainer.style.boxShadow = '-2px 0 10px rgba(0,0,0,0.1)';
    sidebarContainer.style.transition = 'transform 0.3s ease-in-out';
    sidebarContainer.style.transform = 'translateX(100%)';
    sidebarContainer.style.display = 'none';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = 'http://localhost:8081';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '0';

    sidebarContainer.appendChild(iframe);

    // Add SVG filter definition to document
    const svgFilter = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgFilter.style.display = 'none';
    svgFilter.innerHTML = `
        <filter id="displacementFilter">
            <feTurbulence type="turbulence" 
                baseFrequency="0.01" 
                numOctaves="2" 
                result="turbulence" />
    
            <feDisplacementMap in="SourceGraphic"
                in2="turbulence"    
                            scale="200" xChannelSelector="R" yChannelSelector="G" />
        </filter>
    `;
    document.body.appendChild(svgFilter);

    // Create floating buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.id = 'cal-companion-buttons';
    buttonsContainer.style.position = 'fixed';
    buttonsContainer.style.top = '20px';
    buttonsContainer.style.right = '420px';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.flexDirection = 'column';
    buttonsContainer.style.gap = '8px';
    buttonsContainer.style.zIndex = '2147483648';
    buttonsContainer.style.transition = 'right 0.3s ease-in-out';
    buttonsContainer.style.display = 'none';

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.innerHTML = '◀';
    toggleButton.style.width = '40px';
    toggleButton.style.height = '40px';
    toggleButton.style.borderRadius = '50%';
    toggleButton.style.border = 'none';
    toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    toggleButton.style.backdropFilter = 'brightness(1.1) blur(2px) url(#displacementFilter)';
    toggleButton.style.filter = 'drop-shadow(-8px -10px 46px #0000005f)';
    toggleButton.style.boxShadow = 'inset 6px 6px 3px -7px rgba(255, 255, 255, 0.7), inset 0 0 8px 1px rgba(255, 255, 255, 0.7)';
    toggleButton.style.color = 'white';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.fontSize = '16px';
    toggleButton.style.transition = 'all 0.2s ease';
    toggleButton.style.position = 'relative';
    toggleButton.style.overflow = 'hidden';
    toggleButton.title = 'Toggle sidebar';

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '✕';
    closeButton.style.width = '40px';
    closeButton.style.height = '40px';
    closeButton.style.borderRadius = '50%';
    closeButton.style.border = 'none';
    closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    closeButton.style.backdropFilter = 'brightness(1.1) blur(2px) url(#displacementFilter)';
    closeButton.style.filter = 'drop-shadow(-8px -10px 46px #0000005f)';
    closeButton.style.boxShadow = 'inset 6px 6px 3px -7px rgba(255, 255, 255, 0.7), inset 0 0 8px 1px rgba(255, 255, 255, 0.7)';
    closeButton.style.color = 'white';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.transition = 'all 0.2s ease';
    closeButton.style.position = 'relative';
    closeButton.style.overflow = 'hidden';
    closeButton.title = 'Close sidebar';

    // Add hover effects
    toggleButton.addEventListener('mouseenter', () => {
      toggleButton.style.transform = 'scale(1.1)';
    });
    toggleButton.addEventListener('mouseleave', () => {
      toggleButton.style.transform = 'scale(1)';
    });

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.transform = 'scale(1.1)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.transform = 'scale(1)';
    });

    // Toggle functionality
    toggleButton.addEventListener('click', () => {
      if (isClosed) return;
      
      isVisible = !isVisible;
      if (isVisible) {
        sidebarContainer.style.transform = 'translateX(0)';
        buttonsContainer.style.right = '420px';
        toggleButton.innerHTML = '▶';
      } else {
        sidebarContainer.style.transform = 'translateX(100%)';
        buttonsContainer.style.right = '20px';
        toggleButton.innerHTML = '◀';
      }
    });

    // Close functionality
    closeButton.addEventListener('click', () => {
      isClosed = true;
      isVisible = false;
      sidebarContainer.style.display = 'none';
      buttonsContainer.style.display = 'none';
    });

    // Add buttons to container
    buttonsContainer.appendChild(toggleButton);
    buttonsContainer.appendChild(closeButton);

    // Add everything to DOM
    document.body.appendChild(sidebarContainer);
    document.body.appendChild(buttonsContainer);

    // Listen for extension icon click
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'icon-clicked') {
        if (isClosed) {
          // Reopen closed sidebar
          isClosed = false;
          isVisible = true;
          sidebarContainer.style.display = 'block';
          buttonsContainer.style.display = 'flex';
          sidebarContainer.style.transform = 'translateX(0)';
          buttonsContainer.style.right = '420px';
          toggleButton.innerHTML = '▶';
        } else {
          // Toggle visible sidebar
          isVisible = !isVisible;
          if (isVisible) {
            sidebarContainer.style.transform = 'translateX(0)';
            buttonsContainer.style.right = '420px';
            toggleButton.innerHTML = '▶';
          } else {
            sidebarContainer.style.transform = 'translateX(100%)';
            buttonsContainer.style.right = '20px';
            toggleButton.innerHTML = '◀';
          }
        }
      }
    });
  },
});

function defineContentScript(config: { matches: string[], main: () => void }) {
  return config;
}