# October 9 animation and interaction corrections

## Groq provider update

The chatbot now defaults to Groq `llama-3.1-8b-instant` using the existing `AI_API_KEY` field in `backend/.env`. The redundant `GROQ_API_KEY` field was removed without changing the configured key. Docker reads `AI_API_KEY` from the project-root `.env`. Groq Chat Completions JSON mode is validated locally; professional claims and actions still come from verified records. See [CHATBOT_SETUP.md](CHATBOT_SETUP.md).

Groq update verification: **28 backend tests passed**, including key-only environment configuration, the requested model/API format, valid fact selection, follow-up history, invalid/truncated output, missing key and authentication error handling. **3 frontend chat tests passed**, including the Groq label and existing chat actions/closing. TypeScript/Vite production build passed. Tests used mocked provider replies and isolated SQLite; they did not send a live request or alter the configured production database.

The existing portfolio was extended in place. Sections, resume content, photo, suit materials, shared chat controls and the backend contract are preserved. Full visual acceptance remains incomplete; evidence and limits are recorded below.

## Root causes and changed files

| Files | Cause and correction |
| --- | --- |
| `frontend/src/three/CharacterModel.tsx`, `SpiderController.tsx` | Whole-arm waving lacked an elbow pivot and could cross the mask. Added forearm articulation, bounded rotations and a forward shoulder offset. Normal depth testing and resting geometry/materials are preserved. Hanging characters do not wave. |
| `frontend/src/three/SpiderScene.tsx`, `frontend/src/styles/upgrade.css` | The fixed introduction panel did not follow the character. A short dismissible glass bubble now follows beside the head, clamps inside the viewport and disappears automatically. |
| `frontend/src/companion/engine.ts` | Repeated wave selection, stale gaze and unsupported routes re-entering navbar mode. Added session intro state, a 120-second rare-wave cooldown, explicit settling/detachment, local route retries and neutral scroll gaze. Ordinary unsupported travel no longer starts navbar mode. |
| `frontend/src/companion/planner.ts` | Web selection preceded a simple jump decision. Clear short jumps now take priority; continuous edges on one card allow web-free crawling. Web travel favors shorter local elevated attachments. Swing radius uses actual anchor/start geometry with clearance checks and release into a landing arc. |
| `frontend/src/companion/runtime.ts` | Section identity and anchor measurements could lag after scrolling. Dominant visible section updates periodically and at scroll end, followed by fresh anchor measurement. Adjacent visible objects remain eligible. Recent objects, destinations, web anchors and regions discourage repetition. |
| `frontend/src/three/AnchorManager.ts` | Narrow timeline nodes and even button top-edge perches were rejected; previous impacts were barely visible. Broadened real-object eligibility and protected button interiors while allowing top borders. Added target-specific landing, tension and release reactions through `SPIDEY_OBJECT_IMPACT`. |
| `frontend/src/components/AssistantPanel.tsx` | No outside-pointer handling. A container ref now closes on outside pointer-down, exempts panel/shared triggers, cleans up listeners and preserves focus behavior. X and Escape remain supported. |

Effects carry object/target IDs, velocity, direction, intensity and interaction kind. Additive Web Animations transforms preserve underlying GSAP transforms. Bounded effects end at identity, change no layout properties, cancel only their own previous animation and respect reduced motion.

The explicit trace includes `SCROLL_STOP → ANCHOR_SELECTION → NAVBAR_DETACH → MOVE → WEB_RELEASE → LAND → ROAM`. Release timing varies with a local rope versus jump route. Cursor/AI interruptions still finish at a supported stop; position changes remain bounded.

Development-only `?spideyDebug` reports state, section, scroll/cursor activity, support/destination, rope geometry, route/region history, available region coverage, impact events and chat state. Its Preview wave button extends inspection time for the actual rig pose. Debug elements are guarded by `import.meta.env.DEV` and do not execute in production.

## Checks performed

- Full frontend suite: **35 passed** (2 content tests and 33 TypeScript/React tests). Includes actual HTTP to an isolated FastAPI assistant/contact fixture. The fixture uses explicit retrieval mode, not a live provider.
- Final anchor/movement subset after button-edge correction: **29 passed**. Covers target-only effects, transform composition/cleanup, button interiors, continuous-edge crawl versus separate-card jump, scroll detachment, stale gaze, valid ropes, bounded reversal, safe interruptions, region diversity and shoulder mapping.
- Final movement rerun after recording scroll-navbar history: **24 passed**.
- TypeScript/Vite production build passed, 412 modules. Lazy 3D scene approximately 246.8 kB gzip; the large-chunk warning remains.
- Tests changed: `frontend/tests/anchors.test.ts`, `companion.test.ts`, `assistant.test.tsx`.
- Backend code was not changed in this correction. Earlier backend/provider checks are historical evidence, not a new live-provider verification.

## Actual browser observations

The running application at `http://127.0.0.1:5173/` was inspected through the in-app browser using screenshots and live diagnostics.

- Home: observed autonomous movement and real heading landings.
- Projects: observed navbar attachment during scrolling, detachment and local heading exploration. Release, movement, landing and roaming appeared in the trace; it did not return to Home.
- Experience: observed detachment/release and a local heading landing before navigating onward.
- Skills: observed section detection, detachment/release and local travel. The final skill-button edge correction passed geometry tests but node landings were not visually rechecked.
- Wave: the actual portfolio camera showed the hand beside the mask, clear of its center and torso. The short bubble appeared beside the character. [Saved screenshot](verification/wave-preview.jpg) includes development diagnostics and extended pose inspection.
- Chat: typing retained the panel; an outside pointer click changed shared trigger `aria-expanded` to `false`. Automated tests verify Escape, panel/trigger exceptions, suggested-question pointer handling and listener cleanup.

## Remaining acceptance limits

Further browser inspection was stopped by automatic approval review because the account reached its usage limit. This was a review-availability failure, not a finding that localhost was unsafe. No alternate browser/capture route bypassed the rejection.

The viewport override returned successfully but the page remained about 673 × 420 CSS pixels. Exact-width desktop/mobile visual acceptance, physical mobile performance and final observations in About, Open Source and Contact remain unverified. Multi-width geometry tests do not establish GPU performance or visual quality.

Edge crawling is a procedural supported shuffle with alternating whole-limb motion, not an authored wall-crawling clip. The rig lacks wrist/finger and knee bones; wall climbing and rolling landings are not implemented. Impact/tension events were observed in diagnostics and tested at the animation boundary; visual amplitude still needs acceptance across all sections and devices.

Live AI-provider success and configured PostgreSQL connectivity remain unverified. Earlier setup found no AI key/model and a failed PostgreSQL connection. See [CHATBOT_SETUP.md](CHATBOT_SETUP.md). The preview rendered the resume snapshot while its normal API was unavailable.
