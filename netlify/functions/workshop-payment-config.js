"use strict";

const { WORKSHOP_EVENT } = require("./workshop-event-config");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: { Allow: "GET", "Content-Type": "application/json" }, body: JSON.stringify({ message: "Method not allowed." }) };
  }

  if (WORKSHOP_EVENT.registrationStatus === "closed") {
    return { statusCode: 410, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ code: "REGISTRATION_CLOSED", message: "This workshop has ended. Registration and payment are closed." }) };
  }

  const environment = process.env.SQUARE_ENV || process.env.SQUARE_ENVIRONMENT;
  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (environment !== "production" || !applicationId || !locationId) {
    return { statusCode: 503, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ message: "Payment configuration is unavailable." }) };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ applicationId, locationId }) };
};
