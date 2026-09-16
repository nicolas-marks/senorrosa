"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const { WORKSHOP_EVENT } = require("../netlify/functions/workshop-event-config");
const { buildRegistrationRow, getWorkshopCapacity } = require("../netlify/functions/workshop-registration-ledger");
const { sendWorkshopConfirmation } = require("../netlify/functions/workshop-confirmation-email");

const paymentAttemptId = "11111111-1111-4111-8111-111111111111";
const attendee = { name: "Test Attendee", email: "attendee@example.com", businessName: "Test Business" };
const receiptUrl = "https://squareup.com/receipt/preview/test-payment";
const handlerSource = readFileSync(path.join(__dirname, "../netlify/functions/create-workshop-payment.js"), "utf8");

function paymentHarness({ availability = { soldOut: false }, declined = false } = {}) {
  const squareRequests = [];
  const confirmations = [];
  const registrations = [];
  const context = {
    exports: {},
    process: { env: { SQUARE_ENV: "production", SQUARE_ACCESS_TOKEN: "test-token", SQUARE_LOCATION_ID: "test-location" } },
    URL,
    console,
    require(moduleName) {
      if (moduleName === "node:crypto") return require(moduleName);
      if (moduleName === "./workshop-event-config") return { WORKSHOP_EVENT };
      if (moduleName === "./workshop-confirmation-email") return {
        async sendWorkshopConfirmation(confirmation) {
          confirmations.push(confirmation);
          return { status: "sent", emailId: "test-email" };
        }
      };
      if (moduleName === "./workshop-registration-ledger") return {
        async getWorkshopCapacity() { return availability; },
        async recordRegistration(registration) { registrations.push(registration); }
      };
      throw new Error(`Unexpected dependency: ${moduleName}`);
    },
    async fetch(url, options) {
      squareRequests.push({ url, ...options, body: JSON.parse(options.body) });
      return {
        ok: !declined,
        async json() {
          return declined ? { errors: [{ code: "CARD_DECLINED" }] } : {
            payment: {
              id: "test-payment", status: "COMPLETED", receipt_url: receiptUrl,
              amount_money: JSON.parse(options.body).amount_money
            }
          };
        }
      };
    }
  };
  vm.runInNewContext(handlerSource, context, { filename: "create-workshop-payment.js" });
  return { handler: context.exports.handler, squareRequests, confirmations, registrations };
}

function registrationRequest(overrides = {}) {
  return {
    httpMethod: "POST",
    body: JSON.stringify({ sourceId: "test-card-token", paymentAttemptId, ...attendee, ...overrides })
  };
}

test("Square charges exactly 500 USD cents, ignoring any client-provided price", async () => {
  const harness = paymentHarness();
  const response = await harness.handler(registrationRequest({
    amount: 123, price: 1.23, amount_money: { amount: 123, currency: "EUR" }
  }));
  const result = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(harness.squareRequests.length, 1);
  const square = harness.squareRequests[0];
  assert.equal(square.url, "https://connect.squareup.com/v2/payments");
  assert.equal(square.method, "POST");
  assert.deepEqual(square.body.amount_money, { amount: 500, currency: "USD" });
  assert.equal(square.body.location_id, "test-location");
  assert.equal(square.body.reference_id, "2026-09-26-broadway-commons");
  assert.equal(square.body.autocomplete, true);
  assert.equal(result.paymentAmountCents, 500);
  assert.equal(result.paymentCurrency, "USD");
  assert.equal(result.receiptUrl, receiptUrl);
  assert.equal(result.paymentStatus, "COMPLETED");
  assert.equal(result.emailStatus, "sent");
  assert.equal(result.storageStatus, "stored");
  assert.equal(harness.confirmations.length, 1);
  assert.equal(harness.confirmations[0].amountCents, 500);
  assert.equal(harness.confirmations[0].currency, "USD");
  assert.equal(harness.registrations.length, 1);
  const row = buildRegistrationRow(harness.registrations[0]);
  assert.equal(row[9], 5);
  assert.equal(row[10], "USD");
});

test("retrying a recorded payment returns its paid amount without charging again", async () => {
  const harness = paymentHarness({ availability: {
    soldOut: true,
    existingRegistration: {
      paymentId: "existing-payment", receiptUrl, emailStatus: "sent", amountCents: 750, currency: "USD"
    }
  } });
  const response = await harness.handler(registrationRequest());
  const result = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(result.recovered, true);
  assert.equal(result.paymentId, "existing-payment");
  assert.equal(result.paymentAmountCents, 750);
  assert.equal(result.paymentCurrency, "USD");
  assert.equal(harness.squareRequests.length, 0);
  assert.equal(harness.registrations.length, 0);
  assert.equal(harness.confirmations[0].amountCents, 750);
  assert.equal(harness.confirmations[0].currency, "USD");
});

test("ledger recovery preserves the actual paid amount across a price change", async () => {
  const row = buildRegistrationRow({
    payment: { id: "existing-payment", receipt_url: receiptUrl, amount_money: { amount: 750, currency: "USD" } },
    paymentAttemptId,
    ...attendee,
    emailStatus: "sent"
  });
  const originalSheetId = process.env.WORKSHOP_SHEET_ID;
  process.env.WORKSHOP_SHEET_ID = "test-sheet";
  try {
    const capacity = await getWorkshopCapacity({
      paymentAttemptId,
      client: {
        async request({ url, method }) {
          assert.equal(method, "GET");
          assert.equal(new URL(url).searchParams.get("valueRenderOption"), "UNFORMATTED_VALUE");
          return { data: { values: [row] } };
        }
      }
    });
    assert.equal(row[9], 7.5);
    assert.equal(capacity.capacity, 10);
    assert.equal(capacity.paidSeats, 1);
    assert.equal(capacity.existingRegistration.amountCents, 750);
    assert.equal(capacity.existingRegistration.currency, "USD");
  } finally {
    if (originalSheetId === undefined) delete process.env.WORKSHOP_SHEET_ID;
    else process.env.WORKSHOP_SHEET_ID = originalSheetId;
  }
});

test("sold-out workshops never submit a Square payment", async () => {
  const harness = paymentHarness({ availability: { soldOut: true } });
  const response = await harness.handler(registrationRequest());
  assert.equal(response.statusCode, 409);
  assert.equal(JSON.parse(response.body).code, "SOLD_OUT");
  assert.equal(harness.squareRequests.length, 0);
  assert.equal(harness.confirmations.length, 0);
  assert.equal(harness.registrations.length, 0);
});

test("declined payments do not confirm or record a registration", async () => {
  const harness = paymentHarness({ declined: true });
  const response = await harness.handler(registrationRequest());
  assert.equal(response.statusCode, 402);
  assert.equal(JSON.parse(response.body).success, false);
  assert.equal(harness.squareRequests.length, 1);
  assert.deepEqual(harness.squareRequests[0].body.amount_money, { amount: 500, currency: "USD" });
  assert.equal(harness.confirmations.length, 0);
  assert.equal(harness.registrations.length, 0);
});

async function captureConfirmation(testContext, overrides = {}) {
  const requests = [];
  const originalApiKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-email-token";
  testContext.after(() => {
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
  });
  testContext.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.method, "POST");
    requests.push({ headers: options.headers, payload: JSON.parse(options.body) });
    return { ok: true, async json() { return { id: "test-email" }; } };
  });
  const result = await sendWorkshopConfirmation({ paymentId: "test-payment", ...attendee, receiptUrl, ...overrides });
  assert.equal(result.status, "sent");
  assert.equal(result.organizerStatus, "sent");
  assert.equal(requests.length, 2);
  return {
    attendeeRequest: requests.find((request) => request.payload.to.includes(attendee.email)),
    organizerRequest: requests.find((request) => request.payload.to.includes("info@senorrosa.com"))
  };
}

test("confirmation emails show the $5 payment, separate Plus cost, and workshop refund policy", async (t) => {
  const { attendeeRequest, organizerRequest } = await captureConfirmation(t);
  for (const content of [attendeeRequest.payload.text, attendeeRequest.payload.html]) {
    assert.match(content, /\$5\.00 payment/);
    assert.match(content, /ChatGPT Plus is required/);
    assert.match(content, /\$20\/month, purchased separately from OpenAI/);
    assert.match(content, /receives no part of that subscription/);
    assert.match(content, /refundable if you cancel more than 48 hours/);
    assert.match(content, /Cancellations within 48 hours are nonrefundable/);
    assert.match(content, /full refund of the workshop fee/);
    assert.match(content, /separate ChatGPT Plus subscription is managed through OpenAI/);
    assert.match(content, /Room 403 Europe/);
    assert.ok(content.includes(receiptUrl));
  }
  assert.match(organizerRequest.payload.text, /Amount: \$5\.00 USD/);
  assert.equal(attendeeRequest.headers["Idempotency-Key"], "workshop-confirmation/test-payment");
  assert.equal(organizerRequest.headers["Idempotency-Key"], "workshop-organizer/test-payment");
});

test("confirmation emails preserve the amount paid on a historical registration", async (t) => {
  const { attendeeRequest, organizerRequest } = await captureConfirmation(t, { amountCents: 750, currency: "USD" });
  assert.match(attendeeRequest.payload.text, /\$7\.50 payment/);
  assert.match(attendeeRequest.payload.html, /\$7\.50 payment/);
  assert.match(organizerRequest.payload.text, /Amount: \$7\.50 USD/);
});
