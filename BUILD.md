# Señor Rosa Workshop Build Contract

## Purpose

This file supplements `enter.html`, `workshop.html`, and `training.html`. Treat those HTML files as product/UX requirements and this document as the implementation contract. Do not blindly copy prototype markup when the existing Señor Rosa codebase has a better pattern. Preserve the site's existing identity and architecture where practical.


## Brand continuity — do not rebrand workshop/training

`/enter`, `/workshop`, and `/training` are part of the existing Señor Rosa website. They are not separate products or brands.

Implementation requirements:

- Preserve the existing Señor Rosa visual identity, header, navigation, footer, typography, pink-forward palette, spacing, cards, buttons, humor, and overall tone.
- Reuse the existing site's CSS, components, and visual patterns wherever practical before adding page-specific styling.
- Do not create a separate workshop logo, training logo, course brand, LMS look, SaaS dashboard aesthetic, or corporate training microsite.
- `/workshop` and `/training` can have layouts suited to their functions, but they should look and feel like native Señor Rosa pages at first glance.
- Do not redesign the rest of senorrosa.com in order to accommodate these routes.
- Jake's Home Services is a fictional training sandbox only. Its pink-and-black Doberman branding belongs inside Jake-specific training assets/content and must not replace or compete with the Señor Rosa page identity.
- If prototype HTML styling conflicts with the existing Señor Rosa design system, preserve the prototype's product intent/content and prefer the existing Señor Rosa design language.
- Mobile-first improvements should extend the current Señor Rosa experience rather than introduce a new design system.

## Current goal

Build the first production-ready Small Business AI Workshop flow for Señor Rosa. Keep V1 intentionally small, understandable, and maintainable. This is a 10-person local workshop, not an LMS or enterprise event platform.

## Route responsibilities

### `/enter`
- Entry/branch page for people arriving from business cards, QR codes, or direct outreach.
- Route visitors toward the workshop or the broader Señor Rosa/about experience.
- Do not put payment, registration, or training logic here.

### `/workshop`
- Public mobile-first sales and registration page for the currently promoted workshop event.
- Show who the workshop is for, what they will do, agenda, requirements, price, capacity, cancellation policy, and registration CTA.
- It should render event facts from reusable configuration/data rather than hard-coding one September event.
- The first production event is confirmed for Saturday, September 26, 2026 at Broadway Commons, Room 403 Europe, 1300 Broadway St NE, Salem, OR 97301. Public event time is 1:00 PM–4:00 PM. Room setup access begins at 12:45 PM and teardown runs through 4:15 PM. Parking/arrival instructions and Square production values may still be finalized separately.
- Use `2026-09-26-broadway-commons` as the first event ID/slug unless the production codebase has an existing event-ID convention that should be preserved.

### `/training`
- Lightweight student-facing class handout/workbench shared with registered attendees.
- Keep it unlisted from normal public navigation rather than authenticated.
- No login, attendee token, encoded URL, access activation, student progress tracking, instructor mode, timers, synchronized state, quizzes, badges, or LMS features.
- Treat the unlisted URL as a convenience/privacy measure, not a security boundary. If someone intentionally shares it, that is acceptable for V1.
- The training page remains useful before, during, and after class.

## Event defaults / known business rules

- Price: `$50` workshop admission.
- Capacity: `10` paid attendees.
- Confirmed venue: `Broadway Commons`, Room `403 Europe`, `1300 Broadway St NE, Salem, OR 97301`.
- Confirmed date: `Saturday, September 26, 2026`.
- Public event time: `1:00 PM–4:00 PM`.
- Instructor/admin room setup access: `12:45–1:00 PM`.
- Participant arrival/check-in: `1:00–1:15 PM`.
- Participant instruction window: `1:15–4:00 PM` (2 hours 45 minutes).
- Instructor/admin teardown/closeout: `4:00–4:15 PM`.
- Public event copy should advertise `1:00 PM–4:00 PM`; the detailed agenda may show instruction beginning at 1:15 PM after arrival/check-in.
- ChatGPT Plus is required and purchased separately from OpenAI.
- Attendees also need a Google account, Google Drive access, a Netlify account, laptop, and charger.
- Cancellation >48 hours before workshop: refund available.
- Cancellation <=48 hours before workshop: no refund.
- If Señor Rosa cancels: full refund and registered attendees still receive/retain training materials.

## Registration, payment, and confirmation — simplified V1

The first workshop is a 10-seat, $50 pilot. The website should automate only what is needed to register a buyer, take a Square-secured payment, record the paid registration, and confirm the transaction to both the attendee and the organizer. Do not build a ticketing platform, CRM, LMS, or automated training-access system.

### Minimal registration data

A simple Google Sheet is acceptable as the V1 registration source of truth. Keep the schema small:

- `registration_id`
- `event_id`
- `created_at`
- `first_name`
- `last_name`
- `email`
- `phone` (optional)
- `business_name` (optional)
- `square_payment_id`
- `payment_status`
- `cancellation_status`
- `refund_status`

Do not require industry profiles, business size, referral surveys, detailed problem statements, or other marketing/intake fields during checkout. If richer class-prep information is useful later, collect it separately and intentionally.

### Payment flow

Preferred V1 flow:

1. Visitor completes the short registration form on `/workshop`.
2. Square Web Payments SDK (or the simplest appropriate Square on-page payment component) securely collects/tokenizes the payment method. Raw card data must never pass through Señor Rosa code or storage.
3. A Netlify Function creates/records the pending registration and calls the Square Payments API server-side.
4. On successful Square response, mark the registration paid.
5. Show an immediate on-site success/confirmation state.
6. Send the attendee a Señor Rosa workshop confirmation/onboarding email.
7. Send the organizer a paid-registration confirmation with attendee name/email and payment reference.
8. Square may separately send its normal payment receipt.
9. Close/disable registration after 10 paid registrations.

If Square's current production requirements make an embedded payment materially less reliable than Square-hosted checkout, stop and surface that tradeoff to the owner rather than silently adding complexity. The product intent is a simple purchase experience that feels like part of senorrosa.com.

### Square developer configuration — current state

Square Developer setup has been created for this project.

- Square application name: `Señor Rosa Workshop`.
- Intended audience/setup: owner-built integration for the Señor Rosa seller account (`Myself`).
- Enabled build goal: `Accept payments` only. Do not add Orders, Customers, Catalog, Inventory, Team, POS, Reader, or other Square product dependencies for V1 unless they become technically necessary.
- Development environment: `Sandbox`.
- Sandbox Location ID: `LH741GDGT1H7M`.
- Sandbox Application ID: already issued in the Square Developer Console. Treat it as configuration and copy the exact current value directly from Square when wiring the site; do not invent or transcribe a truncated screenshot value.
- Sandbox Access Token: already issued in the Square Developer Console. It is a secret; never write it into this file, source code, client-side JavaScript, ChatGPT/Codex prompts, screenshots, or Git. Put it directly into a Netlify environment variable.
- Production Application ID, Production Location ID, and Production Access Token are intentionally not configured in this document yet. Switch to production only after the complete Sandbox payment flow succeeds.
- No Square catalog item, inventory object, invoice, or manually pre-created payment object is required for V1. The site/backend creates the $50 payment through Square's supported payment flow when the attendee registers.

Recommended environment/config names for implementation:

- `SQUARE_ENVIRONMENT=sandbox`
- `SQUARE_APPLICATION_ID` — exact Sandbox Application ID from Square Developer Console.
- `SQUARE_LOCATION_ID=LH741GDGT1H7M`
- `SQUARE_ACCESS_TOKEN` — secret Sandbox Access Token, set directly in Netlify.


### Participant-facing vs. admin-facing UX

`/workshop` must speak to the buyer, not describe the implementation.

Participant-facing registration copy should be simple:
- `$50`
- `10 seats`
- short contact form
- secure Square payment
- clear confirmation that the seat is reserved
- what happens next

Do **not** expose implementation language such as Google Sheet rows, Netlify Functions, Square tokens/payment IDs, webhooks, environment variables, server verification, organizer notification plumbing, or capacity race-condition logic in visible page copy. Those are implementation requirements for `BUILD.md` and code comments/documentation, not sales copy.

After successful payment, the visible site state should say the equivalent of:
- `You're in / Your seat is reserved`
- check email for confirmation and arrival details
- use the supplied unlisted `/training` link for pre-class setup/resources
- bring laptop/charger/business materials
- contact `info@senorrosa.com` with questions

The organizer-side confirmation, registration record, payment verification, and operational metadata happen in the background and should not be presented as participant tasks.

### What happens after payment

The attendee confirmation should contain only useful event information:

- attendee name
- workshop name
- date/time/location/parking when known
- cancellation policy
- laptop/account requirements
- unlisted `/training` URL
- calendar link or invite if simple to provide
- contact/reply information

No attendee account is created. No training token is generated. No training-access state is stored or activated. `/training` is a static unlisted workshop resource page.

### Netlify / secrets

- Square access tokens/secrets belong in Netlify environment variables.
- Google/API credentials (if a Google Sheet is used) belong in Netlify environment variables or another appropriate server-side secret mechanism.
- Email-provider secrets belong in Netlify environment variables.
- Secrets must never appear in client-side JS, committed source, prototype HTML, query strings, or public responses.
- Server-side payment verification is required before a registration is treated as paid.

### Email

Desired visible sender/reply-to: `info@senorrosa.com`.

The current mailbox setup should not be assumed to provide a transactional email API. Use the simplest supported mail provider/configuration needed to send two messages after verified payment:

1. attendee workshop confirmation/onboarding;
2. organizer paid-registration confirmation.

Do not add drip campaigns, reminders, marketing sequences, automated training provisioning, or other email workflows for V1.

## Training assets / Jake sandbox

Jake's fictional business is the common safe training sandbox. The exact assets can be generated/plugged in later, so create clean replaceable paths/placeholders.

### Jake's Home Services
- Fictional pink-and-black Doberman business.
- Tagline: `Serious service. Good boy.`
- Alternate line: `Protecting what matters. Eating what doesn't.`
- Email: `info@senorrosa.com` for the joke/demo.
- Website: the real Netlify URL created during class.

Services:
- Parcel Delivery Notifications
- Squirrel Patrols
- Cat Deterrence
- Food Disappearance — Market Price

Training asset groups:
1. Jake branding kit: logo variants, colors, business info, services/pricing, sample customer request, mediocre starting invoice.
2. Receipt-image demo files.
3. Public contracting/data demo used to identify possible subcontracting leads.
4. Jake sample website files for Netlify deployment.

Students first use Jake's safe data, then create an `AI Workshop - Working Copy` folder for their own safe business materials.

## Workshop teaching sequence

Keep `workshop.html` and `training.html` aligned on the participant-facing `1:15–4:00 PM` sequence:

- `1:15–1:30` — Welcome & get plugged in.
- `1:30–2:00` — Branded business document: WATCH → ASK → DO.
- `2:00–2:15` — Receipt photos → structured data / CSV / Sheets: WATCH → ASK.
- `2:15–2:35` — Public data → business leads: WATCH → ASK → DO.
- `2:35–3:15` — Bring in the attendee's business and build with safe working copies.
- `3:15–3:50` — Website files → Netlify → public URL: WATCH → ASK → DO.
- `3:50–4:00` — Final questions & wrap-up.

Operational time outside the participant instruction sequence:
- `12:45–1:00` — instructor arrival, room access, setup, power/Wi-Fi/projector check, signage, and admin.
- `1:00–1:15` — participant arrival/check-in, seating, Wi-Fi/power connection, and account readiness.
- `4:00–4:15` — teardown, required cleanup, and room closeout. Do not promise post-4:00 attendee programming because the approved event ends at 4:00 PM.

## Mobile-first expectations

`/enter`, `/workshop`, and `/training` should be designed mobile-first and remain comfortable on desktop. A likely acquisition path is someone scanning a QR code or typing the URL from a business card. Buttons, event facts, registration, and navigation should be obvious on a phone.

## Things intentionally NOT required for V1

- Student accounts/password reset.
- Instructor dashboard.
- Student progress states.
- Timers or synchronized classroom UI.
- LMS features.
- Complex CMS.
- Automated generation of every Jake asset as part of the core site build.
- Custom/raw payment-card handling. Use Square-supported secure payment components/APIs; prefer an embedded Square on-page experience for V1 if production-safe.
- Replacing the confirmed September 26 Broadway Commons event details with placeholders or invented alternatives.

## Definition of done for the first Codex pass

A successful first pass should:

1. Integrate `/enter`, `/workshop`, and `/training` cleanly into the existing Señor Rosa site/repo.
2. Preserve the current Señor Rosa visual identity while improving mobile-first layout where needed.
3. Implement reusable event configuration populated with the confirmed September 26 Broadway Commons event values, while keeping the configuration reusable for future workshops.
4. Implement or scaffold the minimal registration → Square-secured payment → verified paid registration → attendee confirmation + organizer confirmation flow using server-side Netlify Functions.
5. Keep `/training` static and unlisted; do not build attendee tokens, access activation, login, or LMS logic.
6. Use environment-variable placeholders/documentation rather than hard-coded credentials.
7. Keep Jake training asset URLs/paths replaceable.
8. Leave clear setup documentation for values the owner must supply after reserving the room and configuring production Square/email credentials.
9. Avoid unrelated rewrites of the rest of senorrosa.com.

## Values still needed from owner before production launch

Confirmed and no longer pending: September 26, 2026; Broadway Commons, Room 403 Europe, 1300 Broadway St NE, Salem, OR 97301; public event 1:00–4:00 PM; setup access 12:45 PM; teardown through 4:15 PM; first event ID/slug `2026-09-26-broadway-commons`.

Still needed:

- Parking/arrival instructions.
- Google Sheet ID and any required service credentials.
- Square production Application ID, Location ID, and Access Token after Sandbox end-to-end testing passes.
- Simple transactional email provider/configuration capable of sending attendee and organizer confirmations as or replying to `info@senorrosa.com`.
- Final Jake asset files/URLs (can be added after core build).
