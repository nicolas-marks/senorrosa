# Señor Rosa

A personal storytelling website built around illustrated true stories from life in Oregon and Mexico.

The goal of Señor Rosa is to document real experiences through comics that combine travel, language learning, humor, and everyday adventures.

This repository contains the website that powers:

https://senorrosa.com

---

## Project Goals

- Publish illustrated comic episodes
- Keep the website lightweight and fast
- Mobile-first reading experience
- Simple content publishing workflow
- Build a long-term personal brand around authentic storytelling

---

## Tech Stack

- HTML
- CSS
- JavaScript
- Git
- GitHub
- Netlify

---

## Current Status

🚧 Early development

The current focus is building the core comic reading experience before expanding into additional features.

---

## Planned Features

- Comic episode feed
- Character pages
- About page
- Search
- Categories
- Spanish learning notes
- AI behind-the-scenes articles

---

## Development

Clone the repository:

```bash
git clone https://github.com/nicolas-marks/senorrosa.git
```

Open `index.html` in your browser or use your preferred local web server.

---

## License

Copyright © Señor Rosa

# Workshop production checklist

The `/workshop` payment flow uses the production Square Web Payments SDK only when the Netlify environment is configured with `SQUARE_ENV=production`. Before deployment, verify that `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID`, and `SQUARE_ACCESS_TOKEN` all belong to the same activated production Square account and location. Do not put the access token in browser code or local committed files.

Also verify that the Google service account can append to the `Registrations` tab in `WORKSHOP_SHEET_ID`, and that the existing columns `A:N` remain in the order expected by `workshop-registration-ledger.js`. Confirm that `info@senorrosa.com` is a verified Resend sender/domain and can receive the organizer notification. Parking/arrival copy remains an owner-supplied launch item.

Capacity is counted from unique Square payment IDs with `COMPLETED` status in Google Sheets. The server checks capacity immediately before asking Square to charge. Google Sheets does not provide an atomic compare-and-reserve operation, so two buyers submitting for the final seat at nearly the same instant can both pass the pre-charge check. For this 10-seat pilot, monitor the organizer notifications and Sheet near sellout and refund/contact an attendee if that rare race occurs. Moving to atomic seat reservations would require a transactional datastore and is intentionally outside V1.

Production verification must be a controlled deployment check. Confirm HTTPS and the `/workshop` Content Security Policy in the deployed response before using a real card; do not test production payment code with Sandbox card values.
