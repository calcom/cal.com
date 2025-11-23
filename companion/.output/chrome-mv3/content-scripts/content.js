var content=(function(){"use strict";var O=Object.defineProperty;var Y=(w,m,b)=>m in w?O(w,m,{enumerable:!0,configurable:!0,writable:!0,value:b}):w[m]=b;var v=(w,m,b)=>Y(w,typeof m!="symbol"?m+"":m,b);var j,B;const w={matches:["<all_urls>"],main(){if(document.getElementById("cal-companion-sidebar"))return;window.location.hostname==="mail.google.com"&&D();let e=!1,n=!0;const t=document.createElement("div");t.id="cal-companion-sidebar",t.style.position="fixed",t.style.top="0",t.style.right="0",t.style.pointerEvents="none",t.style.width="100vw",t.style.height="100vh",t.style.zIndex="2147483647",t.style.backgroundColor="transparent",t.style.border="1px solid #ccc",t.style.borderTop="none",t.style.borderBottom="none",t.style.boxShadow="-2px 0 10px rgba(0,0,0,0.1)",t.style.transition="transform 0.3s ease-in-out",t.style.transform="translateX(100%)",t.style.display="none";const d=document.createElement("div");d.style.width="100%",d.style.height="100%",d.style.display="flex",d.style.justifyContent="flex-end",d.style.pointerEvents="auto";const c=document.createElement("iframe");c.src="http://localhost:8081",c.style.width="100%",c.style.height="100%",c.style.border="none",c.style.borderRadius="0",c.style.backgroundColor="transparent",c.style.boxShadow="-2px 0 10px rgba(0,0,0,0.1)",d.appendChild(c),t.appendChild(d);const s=document.createElement("div");s.id="cal-companion-buttons",s.style.position="fixed",s.style.top="20px",s.style.right="420px",s.style.display="flex",s.style.flexDirection="column",s.style.gap="8px",s.style.zIndex="2147483648",s.style.transition="right 0.3s ease-in-out",s.style.display="none";const o=document.createElement("button");o.innerHTML="◀",o.style.width="40px",o.style.height="40px",o.style.borderRadius="50%",o.style.border="none",o.style.backgroundColor="rgba(0, 0, 0, 0.5)",o.style.backdropFilter="blur(10px)",o.style.color="white",o.style.cursor="pointer",o.style.fontSize="16px",o.style.boxShadow="0 2px 8px rgba(0,0,0,0.2)",o.style.transition="all 0.2s ease",o.style.display="flex",o.style.alignItems="center",o.style.justifyContent="center",o.title="Toggle sidebar";const l=document.createElement("button");l.innerHTML=`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L1 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1 1L13 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,l.style.width="40px",l.style.height="40px",l.style.borderRadius="50%",l.style.border="none",l.style.backgroundColor="rgba(0, 0, 0, 0.5)",l.style.backdropFilter="blur(10px)",l.style.color="white",l.style.cursor="pointer",l.style.fontSize="16px",l.style.boxShadow="0 2px 8px rgba(0,0,0,0.2)",l.style.transition="all 0.2s ease",l.style.display="flex",l.style.alignItems="center",l.style.justifyContent="center",l.title="Close sidebar",o.addEventListener("mouseenter",()=>{o.style.transform="scale(1.1)"}),o.addEventListener("mouseleave",()=>{o.style.transform="scale(1)"}),l.addEventListener("mouseenter",()=>{l.style.transform="scale(1.1)"}),l.addEventListener("mouseleave",()=>{l.style.transform="scale(1)"}),o.addEventListener("click",()=>{n||(e=!e,e?(t.style.transform="translateX(0)",s.style.right="420px",o.innerHTML=`<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`):(t.style.transform="translateX(100%)",s.style.right="20px",o.innerHTML=`<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L8 6L13 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 1L1 6L6 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`))}),l.addEventListener("click",()=>{n=!0,e=!1,t.style.display="none",s.style.display="none"}),s.appendChild(o),s.appendChild(l),document.body.appendChild(t),document.body.appendChild(s),chrome.runtime.onMessage.addListener(k=>{k.action==="icon-clicked"&&(n?(n=!1,e=!0,t.style.display="block",s.style.display="flex",t.style.transform="translateX(0)",s.style.right="420px",o.innerHTML=`<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`):(e=!e,e?(t.style.transform="translateX(0)",s.style.right="420px",o.innerHTML=`<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`):(t.style.transform="translateX(100%)",s.style.right="20px",o.innerHTML=`<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L8 6L13 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 1L1 6L6 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`)))});function D(){function k(){document.querySelectorAll('div[role="button"][data-tooltip="Send ‪(Ctrl-Enter)‬"], div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"]').forEach(A=>{var V;const E=A.closest("td");if(!E)return;const R=E.closest("tr");if(!R||((V=E.parentElement)==null?void 0:V.querySelector(".cal-companion-gmail-button"))||!(A.closest('[role="dialog"]')||A.closest(".nH")))return;const x=document.createElement("td");x.className="cal-companion-gmail-button",x.style.cssText=`
            padding: 0;
            margin: 0;
            vertical-align: middle;
            border: none;
          `;const u=document.createElement("div");u.style.cssText=`
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
          `,u.innerHTML=`
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.4688 5H17.0887V13.76H15.4688V5Z" fill="white"/>
              <path d="M10.918 13.9186C10.358 13.9186 9.84198 13.7746 9.36998 13.4866C8.89798 13.1906 8.52198 12.7946 8.24198 12.2986C7.96998 11.8026 7.83398 11.2586 7.83398 10.6666C7.83398 10.0746 7.96998 9.53063 8.24198 9.03463C8.52198 8.53063 8.89798 8.13062 9.36998 7.83462C9.84198 7.53862 10.358 7.39062 10.918 7.39062C11.43 7.39062 11.842 7.48662 12.154 7.67862C12.474 7.87062 12.722 8.14662 12.898 8.50662V7.52262H14.506V13.7626H12.934V12.7426C12.75 13.1186 12.498 13.4106 12.178 13.6186C11.866 13.8186 11.446 13.9186 10.918 13.9186ZM9.45398 10.6546C9.45398 10.9746 9.52598 11.2746 9.66998 11.5546C9.82198 11.8266 10.026 12.0466 10.282 12.2146C10.546 12.3746 10.846 12.4546 11.182 12.4546C11.526 12.4546 11.83 12.3746 12.094 12.2146C12.366 12.0546 12.574 11.8386 12.718 11.5666C12.862 11.2946 12.934 10.9946 12.934 10.6666C12.934 10.3386 12.862 10.0386 12.718 9.76662C12.574 9.48662 12.366 9.26662 12.094 9.10663C11.83 8.93863 11.526 8.85463 11.182 8.85463C10.846 8.85463 10.546 8.93863 10.282 9.10663C10.018 9.26662 9.81398 9.48262 9.66998 9.75462C9.52598 10.0266 9.45398 10.3266 9.45398 10.6546Z" fill="white"/>
              <path d="M4.68078 13.919C3.86478 13.919 3.12078 13.727 2.44878 13.343C1.78478 12.951 1.26078 12.423 0.876781 11.759C0.492781 11.095 0.300781 10.367 0.300781 9.57503C0.300781 8.77503 0.484781 8.04303 0.852781 7.37903C1.22878 6.70703 1.74878 6.17903 2.41278 5.79503C3.07678 5.40303 3.83278 5.20703 4.68078 5.20703C5.36078 5.20703 5.94478 5.31503 6.43278 5.53103C6.92878 5.73903 7.36878 6.07103 7.75278 6.52703L6.56478 7.55903C6.06078 7.03103 5.43278 6.76703 4.68078 6.76703C4.15278 6.76703 3.68878 6.89503 3.28878 7.15103C2.88878 7.39903 2.58078 7.73903 2.36478 8.17103C2.14878 8.59503 2.04078 9.06303 2.04078 9.57503C2.04078 10.087 2.14878 10.555 2.36478 10.979C2.58878 11.403 2.90078 11.739 3.30078 11.987C3.70878 12.235 4.18078 12.359 4.71678 12.359C5.50078 12.359 6.14078 12.087 6.63678 11.543L7.86078 12.587C7.52478 12.995 7.08478 13.319 6.54078 13.559C6.00478 13.799 5.38478 13.919 4.68078 13.919Z" fill="white"/>
            </svg>
          `,u.addEventListener("mouseenter",()=>{u.style.backgroundColor="#333333",u.style.transform="scale(1.05)"}),u.addEventListener("mouseleave",()=>{u.style.backgroundColor="#000000",u.style.transform="scale(1)"}),u.addEventListener("click",h=>{h.preventDefault(),h.stopPropagation();const a=document.querySelector(".cal-companion-gmail-menu");if(a){a.remove();return}const i=document.createElement("div");i.className="cal-companion-gmail-menu",i.style.cssText=`
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
            `,i.innerHTML=`
              <div style="padding: 16px; text-align: center; color: #5f6368;">
                Loading event types...
              </div>
            `,_(i),x.style.position="relative",x.appendChild(i),setTimeout(()=>{document.addEventListener("click",function f(p){i.contains(p.target)||(i.remove(),document.removeEventListener("click",f))})},0)});async function _(h){try{const a=await new Promise((p,I)=>{chrome.runtime.sendMessage({action:"fetch-event-types"},g=>{console.log("Raw response from background:",g),chrome.runtime.lastError?(console.log("Chrome runtime error:",chrome.runtime.lastError),I(new Error(chrome.runtime.lastError.message))):g&&g.error?(console.log("Response has error:",g.error),I(new Error(g.error))):(console.log("Resolving with response:",g),p(g))})});console.log("Final response from background script:",a);let i=[];if(a&&a.data?i=a.data:Array.isArray(a)?i=a:(console.log("Unexpected response format:",a),i=[]),Array.isArray(i)||(console.log("EventTypes is not an array:",typeof i,i),i=[]),console.log("Final eventTypes array:",i,"Length:",i.length),h.innerHTML="",i.length===0){h.innerHTML=`
                  <div style="padding: 16px; text-align: center; color: #5f6368;">
                    No event types found
                  </div>
                `;return}const f=document.createElement("div");f.style.cssText=`
                padding: 12px 16px;
                border-bottom: 1px solid #e8eaed;
                background-color: #f8f9fa;
                font-weight: 500;
                color: #3c4043;
                font-size: 13px;
              `,f.textContent="Select an event type to share",h.appendChild(f);try{i.forEach((p,I)=>{if(!p||typeof p!="object"){console.warn("Invalid event type object:",p);return}const g=p.title||"Untitled Event",X=p.length||p.duration||30,W=p.description||"No description",y=document.createElement("div");y.style.cssText=`
                    padding: 12px 16px;
                    display: flex;
                    flex-direction: column;
                    cursor: pointer;
                    transition: background-color 0.1s ease;
                    border-bottom: ${I<i.length-1?"1px solid #e8eaed":"none"};
                  `,y.innerHTML=`
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                      <span style="margin-right: 8px; font-size: 14px;">📅</span>
                      <span style="color: #3c4043; font-weight: 500;">${g}</span>
                    </div>
                    <div style="color: #5f6368; font-size: 12px; margin-left: 22px;">
                      ${X}min • ${W}
                    </div>
                  `,y.addEventListener("mouseenter",()=>{y.style.backgroundColor="#f8f9fa"}),y.addEventListener("mouseleave",()=>{y.style.backgroundColor="transparent"}),y.addEventListener("click",Z=>{Z.stopPropagation(),h.remove(),G(p)}),h.appendChild(y)})}catch(p){console.error("Error in forEach loop:",p),h.innerHTML=`
                  <div style="padding: 16px; text-align: center; color: #ea4335;">
                    Error displaying event types
                  </div>
                `}}catch(a){console.error("Failed to fetch event types:",a),console.log("Error details:",a.message,a.stack),h.innerHTML=`
                <div style="padding: 16px; text-align: center; color: #ea4335;">
                  Failed to load event types
                </div>
                <div style="padding: 0 16px; text-align: center; color: #5f6368; font-size: 12px;">
                  Error: ${a.message}
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
              `}}function G(h){var i,f;const a=`https://cal.com/${((f=(i=h.users)==null?void 0:i[0])==null?void 0:f.username)||"user"}/${h.slug}`;navigator.clipboard.writeText(a).then(()=>{z("Link copied to clipboard!","success")}).catch(p=>{console.error("Failed to copy link:",p),z("Failed to copy link","error")})}function z(h,a){const i=document.createElement("div");i.style.cssText=`
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 12px 16px;
              background: ${a==="success"?"#137333":"#d93025"};
              color: white;
              border-radius: 4px;
              font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
              font-size: 14px;
              z-index: 10000;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            `,i.textContent=h,document.body.appendChild(i),setTimeout(()=>{i.remove()},3e3)}u.title="Schedule with Cal.com",x.appendChild(u),E.nextSibling?R.insertBefore(x,E.nextSibling):R.appendChild(x)})}setTimeout(k,1e3),new MutationObserver(()=>{k()}).observe(document.body,{childList:!0,subtree:!0});let $=window.location.href;setInterval(()=>{window.location.href!==$&&($=window.location.href,setTimeout(k,500))},1e3)}}};function m(r){return r}const L=(B=(j=globalThis.browser)==null?void 0:j.runtime)!=null&&B.id?globalThis.browser:globalThis.chrome;function S(r,...e){}const P={debug:(...r)=>S(console.debug,...r),log:(...r)=>S(console.log,...r),warn:(...r)=>S(console.warn,...r),error:(...r)=>S(console.error,...r)},M=class M extends Event{constructor(e,n){super(M.EVENT_NAME,{}),this.newUrl=e,this.oldUrl=n}};v(M,"EVENT_NAME",F("wxt:locationchange"));let H=M;function F(r){var e;return`${(e=L==null?void 0:L.runtime)==null?void 0:e.id}:content:${r}`}function U(r){let e,n;return{run(){e==null&&(n=new URL(location.href),e=r.setInterval(()=>{let t=new URL(location.href);t.href!==n.href&&(window.dispatchEvent(new H(t,n)),n=t)},1e3))}}}const C=class C{constructor(e,n){v(this,"isTopFrame",window.self===window.top);v(this,"abortController");v(this,"locationWatcher",U(this));v(this,"receivedMessageIds",new Set);this.contentScriptName=e,this.options=n,this.abortController=new AbortController,this.isTopFrame?(this.listenForNewerScripts({ignoreFirstEvent:!0}),this.stopOldScripts()):this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(e){return this.abortController.abort(e)}get isInvalid(){return L.runtime.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(e){return this.signal.addEventListener("abort",e),()=>this.signal.removeEventListener("abort",e)}block(){return new Promise(()=>{})}setInterval(e,n){const t=setInterval(()=>{this.isValid&&e()},n);return this.onInvalidated(()=>clearInterval(t)),t}setTimeout(e,n){const t=setTimeout(()=>{this.isValid&&e()},n);return this.onInvalidated(()=>clearTimeout(t)),t}requestAnimationFrame(e){const n=requestAnimationFrame((...t)=>{this.isValid&&e(...t)});return this.onInvalidated(()=>cancelAnimationFrame(n)),n}requestIdleCallback(e,n){const t=requestIdleCallback((...d)=>{this.signal.aborted||e(...d)},n);return this.onInvalidated(()=>cancelIdleCallback(t)),t}addEventListener(e,n,t,d){var c;n==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),(c=e.addEventListener)==null||c.call(e,n.startsWith("wxt:")?F(n):n,t,{...d,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),P.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){window.postMessage({type:C.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:Math.random().toString(36).slice(2)},"*")}verifyScriptStartedEvent(e){var c,s,o;const n=((c=e.data)==null?void 0:c.type)===C.SCRIPT_STARTED_MESSAGE_TYPE,t=((s=e.data)==null?void 0:s.contentScriptName)===this.contentScriptName,d=!this.receivedMessageIds.has((o=e.data)==null?void 0:o.messageId);return n&&t&&d}listenForNewerScripts(e){let n=!0;const t=d=>{if(this.verifyScriptStartedEvent(d)){this.receivedMessageIds.add(d.data.messageId);const c=n;if(n=!1,c&&(e!=null&&e.ignoreFirstEvent))return;this.notifyInvalidated()}};addEventListener("message",t),this.onInvalidated(()=>removeEventListener("message",t))}};v(C,"SCRIPT_STARTED_MESSAGE_TYPE",F("wxt:content-script-started"));let N=C;function J(){}function T(r,...e){}const q={debug:(...r)=>T(console.debug,...r),log:(...r)=>T(console.log,...r),warn:(...r)=>T(console.warn,...r),error:(...r)=>T(console.error,...r)};return(async()=>{try{const{main:r,...e}=w,n=new N("content",e);return await r(n)}catch(r){throw q.error('The content script "content" crashed on startup!',r),r}})()})();
content;