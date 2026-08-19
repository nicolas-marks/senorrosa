"use strict";

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: { Allow: "GET", "Content-Type": "application/json" }, body: JSON.stringify({ message: "Method not allowed." }) };
  }

  const environment = process.env.SQUARE_ENV || process.env.SQUARE_ENVIRONMENT;
  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (environment !== "sandbox" || !applicationId || !locationId) {
    return { statusCode: 503, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ message: "Payment configuration is unavailable." }) };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ applicationId, locationId }) };
};
