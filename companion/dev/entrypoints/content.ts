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
    sidebarContainer.style.pointerEvents = 'none';
    sidebarContainer.style.width = '100vw';
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

    // Create iframe container with max width
    const iframeContainer = document.createElement('div');
    iframeContainer.style.width = '100%';
    iframeContainer.style.height = '100%';
    iframeContainer.style.display = 'flex';
    iframeContainer.style.justifyContent = 'flex-end';
    iframeContainer.style.pointerEvents = 'auto';
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = 'http://localhost:8081';
    iframe.style.width = '250px';
    iframe.style.maxWidth = '250px';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '0';
    iframe.style.backgroundColor = 'white';
    iframe.style.boxShadow = '-2px 0 10px rgba(0,0,0,0.1)';
    
    iframeContainer.appendChild(iframe);

    sidebarContainer.appendChild(iframeContainer);

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
    toggleButton.style.backdropFilter = 'blur(10px)';
    toggleButton.style.color = 'white';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.fontSize = '16px';
    toggleButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    toggleButton.style.transition = 'all 0.2s ease';
    toggleButton.title = 'Toggle sidebar';

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L1 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1 1L13 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
    closeButton.style.width = '40px';
    closeButton.style.height = '40px';
    closeButton.style.borderRadius = '50%';
    closeButton.style.border = 'none';
    closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    closeButton.style.backdropFilter = 'blur(10px)';
    closeButton.style.color = 'white';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    closeButton.style.transition = 'all 0.2s ease';
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
        toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
      } else {
        sidebarContainer.style.transform = 'translateX(100%)';
        buttonsContainer.style.right = '20px';
        toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L8 6L13 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 1L1 6L6 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
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
          toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
        } else {
          // Toggle visible sidebar
          isVisible = !isVisible;
          if (isVisible) {
            sidebarContainer.style.transform = 'translateX(0)';
            buttonsContainer.style.right = '420px';
            toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
          } else {
            sidebarContainer.style.transform = 'translateX(100%)';
            buttonsContainer.style.right = '20px';
            toggleButton.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L8 6L13 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 1L1 6L6 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
          }
        }
      }
    });
  },
});

function defineContentScript(config: { matches: string[], main: () => void }) {
  return config;
}