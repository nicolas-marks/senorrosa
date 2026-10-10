"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../workshop.html"), "utf8");
const script = fs.readFileSync(path.join(__dirname, "../workshop.js"), "utf8");

test("past workshop displays closure and has no checkout or Square SDK", () => {
  assert.match(html, /This workshop has ended/);
  assert.doesNotMatch(html, /id="workshop-registration-form"|id="workshop-checkout-button"|web\.squarecdn\.com/);
  assert.match(html, /href="#host">Host a Workshop/);
  assert.match(html, /mailto:info@senorrosa.com\?subject=Host/);
  assert.match(html, /href="\/training"/);
});

test("archived workshop loads without initializing payments or requesting availability", () => {
  vm.runInNewContext(script, {
    document: { querySelectorAll: () => [], querySelector: () => null },
    fetch: () => { throw new Error("Archived page must not request payment services"); }
  });
});
