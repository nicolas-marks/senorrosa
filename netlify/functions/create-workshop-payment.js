"use strict";

const { createHash } = require("node:crypto");
const { sendWorkshopConfirmation } = require("./workshop-confirmation-email");
const { getWorkshopCapacity, recordRegistration } = require("./workshop-registration-ledger");
const { WORKSHOP_EVENT } = require("./workshop-event-config");

// Square amounts use the smallest currency denomination: 5000 cents is $50.00 USD.
const SQUARE_API_VERSION = "2026-07-15";
const SQUARE_PRODUCTION_PAYMENTS_URL = "https://connect.squareup.com/v2/payments";

function json(statusCode, body, extraHeaders = {}) {
  return { statusCode, headers: { "Content-Type": "application/json", ...extraHeaders }, body: JSON.stringify(body) };
}

function clean(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeReceiptUrl(value) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { success: false, message: "Method not allowed." }, { Allow: "POST" });

  const environment = process.env.SQUARE_ENV || process.env.SQUARE_ENVIRONMENT;
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (environment !== "production" || !accessToken || !locationId) {
    return json(503, { success: false, message: "Payment service is temporarily unavailable." });
  }

  let request;
  try { request = JSON.parse(event.body || "{}"); }
  catch { return json(400, { success: false, message: "Invalid request." }); }

  const sourceId = clean(request.sourceId, 512);
  const paymentAttemptId = clean(request.paymentAttemptId, 64);
  const name = clean(request.name, 120);
  const email = clean(request.email, 254).toLowerCase();
  const businessName = clean(request.businessName, 120);
  if (!sourceId || !/^[0-9a-f-]{36}$/i.test(paymentAttemptId) || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { success: false, message: "Name, email, and payment details are required." });
  }

  try {
    const availability = await getWorkshopCapacity({ paymentAttemptId });
    if (availability.existingRegistration) {
      let recoveredEmail = { status: availability.existingRegistration.emailStatus || "failed" };
      try {
        recoveredEmail = await sendWorkshopConfirmation({
          paymentId: availability.existingRegistration.paymentId,
          name,
          email,
          receiptUrl: safeReceiptUrl(availability.existingRegistration.receiptUrl)
        });
      } catch {
        console.error("Workshop confirmation recovery failed", { paymentId: availability.existingRegistration.paymentId });
      }
      return json(200, {
        success: true,
        paymentId: availability.existingRegistration.paymentId,
        paymentStatus: "COMPLETED",
        ...(safeReceiptUrl(availability.existingRegistration.receiptUrl) && { receiptUrl: safeReceiptUrl(availability.existingRegistration.receiptUrl) }),
        emailStatus: recoveredEmail.status,
        storageStatus: "stored",
        recovered: true
      });
    }
    if (availability.soldOut) return json(409, { success: false, code: "SOLD_OUT", message: "This workshop is sold out." });
  } catch {
    return json(503, { success: false, message: "Workshop availability could not be confirmed. Please try again shortly." });
  }

  const noteParts = [WORKSHOP_EVENT.id, `Attendee: ${name}`, `Email: ${email}`];
  if (businessName) noteParts.push(`Business: ${businessName}`);
  const paymentRequest = {
    source_id: sourceId,
    idempotency_key: createHash("sha256").update(`${WORKSHOP_EVENT.id}|${paymentAttemptId}|${email}`).digest("hex").slice(0, 45),
    amount_money: { amount: WORKSHOP_EVENT.priceCents, currency: WORKSHOP_EVENT.currency },
    location_id: locationId,
    reference_id: WORKSHOP_EVENT.id,
    buyer_email_address: email,
    note: noteParts.join(" | ").slice(0, 500),
    autocomplete: true
  };

  try {
    const squareResponse = await fetch(SQUARE_PRODUCTION_PAYMENTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Square-Version": SQUARE_API_VERSION },
      body: JSON.stringify(paymentRequest)
    });
    const squareResult = await squareResponse.json().catch(() => ({}));
    if (!squareResponse.ok || squareResult.payment?.status !== "COMPLETED") {
      const declined = squareResult.errors?.some((error) => ["CARD_DECLINED", "GENERIC_DECLINE", "CVV_FAILURE", "ADDRESS_VERIFICATION_FAILURE"].includes(error.code));
      return json(402, { success: false, message: declined ? "The payment was declined. Please check the card details or use another card." : "Payment could not be completed. Please try again." });
    }
    const paymentId = squareResult.payment.id;
    const receiptUrl = safeReceiptUrl(squareResult.payment.receipt_url);
    let emailResult = { status: "failed" };
    try {
      emailResult = await sendWorkshopConfirmation({ paymentId, name, email, receiptUrl });
    } catch {
      console.error("Workshop confirmation email failed", { paymentId });
    }

    let storageStatus = "stored";
    try {
      await recordRegistration({
        payment: squareResult.payment,
        paymentAttemptId,
        name,
        email,
        businessName,
        emailStatus: emailResult.status,
        resendEmailId: emailResult.emailId,
        notes: emailResult.status === "failed" ? "Confirmation email delivery failed; manual follow-up needed." : ""
      });
    } catch {
      storageStatus = "failed";
      console.error("Workshop registration storage failed", { paymentId });
    }

    return json(200, {
      success: true,
      paymentId,
      paymentStatus: "COMPLETED",
      ...(receiptUrl && { receiptUrl }),
      emailStatus: emailResult.status,
      storageStatus
    });
  } catch {
    return json(502, { success: false, message: "Payment service could not be reached. Please try again." });
  }
};
