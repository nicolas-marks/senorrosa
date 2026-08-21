"use strict";

const { createHash } = require("node:crypto");
const { GoogleAuth } = require("google-auth-library");
const { WORKSHOP_EVENT } = require("./workshop-event-config");

const WORKSHOP_ID = WORKSHOP_EVENT.id;
const WORKSHOP_CAPACITY = WORKSHOP_EVENT.capacity;
const REGISTRATIONS_RANGE = "Registrations!A2:N";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function getSheetId() {
  const sheetId = process.env.WORKSHOP_SHEET_ID;
  if (!sheetId) throw new Error("Workshop sheet is not configured.");
  return sheetId;
}

async function createSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) throw new Error("Google service account is not configured.");
  const auth = new GoogleAuth({ credentials: { client_email: email, private_key: privateKey }, scopes: [SHEETS_SCOPE] });
  return auth.getClient();
}

function valuesUrl(sheetId, range) {
  return `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`;
}

async function getRegistrationRows(client) {
  const sheetsClient = client || await createSheetsClient();
  const response = await sheetsClient.request({ url: valuesUrl(getSheetId(), REGISTRATIONS_RANGE), method: "GET" });
  return Array.isArray(response.data?.values) ? response.data.values : [];
}

function capacityFromRows(rows) {
  const paymentIds = new Set();
  rows.forEach((row, index) => {
    if (row[2] === WORKSHOP_ID && row[6] === "COMPLETED") paymentIds.add(row[7] || `row-${index}`);
  });
  const paidSeats = Math.min(paymentIds.size, WORKSHOP_CAPACITY);
  return { workshopId: WORKSHOP_ID, capacity: WORKSHOP_CAPACITY, paidSeats, seatsRemaining: WORKSHOP_CAPACITY - paidSeats, soldOut: paidSeats >= WORKSHOP_CAPACITY };
}

async function getWorkshopCapacity({ client, paymentAttemptId } = {}) {
  const rows = await getRegistrationRows(client);
  const capacity = capacityFromRows(rows);
  if (!paymentAttemptId) return capacity;
  const marker = `attempt:${paymentAttemptId}`;
  const existingRow = rows.find((row) => row[2] === WORKSHOP_ID && row[6] === "COMPLETED" && String(row[13] || "").split(" | ").includes(marker));
  return existingRow ? {
    ...capacity,
    existingRegistration: { paymentId: existingRow[7], receiptUrl: existingRow[8], emailStatus: existingRow[11] }
  } : capacity;
}

function buildRegistrationRow({ payment, paymentAttemptId, name, email, businessName, emailStatus, resendEmailId, notes }) {
  const paymentId = payment.id;
  const registrationId = `reg_${createHash("sha256").update(`${WORKSHOP_ID}|${paymentId}`).digest("hex").slice(0, 20)}`;
  return [
    payment.created_at || new Date().toISOString(),
    registrationId,
    WORKSHOP_ID,
    name,
    email,
    businessName || "",
    "COMPLETED",
    paymentId,
    payment.receipt_url || "",
    WORKSHOP_EVENT.priceCents / 100,
    WORKSHOP_EVENT.currency,
    emailStatus,
    resendEmailId || "",
    [paymentAttemptId && `attempt:${paymentAttemptId}`, notes].filter(Boolean).join(" | ")
  ];
}

async function recordRegistration(registration, { client } = {}) {
  const sheetsClient = client || await createSheetsClient();
  const rows = await getRegistrationRows(sheetsClient);
  if (rows.some((row) => row[7] === registration.payment.id)) return { duplicate: true };

  const row = buildRegistrationRow(registration);
  await sheetsClient.request({
    url: `${valuesUrl(getSheetId(), "Registrations!A:N")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    method: "POST",
    data: { values: [row] }
  });
  return { duplicate: false, registrationId: row[1] };
}

module.exports = { WORKSHOP_CAPACITY, WORKSHOP_ID, buildRegistrationRow, capacityFromRows, getWorkshopCapacity, recordRegistration };
