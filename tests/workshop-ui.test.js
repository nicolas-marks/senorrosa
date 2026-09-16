"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "workshop.html"), "utf8");
const script = fs.readFileSync(path.join(root, "workshop.js"), "utf8");

function element(attributes, textContent = "") {
  const attrs = Object.fromEntries([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
  return {
    ...attrs,
    textContent,
    dataset: Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith("data-")).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value])),
    disabled: /\bdisabled\b/.test(attributes),
    hidden: /\bhidden\b/.test(attributes),
    focus() { this.focused = true; },
    addEventListener(type, listener) { this.listeners ??= {}; this.listeners[type] = listener; }
  };
}

function response(status, body) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

const successfulPayment = {
  success: true,
  paymentAmountCents: 500,
  paymentCurrency: "USD",
  emailStatus: "sent",
  receiptUrl: "https://squareup.com/receipt/test-only"
};

async function checkout(paymentResponses) {
  // Read identifiers, data bindings, and initial text from the real page so the
  // same harness checks both the HTML fallback and the script's rendered state.
  const nodes = [...html.matchAll(/<[a-z][\w-]*\b([^<>]*)>([^<]*)/gi)].map(match => element(match[1], match[2]));
  const byId = new Map(nodes.filter(node => node.id).map(node => [node.id, node]));
  const eventNodes = nodes.filter(node => node.dataset.event);
  const form = byId.get("workshop-registration-form");
  const formCard = nodes.find(node => node.class?.split(" ").includes("form-card"));
  const button = byId.get("workshop-checkout-button");
  const controls = [byId.get("customer-name"), byId.get("customer-email"), byId.get("customer-business-name"), button];
  form.elements = {
    name: { value: "  Nico Test  " },
    email: { value: "  nico@example.test  ", validity: { valid: true } },
    business_name: { value: "  Test Business  " }
  };
  form.querySelectorAll = selector => {
    assert.equal(selector, "input, button");
    return controls;
  };
  const paymentRequests = [];
  let tokenizations = 0;
  let ids = 0;
  let attachments = 0;
  const document = {
    querySelector(selector) {
      const node = selector === ".form-card" ? formCard : byId.get(selector.slice(1));
      assert.ok(node, `Unexpected or missing page element: ${selector}`);
      return node;
    },
    querySelectorAll(selector) {
      assert.equal(selector, "[data-event]");
      return eventNodes;
    }
  };
  const context = vm.createContext({
    document,
    TypeError,
    crypto: { randomUUID: () => `test-attempt-${++ids}` },
    window: { Square: { payments(applicationId, locationId) {
      assert.equal(applicationId, "test-application");
      assert.equal(locationId, "test-location");
      return { card: async () => ({
        attach: async selector => { assert.equal(selector, "#square-payment-element"); attachments++; },
        tokenize: async () => ({ status: "OK", token: `test-token-${++tokenizations}` })
      }) };
    } } },
    fetch: async (url, options = {}) => {
      if (url === "/.netlify/functions/workshop-capacity") return response(200, { soldOut: false, seatsRemaining: 8 });
      if (url === "/.netlify/functions/workshop-payment-config") return response(200, { applicationId: "test-application", locationId: "test-location" });
      assert.equal(url, "/.netlify/functions/create-workshop-payment", "External requests must never reach the network");
      assert.equal(options.method, "POST");
      paymentRequests.push(JSON.parse(options.body));
      const next = paymentResponses.shift();
      assert.ok(next, "No mocked payment response remains");
      if (next instanceof Error) throw next;
      return next;
    }
  });
  vm.runInContext(script, context, { filename: "workshop.js" });
  await new Promise(setImmediate);
  assert.equal(attachments, 1, "Square's mocked payment element should attach");
  assert.equal(formCard.dataset.registrationState, "ready");
  assert.equal(button.disabled, false);
  return {
    byId, eventNodes, form, button, controls, paymentRequests,
    get tokenizations() { return tokenizations; },
    async submit() {
      let prevented = false;
      await form.listeners.submit({ preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
    }
  };
}

test("workshop HTML fallback explains the separate costs and displays the $5 checkout and receipt", () => {
  assert.doesNotMatch(html, /\$50(?:\.00)?\b/);
  assert.match(html, /id="workshop-checkout-button"[^>]*>Pay \$5\.00<\/button>/);
  assert.match(html, /<dd\b(?=[^>]*id="success-payment-amount")[^>]*>\$5\.00<\/dd>/);
  assert.match(html.replace(/<[^>]*>/g, ""), /ChatGPT Plus required[^<]*\$20\/month, purchased separately from OpenAI/);
  assert.match(html, /Community pilot workshop/);
  assert.match(html, /instructional time[^<]*volunteered/);
  assert.match(html, /\$25/);
  assert.match(html, /more than 48 hours before the workshop/);
  assert.match(html, /Cancellations within 48 hours are nonrefundable/);
});

test("initialization consistently renders the workshop fee and new subscriber total", async () => {
  const ui = await checkout([]);
  assert.equal(ui.button.textContent, "Pay $5.00");
  const expected = { price: "$5", priceDetail: "$5 per attendee", priceAmount: "$5.00", newSubscriberTotal: "$25" };
  for (const [key, value] of Object.entries(expected)) {
    const matches = ui.eventNodes.filter(node => node.dataset.event === key);
    assert.ok(matches.length, `The page should display ${key}`);
    for (const node of matches) assert.equal(node.textContent, value);
  }
});

test("successful payment shows $5.00 and preserves confirmation and receipt behavior", async () => {
  const ui = await checkout([response(200, successfulPayment)]);
  await ui.submit();
  assert.equal(ui.paymentRequests.length, 1);
  assert.equal(ui.paymentRequests[0].name, "Nico Test");
  assert.equal(ui.paymentRequests[0].email, "nico@example.test");
  assert.equal(ui.paymentRequests[0].businessName, "Test Business");
  assert.equal(ui.form.hidden, true);
  assert.ok(ui.controls.every(control => control.disabled));
  assert.equal(ui.byId.get("registration-success").hidden, false);
  assert.equal(ui.byId.get("registration-success").focused, true);
  assert.equal(ui.byId.get("success-payment-amount").textContent, "$5.00");
  assert.equal(ui.byId.get("success-attendee-name").textContent, "Nico Test");
  assert.match(ui.byId.get("confirmation-email-status").textContent, /sent to nico@example\.test/);
  assert.equal(ui.byId.get("square-receipt-link").href, successfulPayment.receiptUrl);
  assert.equal(ui.byId.get("square-receipt-link").hidden, false);
  await ui.submit();
  assert.equal(ui.paymentRequests.length, 1, "A completed checkout must not submit another payment");
});

test("a declined payment restores Pay $5.00 and starts a fresh payment attempt", async () => {
  const ui = await checkout([
    response(400, { success: false, message: "Card declined." }),
    response(200, successfulPayment)
  ]);
  await ui.submit();
  assert.equal(ui.button.textContent, "Pay $5.00");
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.byId.get("registration-message").textContent, "Card declined.");
  await ui.submit();
  assert.equal(ui.tokenizations, 2);
  assert.notEqual(ui.paymentRequests[0].paymentAttemptId, ui.paymentRequests[1].paymentAttemptId);
  assert.equal(ui.byId.get("success-payment-amount").textContent, "$5.00");
});

test("a recovered payment displays its actual amount while a new seat remains $5.00", async () => {
  const ui = await checkout([response(200, { ...successfulPayment, paymentAmountCents: 750, recovered: true })]);
  assert.equal(ui.button.textContent, "Pay $5.00");
  await ui.submit();
  assert.equal(ui.byId.get("success-payment-amount").textContent, "$7.50");
  assert.equal(ui.button.textContent, "Pay $5.00");
  assert.ok(ui.eventNodes.filter(node => node.dataset.event === "price").every(node => node.textContent === "$5"));
});

for (const [name, failure] of [
  ["server error", response(503, { success: false })],
  ["network failure", new TypeError("fetch failed")]
]) {
  test(`an unknown outcome after ${name} retries the same payment safely`, async () => {
    const ui = await checkout([failure, response(200, successfulPayment)]);
    await ui.submit();
    assert.equal(ui.button.textContent, "Check payment status");
    assert.equal(ui.button.disabled, false);
    assert.match(ui.byId.get("registration-message").textContent, /may have been charged/);
    await ui.submit();
    assert.equal(ui.tokenizations, 1);
    assert.deepEqual(ui.paymentRequests[1], ui.paymentRequests[0]);
    assert.equal(ui.byId.get("success-payment-amount").textContent, "$5.00");
  });
}
