var content=(function(){"use strict";var Y=Object.defineProperty;var J=(w,g,v)=>g in w?Y(w,g,{enumerable:!0,configurable:!0,writable:!0,value:v}):w[g]=v;var x=(w,g,v)=>J(w,typeof g!="symbol"?g+"":g,v);var R,j;const w={matches:["<all_urls>"],main(){if(document.getElementById("cal-companion-sidebar"))return;window.location.hostname==="mail.google.com"&&D();let e=!1,n=!0;const t=document.createElement("div");t.id="cal-companion-sidebar",t.style.position="fixed",t.style.top="0",t.style.right="0",t.style.width="400px",t.style.height="100vh",t.style.zIndex="2147483647",t.style.backgroundColor="white",t.style.border="1px solid #ccc",t.style.borderTop="none",t.style.borderBottom="none",t.style.boxShadow="-2px 0 10px rgba(0,0,0,0.1)",t.style.transition="transform 0.3s ease-in-out",t.style.transform="translateX(100%)",t.style.display="none";const a=document.createElement("iframe");a.src="http://localhost:8081",a.style.width="100%",a.style.height="100%",a.style.border="none",a.style.borderRadius="0",t.appendChild(a);const r=document.createElement("div");r.id="cal-companion-buttons",r.style.position="fixed",r.style.top="20px",r.style.right="420px",r.style.display="flex",r.style.flexDirection="column",r.style.gap="8px",r.style.zIndex="2147483648",r.style.transition="right 0.3s ease-in-out",r.style.display="none";const o=document.createElement("button");o.innerHTML="◀",o.style.width="40px",o.style.height="40px",o.style.borderRadius="50%",o.style.border="none",o.style.backgroundColor="rgba(0, 0, 0, 0.5)",o.style.backdropFilter="blur(10px)",o.style.color="white",o.style.cursor="pointer",o.style.fontSize="16px",o.style.boxShadow="0 2px 8px rgba(0,0,0,0.2)",o.style.transition="all 0.2s ease",o.style.display="flex",o.style.alignItems="center",o.style.justifyContent="center",o.title="Toggle sidebar";const s=document.createElement("button");s.innerHTML=`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L1 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1 1L13 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,s.style.width="40px",s.style.height="40px",s.style.borderRadius="50%",s.style.border="none",s.style.backgroundColor="rgba(0, 0, 0, 0.5)",s.style.backdropFilter="blur(10px)",s.style.color="white",s.style.cursor="pointer",s.style.fontSize="16px",s.style.boxShadow="0 2px 8px rgba(0,0,0,0.2)",s.style.transition="all 0.2s ease",s.style.display="flex",s.style.alignItems="center",s.style.justifyContent="center",s.title="Close sidebar",o.addEventListener("mouseenter",()=>{o.style.transform="scale(1.1)"}),o.addEventListener("mouseleave",()=>{o.style.transform="scale(1)"}),s.addEventListener("mouseenter",()=>{s.style.transform="scale(1.1)"}),s.addEventListener("mouseleave",()=>{s.style.transform="scale(1)"}),o.addEventListener("click",()=>{n||(e=!e,e?(t.style.transform="translateX(0)",r.style.right="420px",o.innerHTML=`<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`):(t.style.transform="translateX(100%)",r.style.right="20px",o.innerHTML=`<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L8 6L13 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 1L1 6L6 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`))}),s.addEventListener("click",()=>{n=!0,e=!1,t.style.display="none",r.style.display="none"}),r.appendChild(o),r.appendChild(s),document.body.appendChild(t),document.body.appendChild(r),chrome.runtime.onMessage.addListener((C,_,H)=>{C.action==="icon-clicked"&&(n?(n=!1,e=!0,t.style.display="block",r.style.display="flex",t.style.transform="translateX(0)",r.style.right="420px",o.innerHTML=`<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`):(e=!e,e?(t.style.transform="translateX(0)",r.style.right="420px",o.innerHTML=`<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1 11L6 6L1 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 11L13 6L8 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`):(t.style.transform="translateX(100%)",r.style.right="20px",o.innerHTML=`<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 1L8 6L13 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 1L1 6L6 11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`)),H({success:!0}))});function D(){function C(){document.querySelectorAll('div[role="button"][data-tooltip="Send ‪(Ctrl-Enter)‬"], div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"]').forEach($=>{var V;const k=$.closest("td");if(!k)return;const F=k.closest("tr");if(!F||((V=k.parentElement)==null?void 0:V.querySelector(".cal-companion-gmail-button"))||!($.closest('[role="dialog"]')||$.closest(".nH")))return;const y=document.createElement("td");y.className="cal-companion-gmail-button",y.style.cssText=`
            padding: 0;
            margin: 0;
            vertical-align: middle;
            border: none;
          `;const p=document.createElement("div");p.style.cssText=`
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
          `,p.innerHTML=`
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.4688 5H17.0887V13.76H15.4688V5Z" fill="white"/>
              <path d="M10.918 13.9186C10.358 13.9186 9.84198 13.7746 9.36998 13.4866C8.89798 13.1906 8.52198 12.7946 8.24198 12.2986C7.96998 11.8026 7.83398 11.2586 7.83398 10.6666C7.83398 10.0746 7.96998 9.53063 8.24198 9.03463C8.52198 8.53063 8.89798 8.13062 9.36998 7.83462C9.84198 7.53862 10.358 7.39062 10.918 7.39062C11.43 7.39062 11.842 7.48662 12.154 7.67862C12.474 7.87062 12.722 8.14662 12.898 8.50662V7.52262H14.506V13.7626H12.934V12.7426C12.75 13.1186 12.498 13.4106 12.178 13.6186C11.866 13.8186 11.446 13.9186 10.918 13.9186ZM9.45398 10.6546C9.45398 10.9746 9.52598 11.2746 9.66998 11.5546C9.82198 11.8266 10.026 12.0466 10.282 12.2146C10.546 12.3746 10.846 12.4546 11.182 12.4546C11.526 12.4546 11.83 12.3746 12.094 12.2146C12.366 12.0546 12.574 11.8386 12.718 11.5666C12.862 11.2946 12.934 10.9946 12.934 10.6666C12.934 10.3386 12.862 10.0386 12.718 9.76662C12.574 9.48662 12.366 9.26662 12.094 9.10663C11.83 8.93863 11.526 8.85463 11.182 8.85463C10.846 8.85463 10.546 8.93863 10.282 9.10663C10.018 9.26662 9.81398 9.48262 9.66998 9.75462C9.52598 10.0266 9.45398 10.3266 9.45398 10.6546Z" fill="white"/>
              <path d="M4.68078 13.919C3.86478 13.919 3.12078 13.727 2.44878 13.343C1.78478 12.951 1.26078 12.423 0.876781 11.759C0.492781 11.095 0.300781 10.367 0.300781 9.57503C0.300781 8.77503 0.484781 8.04303 0.852781 7.37903C1.22878 6.70703 1.74878 6.17903 2.41278 5.79503C3.07678 5.40303 3.83278 5.20703 4.68078 5.20703C5.36078 5.20703 5.94478 5.31503 6.43278 5.53103C6.92878 5.73903 7.36878 6.07103 7.75278 6.52703L6.56478 7.55903C6.06078 7.03103 5.43278 6.76703 4.68078 6.76703C4.15278 6.76703 3.68878 6.89503 3.28878 7.15103C2.88878 7.39903 2.58078 7.73903 2.36478 8.17103C2.14878 8.59503 2.04078 9.06303 2.04078 9.57503C2.04078 10.087 2.14878 10.555 2.36478 10.979C2.58878 11.403 2.90078 11.739 3.30078 11.987C3.70878 12.235 4.18078 12.359 4.71678 12.359C5.50078 12.359 6.14078 12.087 6.63678 11.543L7.86078 12.587C7.52478 12.995 7.08478 13.319 6.54078 13.559C6.00478 13.799 5.38478 13.919 4.68078 13.919Z" fill="white"/>
            </svg>
          `,p.addEventListener("mouseenter",()=>{p.style.backgroundColor="#333333",p.style.transform="scale(1.05)"}),p.addEventListener("mouseleave",()=>{p.style.backgroundColor="#000000",p.style.transform="scale(1)"}),p.addEventListener("click",d=>{d.preventDefault(),d.stopPropagation();const u=document.querySelector(".cal-companion-gmail-menu");if(u){u.remove();return}const l=document.createElement("div");l.className="cal-companion-gmail-menu",l.style.cssText=`
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
            `,l.innerHTML=`
              <div style="padding: 16px; text-align: center; color: #5f6368;">
                Loading event types...
              </div>
            `,G(l),y.style.position="relative",y.appendChild(l),setTimeout(()=>{document.addEventListener("click",function c(E){l.contains(E.target)||(l.remove(),document.removeEventListener("click",c))})},0)});async function G(d){var u;try{if(!((u=chrome.runtime)!=null&&u.id))throw new Error("Extension context invalidated. Please reload the page.");const l=await new Promise((h,L)=>{try{chrome.runtime.sendMessage({action:"fetch-event-types"},m=>{chrome.runtime.lastError?L(new Error(chrome.runtime.lastError.message)):m&&m.error?L(new Error(m.error)):h(m)})}catch(m){L(m)}});let c=[];if(l&&l.data?c=l.data:Array.isArray(l)?c=l:c=[],Array.isArray(c)||(c=[]),d.innerHTML="",c.length===0){d.innerHTML=`
                  <div style="padding: 16px; text-align: center; color: #5f6368;">
                    No event types found
                  </div>
                `;return}const E=document.createElement("div");E.style.cssText=`
                padding: 12px 16px;
                border-bottom: 1px solid #e8eaed;
                background-color: #f8f9fa;
                font-weight: 500;
                color: #3c4043;
                font-size: 13px;
              `,E.textContent="Select an event type to share",d.appendChild(E);try{c.forEach((h,L)=>{if(!h||typeof h!="object")return;const m=h.title||"Untitled Event",W=h.length||h.duration||30,Z=h.description||"No description",f=document.createElement("div");f.style.cssText=`
                    padding: 12px 16px;
                    display: flex;
                    flex-direction: column;
                    cursor: pointer;
                    transition: background-color 0.1s ease;
                    border-bottom: ${L<c.length-1?"1px solid #e8eaed":"none"};
                  `,f.innerHTML=`
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                      <span style="margin-right: 8px; font-size: 14px;">📅</span>
                      <span style="color: #3c4043; font-weight: 500;">${m}</span>
                    </div>
                    <div style="color: #5f6368; font-size: 12px; margin-left: 22px;">
                      ${W}min • ${Z}
                    </div>
                  `,f.addEventListener("mouseenter",()=>{f.style.backgroundColor="#f8f9fa"}),f.addEventListener("mouseleave",()=>{f.style.backgroundColor="transparent"}),f.addEventListener("click",O=>{O.stopPropagation(),d.remove(),X(h)}),d.appendChild(f)})}catch{d.innerHTML=`
                  <div style="padding: 16px; text-align: center; color: #ea4335;">
                    Error displaying event types
                  </div>
                `}}catch(l){d.innerHTML=`
                <div style="padding: 16px; text-align: center; color: #ea4335;">
                  Failed to load event types
                </div>
                <div style="padding: 0 16px; text-align: center; color: #5f6368; font-size: 12px;">
                  Error: ${l.message}
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
              `}}function X(d){var l,c;const u=`https://cal.com/${((c=(l=d.users)==null?void 0:l[0])==null?void 0:c.username)||"user"}/${d.slug}`;navigator.clipboard.writeText(u).then(()=>{z("Link copied to clipboard!","success")}).catch(()=>{z("Failed to copy link","error")})}function z(d,u){const l=document.createElement("div");l.style.cssText=`
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 12px 16px;
              background: ${u==="success"?"#137333":"#d93025"};
              color: white;
              border-radius: 4px;
              font-family: "Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif;
              font-size: 14px;
              z-index: 10000;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            `,l.textContent=d,document.body.appendChild(l),setTimeout(()=>{l.remove()},3e3)}p.title="Schedule with Cal.com",y.appendChild(p),k.nextSibling?F.insertBefore(y,k.nextSibling):F.appendChild(y)})}setTimeout(C,1e3),new MutationObserver(()=>{C()}).observe(document.body,{childList:!0,subtree:!0});let H=window.location.href;setInterval(()=>{window.location.href!==H&&(H=window.location.href,setTimeout(C,500))},1e3)}}};function g(i){return i}const S=(j=(R=globalThis.browser)==null?void 0:R.runtime)!=null&&j.id?globalThis.browser:globalThis.chrome;function T(i,...e){}const P={debug:(...i)=>T(console.debug,...i),log:(...i)=>T(console.log,...i),warn:(...i)=>T(console.warn,...i),error:(...i)=>T(console.error,...i)},I=class I extends Event{constructor(e,n){super(I.EVENT_NAME,{}),this.newUrl=e,this.oldUrl=n}};x(I,"EVENT_NAME",A("wxt:locationchange"));let N=I;function A(i){var e;return`${(e=S==null?void 0:S.runtime)==null?void 0:e.id}:content:${i}`}function U(i){let e,n;return{run(){e==null&&(n=new URL(location.href),e=i.setInterval(()=>{let t=new URL(location.href);t.href!==n.href&&(window.dispatchEvent(new N(t,n)),n=t)},1e3))}}}const b=class b{constructor(e,n){x(this,"isTopFrame",window.self===window.top);x(this,"abortController");x(this,"locationWatcher",U(this));x(this,"receivedMessageIds",new Set);this.contentScriptName=e,this.options=n,this.abortController=new AbortController,this.isTopFrame?(this.listenForNewerScripts({ignoreFirstEvent:!0}),this.stopOldScripts()):this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(e){return this.abortController.abort(e)}get isInvalid(){return S.runtime.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(e){return this.signal.addEventListener("abort",e),()=>this.signal.removeEventListener("abort",e)}block(){return new Promise(()=>{})}setInterval(e,n){const t=setInterval(()=>{this.isValid&&e()},n);return this.onInvalidated(()=>clearInterval(t)),t}setTimeout(e,n){const t=setTimeout(()=>{this.isValid&&e()},n);return this.onInvalidated(()=>clearTimeout(t)),t}requestAnimationFrame(e){const n=requestAnimationFrame((...t)=>{this.isValid&&e(...t)});return this.onInvalidated(()=>cancelAnimationFrame(n)),n}requestIdleCallback(e,n){const t=requestIdleCallback((...a)=>{this.signal.aborted||e(...a)},n);return this.onInvalidated(()=>cancelIdleCallback(t)),t}addEventListener(e,n,t,a){var r;n==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),(r=e.addEventListener)==null||r.call(e,n.startsWith("wxt:")?A(n):n,t,{...a,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),P.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){window.postMessage({type:b.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:Math.random().toString(36).slice(2)},"*")}verifyScriptStartedEvent(e){var r,o,s;const n=((r=e.data)==null?void 0:r.type)===b.SCRIPT_STARTED_MESSAGE_TYPE,t=((o=e.data)==null?void 0:o.contentScriptName)===this.contentScriptName,a=!this.receivedMessageIds.has((s=e.data)==null?void 0:s.messageId);return n&&t&&a}listenForNewerScripts(e){let n=!0;const t=a=>{if(this.verifyScriptStartedEvent(a)){this.receivedMessageIds.add(a.data.messageId);const r=n;if(n=!1,r&&(e!=null&&e.ignoreFirstEvent))return;this.notifyInvalidated()}};addEventListener("message",t),this.onInvalidated(()=>removeEventListener("message",t))}};x(b,"SCRIPT_STARTED_MESSAGE_TYPE",A("wxt:content-script-started"));let B=b;function K(){}function M(i,...e){}const q={debug:(...i)=>M(console.debug,...i),log:(...i)=>M(console.log,...i),warn:(...i)=>M(console.warn,...i),error:(...i)=>M(console.error,...i)};return(async()=>{try{const{main:i,...e}=w,n=new B("content",e);return await i(n)}catch(i){throw q.error('The content script "content" crashed on startup!',i),i}})()})();
content;