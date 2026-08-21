"use strict";

const { WORKSHOP_EVENT } = require("./workshop-event-config");

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "Señor Rosa <info@senorrosa.com>";
const ORGANIZER_ADDRESS = "info@senorrosa.com";
const TRAINING_URL = "https://senorrosa.com/training";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function buildConfirmationEmail({ name, email, receiptUrl }) {
  const safeName = escapeHtml(name);
  const receiptText = receiptUrl ? `\nSquare receipt: ${receiptUrl}` : "";
  const receiptHtml = receiptUrl ? `<p><a href="${escapeHtml(receiptUrl)}">View your Square receipt</a></p>` : "";
  return {
    from: FROM_ADDRESS,
    to: [email],
    reply_to: "info@senorrosa.com",
    subject: "You're registered — Señor Rosa AI Workshop",
    text: `Hi ${name},\n\nYour registration and $50.00 payment are confirmed.\n\nAI Business Lab\nSeptember 26, 2026\n1:00 PM–4:00 PM\nBroadway Commons\nSalem, Oregon\n\nWORKSHOP ONBOARDING\n${TRAINING_URL}\nBring your laptop, charger, Google account, ChatGPT Plus access, and useful non-sensitive business materials.\n\nOFFICIAL SQUARE RECEIPT${receiptText || "\nYour receipt link was not available in the payment response."}\n\nQuestions? Reply to this email or contact info@senorrosa.com.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;color:#2c1822;line-height:1.6"><h1 style="font-size:24px">You're registered.</h1><p>Hi ${safeName},</p><p>Your registration and <strong>$50.00 payment</strong> are confirmed.</p><h2 style="font-size:18px">AI Business Lab</h2><p>September 26, 2026<br>1:00 PM–4:00 PM<br>Broadway Commons<br>Salem, Oregon</p><h2 style="font-size:18px">Workshop onboarding</h2><p><a href="${TRAINING_URL}">${TRAINING_URL}</a></p><p>Bring your laptop, charger, Google account, ChatGPT Plus access, and useful non-sensitive business materials.</p><h2 style="font-size:18px">Official Square receipt</h2>${receiptHtml || "<p>Your receipt link was not available in the payment response.</p>"}<p>Questions? Reply to this email or contact info@senorrosa.com.</p></div>`
  };
}

async function sendResendEmail(apiKey, payload, idempotencyKey) {
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey, "User-Agent": "senorrosa-workshop/1.0" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw Object.assign(new Error("Email provider rejected the request."), { statusCode: response.status });
  return response.json().catch(() => ({}));
}

async function sendWorkshopConfirmation({ paymentId, name, email, receiptUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { status: "not_configured", organizerStatus: "not_configured" };

  const attendeePayload = buildConfirmationEmail({ name, email, receiptUrl });
  const policyText = "Cancellations more than 48 hours before the workshop are refundable. Cancellations within 48 hours are nonrefundable. If Señor Rosa cancels, you receive a full refund and retain the training materials.";
  attendeePayload.text += `\n\nLOCATION\nBroadway Commons, Room 403 Europe\n1300 Broadway St NE, Salem, OR 97301\n\nCANCELLATION POLICY\n${policyText}`;
  attendeePayload.html = attendeePayload.html.replace("Broadway Commons<br>Salem, Oregon", "Broadway Commons, Room 403 Europe<br>1300 Broadway St NE, Salem, OR 97301").replace("<h2 style=\"font-size:18px\">Official Square receipt</h2>", `<h2 style="font-size:18px">Cancellation policy</h2><p>${policyText}</p><h2 style="font-size:18px">Official Square receipt</h2>`);
  const organizerPayload = {
    from: FROM_ADDRESS,
    to: [ORGANIZER_ADDRESS],
    reply_to: email,
    subject: `Paid workshop registration — ${name}`,
    text: `A paid workshop registration was confirmed.\n\nAttendee: ${name}\nEmail: ${email}\nEvent: ${WORKSHOP_EVENT.id}\nAmount: $${(WORKSHOP_EVENT.priceCents / 100).toFixed(2)} ${WORKSHOP_EVENT.currency}\nSquare payment reference: ${paymentId}`
  };

  const [attendeeResult, organizerResult] = await Promise.allSettled([
    sendResendEmail(apiKey, attendeePayload, `workshop-confirmation/${paymentId}`),
    sendResendEmail(apiKey, organizerPayload, `workshop-organizer/${paymentId}`)
  ]);
  if (attendeeResult.status === "rejected") {
    console.error("Workshop attendee email failed", { paymentId, statusCode: attendeeResult.reason?.statusCode });
  }
  if (organizerResult.status === "rejected") {
    console.error("Workshop organizer email failed", { paymentId, statusCode: organizerResult.reason?.statusCode });
  }
  return {
    status: attendeeResult.status === "fulfilled" ? "sent" : "failed",
    organizerStatus: organizerResult.status === "fulfilled" ? "sent" : "failed",
    emailId: attendeeResult.status === "fulfilled" && typeof attendeeResult.value.id === "string" ? attendeeResult.value.id : undefined
  };
}

/*
 * Resend idempotency keys are based on Square's payment ID. Reprocessing the
 * same completed payment can repair a failed delivery without sending a second
 * copy of an email that Resend already accepted.
 */
module.exports = { buildConfirmationEmail, sendWorkshopConfirmation };
