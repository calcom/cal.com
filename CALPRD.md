Cal Video Live Captions for Deaf and Hard of Hearing Users                                                                          
                                                                                                                                      
  Group 5 | Pursuit L3 Cycle 1 | April 2026                                                                                           
                                                                                                                                      
  ---                                                                                                                                 
  What are we building?
                                                                                                                                      
  A live caption feature inside Cal Video, Cal.com's native video conferencing tool. When a user enables captions, real-time text
  transcription appears on screen during the call, powered by Daily.co's existing startTranscription() API. The feature includes a CC 
  toggle button in the call controls, a caption overlay displaying speaker name and spoken text, and a persistent user preference
  stored in the database so the setting carries over between meetings.                                                                
                  
  ---
  Who is it for?
                
  Deaf and hard of hearing users who use Cal.com to schedule and host meetings. Cal.com's tagline is "scheduling infrastructure for
  absolutely everyone" but currently has zero accessibility options in its video product. This feature makes that tagline true for the
   430 million people globally with disabling hearing loss and the 37.5 million Americans with some degree of hearing difficulty.
                                                                                                                                      
  ---             
  What does it need to do?
                          
  Database layer (Yaasameen)
  - Add a liveCaptionsEnabled boolean field to the user settings model in Prisma                                                      
  - Create the migration file                                                                                                         
                                                                                                                                      
  API layer (Gary)                                                                                                                    
  - A tRPC endpoint to read the user's liveCaptionsEnabled preference                                                                 
  - A tRPC endpoint to update the user's liveCaptionsEnabled preference
                                                                                                                                      
  Frontend layer (Michael)                                                                                                            
  - A CC toggle button inside the Cal Video call controls
  - A caption overlay that displays speaker name and live transcription text                                                          
  - An Accessibility section in user Settings with a toggle to save the preference
                                                                                                                                      
  External services layer (Manny)                                                                                                     
  - On call join, read the user's saved preference from the API                                                                       
  - If enabled, call callObject.startTranscription() via Daily.co                                                                     
  - Handle transcription-message events and feed text to the caption overlay                                                          
  - Call stopTranscription() on call end and handle errors gracefully                                                                 
                                                                                                                                      
  ---                                                                                                                                 
  What are we NOT building?                                                                                                           
                                                                                                                                      
  - Caption customization (font size, color themes, position) - future iteration
  - Support for languages other than English - Daily.co supports it but out of scope for four days                                    
  - CART integration (professional human captioning) - a separate future feature                                                      
  - Caption storage or post-meeting transcripts - Daily.co already has this separately                                                
  - Accessibility settings beyond live captions - screen reader improvements, keyboard nav, etc. are out of scope                     
  - Changes to any third-party integrations like Zoom or Google Meet - Cal Video only                                                 
  - A new video infrastructure - we are using Daily.co's existing API, not rebuilding anything     
