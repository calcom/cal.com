/**
 * @file meetingTokenPatch.ts
 * @description Documented patch showing the exact additions needed in the
 * Daily meeting token creation flow at:
 *   packages/app-store/dailyvideo/lib/VideoApiAdapter.ts
 *
 * This file is a REFERENCE — it is not executed directly. It shows the
 * before-and-after of the meeting token properties object so teammates
 * can see precisely what changes and why.
 *
 * TARGET LOCATIONS in VideoApiAdapter.ts:
 *   1. createOrUpdateMeeting() — lines ~250-257 (regular meetings)
 *   2. createInstantMeeting() — lines ~374-381 (instant meetings)
 */

/**
 * ═══════════════════════════════════════════════════════════════════
 * EXISTING HOST TOKEN PAYLOAD (no changes needed to these fields)
 * ═══════════════════════════════════════════════════════════════════
 *
 * The following properties are ALREADY SET in both createOrUpdateMeeting()
 * and createInstantMeeting(). No modification is required:
 *
 *   {
 *     properties: {
 *       room_name: dailyEvent.name,
 *       exp: dailyEvent.config.exp,
 *       is_owner: true,              // ← ALREADY PRESENT
 *       enable_recording_ui: false,   // ← ALREADY PRESENT
 *     },
 *   }
 *
 * is_owner: true
 *   Per Daily.co docs, meeting tokens with is_owner grant the participant
 *   "owner" privileges. This is required for the host to have transcription
 *   admin capabilities (start/stop/configure transcription in the call).
 *   Ref: https://docs.daily.co/reference/rest-api/meeting-tokens
 *
 * enable_recording_ui: false
 *   Already set by Cal.com to suppress the default Daily recording UI
 *   in favor of Cal.com's own recording controls.
 */

/**
 * ═══════════════════════════════════════════════════════════════════
 * NEW ADDITION: auto_start_transcription
 * ═══════════════════════════════════════════════════════════════════
 *
 * Add `auto_start_transcription: false` to the host token properties.
 * This ensures transcription does NOT begin automatically when the host
 * joins. Instead, the user must explicitly click the CC button in the
 * caption overlay UI (built by the frontend team) to start captions.
 *
 * Why this matters:
 *   - Privacy: Participants should consent before their speech is transcribed
 *   - Cost: Deepgram charges per minute of transcription; auto-starting
 *     would consume quota even when captions are not needed
 *   - UX: Aligns with the accessibility feature being opt-in per meeting
 *
 * Ref: https://docs.daily.co/reference/rest-api/meeting-tokens
 */

// ── PATCH: createOrUpdateMeeting() (regular meetings) ─────────────
// Location: VideoApiAdapter.ts, inside createOrUpdateMeeting(), ~line 250
//
// BEFORE:
//   const meetingToken = await postToDailyAPI("/meeting-tokens", {
//     properties: {
//       room_name: dailyEvent.name,
//       exp: dailyEvent.config.exp,
//       is_owner: true,
//       enable_recording_ui: false,
//     },
//   }).then(meetingTokenSchema.parse);
//
// AFTER:
//   const meetingToken = await postToDailyAPI("/meeting-tokens", {
//     properties: {
//       room_name: dailyEvent.name,
//       exp: dailyEvent.config.exp,
//       is_owner: true,
//       enable_recording_ui: false,
//       auto_start_transcription: false,  // ← NEW: captions start only on CC click
//     },
//   }).then(meetingTokenSchema.parse);

// ── PATCH: createInstantMeeting() (instant meetings) ──────────────
// Location: VideoApiAdapter.ts, inside createInstantMeeting(), ~line 374
//
// BEFORE:
//   const meetingToken = await postToDailyAPI("/meeting-tokens", {
//     properties: {
//       room_name: dailyEvent.name,
//       exp: dailyEvent.config.exp,
//       is_owner: true,
//       enable_recording_ui: false,
//     },
//   }).then(meetingTokenSchema.parse);
//
// AFTER:
//   const meetingToken = await postToDailyAPI("/meeting-tokens", {
//     properties: {
//       room_name: dailyEvent.name,
//       exp: dailyEvent.config.exp,
//       is_owner: true,
//       enable_recording_ui: false,
//       auto_start_transcription: false,  // ← NEW: captions start only on CC click
//     },
//   }).then(meetingTokenSchema.parse);

export {};
