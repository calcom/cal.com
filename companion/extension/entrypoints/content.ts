export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const existingSidebar = document.getElementById('cal-companion-sidebar');
    if (existingSidebar) {
      return;
    }

    // Initialize Gmail integration if on Gmail
    if (window.location.hostname === 'mail.google.com') {
      initGmailIntegration();
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
    toggleButton.style.display = 'flex';
    toggleButton.style.alignItems = 'center';
    toggleButton.style.justifyContent = 'center';
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
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
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

    // Gmail integration function
    function initGmailIntegration() {
      // Function to inject Cal.com button as a new table cell after Send button
      function injectCalButton() {
        // Look specifically for Gmail compose Send buttons - they have specific attributes
        // Gmail Send button usually has div[role="button"] with specific data attributes inside a td
        const sendButtons = document.querySelectorAll('div[role="button"][data-tooltip="Send ‪(Ctrl-Enter)‬"], div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"]');
        
        sendButtons.forEach((sendButton) => {
          // Find the parent td cell that contains the send button
          const sendButtonCell = sendButton.closest('td');
          if (!sendButtonCell) return;
          
          // Find the parent table row
          const tableRow = sendButtonCell.closest('tr');
          if (!tableRow) return;
          
          // Check if we already injected our button for this specific send button
          const existingCalButton = sendButtonCell.parentElement?.querySelector('.cal-companion-gmail-button');
          if (existingCalButton) return;
          
          // Additional check: make sure this is actually in a compose window
          // Gmail compose windows have specific containers
          const composeWindow = sendButton.closest('[role="dialog"]') || sendButton.closest('.nH');
          if (!composeWindow) return;
          
          // Create new table cell for Cal.com button
          const calButtonCell = document.createElement('td');
          calButtonCell.className = 'cal-companion-gmail-button';
          calButtonCell.style.cssText = `
            padding: 0;
            margin: 0;
            vertical-align: middle;
            border: none;
          `;
          
          // Create Cal.com button
          const calButton = document.createElement('div');
          calButton.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            margin: 2px 4px;
            border-radius: 50%;
            background-color: #000000;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          `;
          
          // Add Cal.com icon (official logo)
          calButton.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.4688 5H17.0887V13.76H15.4688V5Z" fill="white"/>
              <path d="M10.918 13.9186C10.358 13.9186 9.84198 13.7746 9.36998 13.4866C8.89798 13.1906 8.52198 12.7946 8.24198 12.2986C7.96998 11.8026 7.83398 11.2586 7.83398 10.6666C7.83398 10.0746 7.96998 9.53063 8.24198 9.03463C8.52198 8.53063 8.89798 8.13062 9.36998 7.83462C9.84198 7.53862 10.358 7.39062 10.918 7.39062C11.43 7.39062 11.842 7.48662 12.154 7.67862C12.474 7.87062 12.722 8.14662 12.898 8.50662V7.52262H14.506V13.7626H12.934V12.7426C12.75 13.1186 12.498 13.4106 12.178 13.6186C11.866 13.8186 11.446 13.9186 10.918 13.9186ZM9.45398 10.6546C9.45398 10.9746 9.52598 11.2746 9.66998 11.5546C9.82198 11.8266 10.026 12.0466 10.282 12.2146C10.546 12.3746 10.846 12.4546 11.182 12.4546C11.526 12.4546 11.83 12.3746 12.094 12.2146C12.366 12.0546 12.574 11.8386 12.718 11.5666C12.862 11.2946 12.934 10.9946 12.934 10.6666C12.934 10.3386 12.862 10.0386 12.718 9.76662C12.574 9.48662 12.366 9.26662 12.094 9.10663C11.83 8.93863 11.526 8.85463 11.182 8.85463C10.846 8.85463 10.546 8.93863 10.282 9.10663C10.018 9.26662 9.81398 9.48262 9.66998 9.75462C9.52598 10.0266 9.45398 10.3266 9.45398 10.6546Z" fill="white"/>
              <path d="M4.68078 13.919C3.86478 13.919 3.12078 13.727 2.44878 13.343C1.78478 12.951 1.26078 12.423 0.876781 11.759C0.492781 11.095 0.300781 10.367 0.300781 9.57503C0.300781 8.77503 0.484781 8.04303 0.852781 7.37903C1.22878 6.70703 1.74878 6.17903 2.41278 5.79503C3.07678 5.40303 3.83278 5.20703 4.68078 5.20703C5.36078 5.20703 5.94478 5.31503 6.43278 5.53103C6.92878 5.73903 7.36878 6.07103 7.75278 6.52703L6.56478 7.55903C6.06078 7.03103 5.43278 6.76703 4.68078 6.76703C4.15278 6.76703 3.68878 6.89503 3.28878 7.15103C2.88878 7.39903 2.58078 7.73903 2.36478 8.17103C2.14878 8.59503 2.04078 9.06303 2.04078 9.57503C2.04078 10.087 2.14878 10.555 2.36478 10.979C2.58878 11.403 2.90078 11.739 3.30078 11.987C3.70878 12.235 4.18078 12.359 4.71678 12.359C5.50078 12.359 6.14078 12.087 6.63678 11.543L7.86078 12.587C7.52478 12.995 7.08478 13.319 6.54078 13.559C6.00478 13.799 5.38478 13.919 4.68078 13.919Z" fill="white"/>
            </svg>
          `;
          
          // Add hover effect
          calButton.addEventListener('mouseenter', () => {
            calButton.style.backgroundColor = '#333333';
            calButton.style.transform = 'scale(1.05)';
          });
          
          calButton.addEventListener('mouseleave', () => {
            calButton.style.backgroundColor = '#000000';
            calButton.style.transform = 'scale(1)';
          });
          
          // Add click handler to show Cal.com menu
          calButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Remove any existing menus
            const existingMenu = document.querySelector('.cal-companion-gmail-menu');
            if (existingMenu) {
              existingMenu.remove();
              return;
            }
            
            // Create menu
            const menu = document.createElement('div');
            menu.className = 'cal-companion-gmail-menu';
            menu.style.cssText = `
              position: absolute;
              bottom: 100%;
              left: 0;
              min-width: 250px;
              max-width: 350px;
              max-height: 300px;
              background: white;
              border-radius: 4px;
              box-shadow: 0 1px 2px 0 rgba(60,64,67,.3),0 2px 6px 2px rgba(60,64,67,.15);
              font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
              font-size: 14px;
              z-index: 9999;
              overflow-y: auto;
              margin-bottom: 4px;
            `;
            
            // Show loading state
            menu.innerHTML = `
              <div style="padding: 16px; text-align: center; color: #5f6368;">
                Loading event types...
              </div>
            `;
            
            // Fetch event types from Cal.com API
            fetchEventTypes(menu);
            
            // Position menu relative to button
            calButtonCell.style.position = 'relative';
            calButtonCell.appendChild(menu);
            
            // Close menu when clicking outside
            setTimeout(() => {
              document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                  menu.remove();
                  document.removeEventListener('click', closeMenu);
                }
              });
            }, 0);
          });
          
          function openCalSidebar() {
            // Open Cal.com sidebar or quick schedule flow
            if (isClosed) {
              // Trigger sidebar open
              chrome.runtime.sendMessage({action: 'icon-clicked'});
            } else {
              // Toggle sidebar visibility
              isVisible = !isVisible;
              if (isVisible) {
                sidebarContainer.style.transform = 'translateX(0)';
              } else {
                sidebarContainer.style.transform = 'translateX(100%)';
              }
            }
          }
          
          async function fetchEventTypes(menu) {
            try {
              // Use chrome.runtime.sendMessage to make API call through background script
              const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                  { action: 'fetch-event-types' },
                  (response) => {
                    console.log('Raw response from background:', response);
                    if (chrome.runtime.lastError) {
                      console.log('Chrome runtime error:', chrome.runtime.lastError);
                      reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.error) {
                      console.log('Response has error:', response.error);
                      reject(new Error(response.error));
                    } else {
                      console.log('Resolving with response:', response);
                      resolve(response);
                    }
                  }
                );
              });
              
              console.log('Final response from background script:', response);
              
              let eventTypes = [];
              if (response && response.data) {
                eventTypes = response.data;
              } else if (Array.isArray(response)) {
                eventTypes = response;
              } else {
                console.log('Unexpected response format:', response);
                eventTypes = [];
              }
              
              // Ensure eventTypes is an array
              if (!Array.isArray(eventTypes)) {
                console.log('EventTypes is not an array:', typeof eventTypes, eventTypes);
                eventTypes = [];
              }
              
              console.log('Final eventTypes array:', eventTypes, 'Length:', eventTypes.length);
              
              // Clear loading state
              menu.innerHTML = '';
              
              if (eventTypes.length === 0) {
                menu.innerHTML = `
                  <div style="padding: 16px; text-align: center; color: #5f6368;">
                    No event types found
                  </div>
                `;
                return;
              }
              
              // Add header
              const header = document.createElement('div');
              header.style.cssText = `
                padding: 12px 16px;
                border-bottom: 1px solid #e8eaed;
                background-color: #f8f9fa;
                font-weight: 500;
                color: #3c4043;
                font-size: 13px;
              `;
              header.textContent = 'Select an event type to share';
              menu.appendChild(header);
              
              // Add event types - with additional safety checks
              try {
                eventTypes.forEach((eventType, index) => {
                  // Validate eventType object
                  if (!eventType || typeof eventType !== 'object') {
                    console.warn('Invalid event type object:', eventType);
                    return;
                  }
                  
                  const title = eventType.title || 'Untitled Event';
                  const length = eventType.length || eventType.duration || 30;
                  const description = eventType.description || 'No description';
                  
                  const menuItem = document.createElement('div');
                  menuItem.style.cssText = `
                    padding: 12px 16px;
                    display: flex;
                    flex-direction: column;
                    cursor: pointer;
                    transition: background-color 0.1s ease;
                    border-bottom: ${index < eventTypes.length - 1 ? '1px solid #e8eaed' : 'none'};
                  `;
                  
                  menuItem.innerHTML = `
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                      <span style="margin-right: 8px; font-size: 14px;">📅</span>
                      <span style="color: #3c4043; font-weight: 500;">${title}</span>
                    </div>
                    <div style="color: #5f6368; font-size: 12px; margin-left: 22px;">
                      ${length}min • ${description}
                    </div>
                  `;
                  
                  // Hover effect
                  menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.backgroundColor = '#f8f9fa';
                  });
                  
                  menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.backgroundColor = 'transparent';
                  });
                  
                  menuItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menu.remove();
                    // Copy scheduling link to clipboard and show confirmation
                    copyEventTypeLink(eventType);
                  });
                  
                  menu.appendChild(menuItem);
                });
              } catch (forEachError) {
                console.error('Error in forEach loop:', forEachError);
                menu.innerHTML = `
                  <div style="padding: 16px; text-align: center; color: #ea4335;">
                    Error displaying event types
                  </div>
                `;
              }
              
            } catch (error) {
              console.error('Failed to fetch event types:', error);
              console.log('Error details:', error.message, error.stack);
              menu.innerHTML = `
                <div style="padding: 16px; text-align: center; color: #ea4335;">
                  Failed to load event types
                </div>
                <div style="padding: 0 16px; text-align: center; color: #5f6368; font-size: 12px;">
                  Error: ${error.message}
                </div>
                <div style="padding: 16px 16px; text-align: center;">
                  <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #1a73e8;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 14px;
                    cursor: pointer;
                  ">Close</button>
                </div>
              `;
            }
          }
          
          function copyEventTypeLink(eventType) {
            // Construct the Cal.com booking link
            const bookingUrl = `https://cal.com/${eventType.users?.[0]?.username || 'user'}/${eventType.slug}`;
            
            // Copy to clipboard
            navigator.clipboard.writeText(bookingUrl).then(() => {
              // Show success notification
              showNotification('Link copied to clipboard!', 'success');
            }).catch(err => {
              console.error('Failed to copy link:', err);
              showNotification('Failed to copy link', 'error');
            });
          }
          
          function showNotification(message, type) {
            const notification = document.createElement('div');
            notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 12px 16px;
              background: ${type === 'success' ? '#137333' : '#d93025'};
              color: white;
              border-radius: 4px;
              font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
              font-size: 14px;
              z-index: 10000;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Remove after 3 seconds
            setTimeout(() => {
              notification.remove();
            }, 3000);
          }
          
          // Add tooltip
          calButton.title = 'Schedule with Cal.com';
          
          // Add button to cell
          calButtonCell.appendChild(calButton);
          
          // Insert the new cell after the send button cell
          if (sendButtonCell.nextSibling) {
            tableRow.insertBefore(calButtonCell, sendButtonCell.nextSibling);
          } else {
            tableRow.appendChild(calButtonCell);
          }
        });
      }
      
      // Initial injection
      setTimeout(injectCalButton, 1000);
      
      // Watch for DOM changes (Gmail is a SPA)
      const observer = new MutationObserver(() => {
        injectCalButton();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Also inject on URL changes (Gmail navigation)
      let currentUrl = window.location.href;
      setInterval(() => {
        if (window.location.href !== currentUrl) {
          currentUrl = window.location.href;
          setTimeout(injectCalButton, 500);
        }
      }, 1000);
    }
  },
});

function defineContentScript(config: { matches: string[], main: () => void }) {
  return config;
}