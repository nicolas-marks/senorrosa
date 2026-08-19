"use strict";

const { createHash } = require("node:crypto");

// Square amounts use the smallest currency denomination: 5000 cents is $50.00 USD.
const WORKSHOP_PRICE_CENTS = 5000;
const WORKSHOP_CURRENCY = "USD";
const WORKSHOP_ID = "ai-business-lab-2026-09-26";
const SQUARE_API_VERSION = "2026-07-15";
const SQUARE_SANDBOX_PAYMENTS_URL = "https://connect.squareupsandbox.com/v2/payments";

function json(statusCode, body, extraHeaders = {}) {
  return { statusCode, headers: { "Content-Type": "application/json", ...extraHeaders }, body: JSON.stringify(body) };
}

function clean(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { success: false, message: "Method not allowed." }, { Allow: "POST" });

  const environment = process.env.SQUARE_ENV || process.env.SQUARE_ENVIRONMENT;
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (environment !== "sandbox" || !accessToken || !locationId) {
    return json(503, { success: false, message: "Payment service is temporarily unavailable." });
  }

  let request;
  try { request = JSON.parse(event.body || "{}"); }
  catch { return json(400, { success: false, message: "Invalid request." }); }

  const sourceId = clean(request.sourceId, 512);
  const name = clean(request.name, 120);
  const email = clean(request.email, 254).toLowerCase();
  const businessName = clean(request.businessName, 120);
  if (!sourceId || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { success: false, message: "Name, email, and payment details are required." });
  }

  const noteParts = [WORKSHOP_ID, `Attendee: ${name}`, `Email: ${email}`];
  if (businessName) noteParts.push(`Business: ${businessName}`);
  const paymentRequest = {
    source_id: sourceId,
    idempotency_key: createHash("sha256").update(`${sourceId}|${email}`).digest("hex").slice(0, 45),
    amount_money: { amount: WORKSHOP_PRICE_CENTS, currency: WORKSHOP_CURRENCY },
    location_id: locationId,
    reference_id: WORKSHOP_ID,
    buyer_email_address: email,
    note: noteParts.join(" | ").slice(0, 500),
    autocomplete: true
  };

  try {
    const squareResponse = await fetch(SQUARE_SANDBOX_PAYMENTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Square-Version": SQUARE_API_VERSION },
      body: JSON.stringify(paymentRequest)
    });
    const squareResult = await squareResponse.json().catch(() => ({}));
    if (!squareResponse.ok || squareResult.payment?.status !== "COMPLETED") {
      const declined = squareResult.errors?.some((error) => ["CARD_DECLINED", "GENERIC_DECLINE", "CVV_FAILURE", "ADDRESS_VERIFICATION_FAILURE"].includes(error.code));
      return json(402, { success: false, message: declined ? "The payment was declined. Please check the card details or use another Sandbox card." : "Payment could not be completed. Please try again." });
    }
    return json(200, { success: true, paymentId: squareResult.payment.id });
  } catch {
    return json(502, { success: false, message: "Payment service could not be reached. Please try again." });
  }
};
