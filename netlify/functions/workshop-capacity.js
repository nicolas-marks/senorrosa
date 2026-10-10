"use strict";

const { WORKSHOP_EVENT } = require("./workshop-event-config");
const { getWorkshopCapacity } = require("./workshop-registration-ledger");

function json(statusCode, body, extraHeaders = {}) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { message: "Method not allowed." }, { Allow: "GET" });
  if (WORKSHOP_EVENT.registrationStatus === "closed") return json(200, { registrationClosed: true, registrationStatus: "closed", soldOut: false, seatsRemaining: 0 });
  try {
    return json(200, await getWorkshopCapacity());
  } catch {
    return json(503, { message: "Workshop availability is temporarily unavailable." });
  }
};
