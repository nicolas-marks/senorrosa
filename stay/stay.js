"use strict";

const houseGuideItems = [
  {
    id: "garage",
    mapLabel: "Garage",
    cardLabel: "Garage",
    cardSummary: "Parking, laundry, freezer, heating, and electrical access.",
    title: "Garage, parking, and utilities",
    summary: "Parking, laundry, freezer, heating, and electrical access.",
    x: 5.2,
    y: 26.3,
    width: 17.6,
    height: 52.1,
    details: [
      "Guest parking is located in the garage.",
      "Washer and dryer are in the garage.",
      "A chest freezer is available.",
      "The home electrical panel is located here.",
      "The home heating equipment is located here.",
      "Do not block the electrical panel or heating equipment."
    ]
  },
  {
    id: "living-room",
    mapLabel: "Living",
    cardLabel: "Living room",
    cardSummary: "Big-screen TV with Amazon Fire TV Stick.",
    title: "Living room and TV",
    summary: "Big-screen TV with Amazon Fire TV Stick.",
    x: 24,
    y: 45.8,
    width: 28.2,
    height: 32.9,
    details: [
      "Use the Amazon Fire TV Stick for streaming.",
      "Guests may sign into their own streaming services.",
      "Remember to sign out before checkout.",
      "Return the remote to the living room when finished."
    ]
  },
  {
    id: "kitchen",
    mapLabel: "Kitchen",
    cardLabel: "Kitchen",
    cardSummary: "Coffee, refrigerator, and standard cooking equipment.",
    title: "Kitchen and coffee",
    summary: "Coffee, refrigerator, and standard cooking equipment.",
    x: 24,
    y: 16.5,
    width: 28.6,
    height: 27.8,
    details: [
      "Coffee supplies are available.",
      "Guests may use the refrigerator.",
      "Standard pots, pans, dishes, utensils, and cooking equipment are provided.",
      "Clean used dishes and cooking surfaces after use."
    ]
  },
  {
    id: "hall",
    mapLabel: "Thermostat",
    cardLabel: "Hall",
    cardSummary: "Heating controls are located in the hall.",
    title: "Nest thermostat",
    summary: "Heating controls are located in the hall.",
    x: 53,
    y: 45.3,
    width: 24,
    height: 7,
    details: [
      "Use the Nest thermostat to adjust the temperature.",
      "Make small temperature changes rather than extreme adjustments.",
      "Return the thermostat to the recommended setting before checkout."
    ]
  },
  {
    id: "bathroom",
    mapLabel: "Bath",
    cardLabel: "Bathroom",
    cardSummary: "Double-headed walk-in shower and bathroom amenities.",
    title: "Bathroom and walk-in shower",
    summary: "Double-headed walk-in shower and bathroom amenities.",
    x: 62.3,
    y: 26,
    width: 9.1,
    height: 17.1,
    details: [
      "The bathroom has a walk-in shower with two shower heads.",
      "Towels and spare linens are stored in the hall closet.",
      "Use the bathroom fan during and after showers."
    ]
  },
  {
    id: "queen-bedroom",
    mapLabel: "QBR",
    cardLabel: "Queen bedroom",
    cardSummary: "Bedroom with a queen-size bed.",
    title: "Queen bedroom",
    summary: "Bedroom with a queen-size bed.",
    x: 78.1,
    y: 26.2,
    width: 16.6,
    height: 26.3,
    details: [
      "Queen-size bed.",
      "Use the hall closet for spare linens and towels.",
      "Keep food and drinks off the bed."
    ]
  },
  {
    id: "king-bedroom",
    mapLabel: "KBR",
    cardLabel: "King bedroom",
    cardSummary: "Bedroom with a king-size bed.",
    title: "King bedroom",
    summary: "Bedroom with a king-size bed.",
    x: 73.6,
    y: 54.8,
    width: 21.5,
    height: 22.4,
    details: [
      "King-size bed.",
      "Use the hall closet for spare linens and towels.",
      "Keep food and drinks off the bed."
    ]
  },
  {
    id: "hall-closet",
    mapLabel: "Linens",
    cardLabel: "Hall closet",
    cardSummary: "Extra bedding, linens, and towels.",
    title: "Spare linens and towels",
    summary: "Extra bedding, linens, and towels.",
    x: 73.5,
    y: 40.7,
    width: 3.7,
    height: 3.8,
    details: [
      "Spare towels are stored here.",
      "Spare sheets and linens are stored here.",
      "Take only what is needed during the stay."
    ]
  },
  {
    id: "study",
    mapLabel: "Study",
    cardLabel: "Study",
    cardSummary: "Desk, monitors, and USB-C laptop connection.",
    title: "Work-from-home setup",
    summary: "Desk, monitors, and USB-C laptop connection.",
    x: 56.7,
    y: 66.7,
    width: 13.9,
    height: 12.1,
    details: [
      "The study includes a work-from-home desk setup.",
      "Connect a compatible laptop using USB-C.",
      "External monitors are available.",
      "Do not unplug or rearrange permanent equipment unless necessary.",
      "Leave cables and accessories at the desk after use."
    ]
  },
  {
    id: "wifi",
    mapLabel: "Wi-Fi",
    cardLabel: "Wi-Fi",
    cardSummary: "Network name, password, and connection help.",
    title: "Wi-Fi information",
    summary: "Network name, password, and connection help.",
    x: 53.2,
    y: 66.7,
    width: 3.3,
    height: 11,
    details: [
      "Display the guest Wi-Fi network name.",
      "Display the guest Wi-Fi password.",
      "Include a Wi-Fi QR code when available.",
      "Add basic troubleshooting instructions.",
      "Do not expose the private homeowner network."
    ]
  },
  {
    id: "front-door",
    mapLabel: "Front Lock",
    cardLabel: "Front door",
    cardSummary: "Keypad and app-based entry.",
    title: "Front-door smart lock",
    summary: "Keypad and app-based entry.",
    x: 54.6,
    y: 21.6,
    width: 6.7,
    height: 11.6,
    details: [
      "Use the assigned entry code to unlock the front door.",
      "Confirm the door locks when leaving.",
      "Include backup entry instructions."
    ]
  },
  {
    id: "back-door",
    mapLabel: "Back Lock",
    cardLabel: "Back door",
    cardSummary: "Keypad and app-based access to the backyard.",
    title: "Back-door smart lock",
    summary: "Keypad and app-based access to the backyard.",
    x: 47.8,
    y: 80.3,
    width: 4.5,
    height: 2.5,
    details: [
      "Use the assigned code for the back door.",
      "Confirm the door locks when leaving.",
      "Keep the door closed when not in use."
    ]
  }
];

const detailTitle = document.querySelector("#detail-title");
const detailSummary = document.querySelector("#detail-summary");
const detailContent = document.querySelector("#detail-content");
const hotspotLayer = document.querySelector("#guide-hotspot-layer");
const guideCardList = document.querySelector(".guide-card-list");

function getFeature(id) {
  return houseGuideItems.find((item) => item.id === id) || houseGuideItems[0];
}

function renderRoomCards() {
  if (!guideCardList) {
    return;
  }

  guideCardList.innerHTML = "";

  houseGuideItems.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "guide-card";
    button.dataset.feature = item.id;
    button.setAttribute("aria-pressed", "false");

    const title = document.createElement("span");
    title.className = "guide-card-title";
    title.textContent = item.cardLabel;

    const copy = document.createElement("span");
    copy.className = "guide-card-copy";
    copy.textContent = item.cardSummary;

    button.appendChild(title);
    button.appendChild(copy);
    button.addEventListener("click", () => {
      renderFeature(item.id);
    });

    guideCardList.appendChild(button);
  });
}

function renderHotspots() {
  if (!hotspotLayer) {
    return;
  }

  hotspotLayer.innerHTML = "";

  houseGuideItems.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "guide-hotspot";
    button.dataset.feature = item.id;
    button.setAttribute("aria-label", `Open ${item.mapLabel} details`);
    button.style.left = `${item.x}%`;
    button.style.top = `${item.y}%`;
    button.style.width = `${item.width}%`;
    button.style.height = `${item.height}%`;

    const label = document.createElement("span");
    label.className = "guide-hotspot-label";
    label.textContent = item.mapLabel;
    button.appendChild(label);

    button.addEventListener("click", () => {
      renderFeature(item.id);
    });

    hotspotLayer.appendChild(button);
  });
}

function renderFeature(id) {
  const item = getFeature(id);

  if (detailTitle) {
    detailTitle.textContent = item.title;
  }

  if (detailSummary) {
    detailSummary.textContent = item.summary;
  }

  if (detailContent) {
    const bulletMarkup = item.details
      .map((detail) => `<li>${detail}</li>`)
      .join("");

    detailContent.innerHTML = `
      <ul class="guide-detail-list">${bulletMarkup}</ul>
    `;
  }

  document.querySelectorAll(".guide-card, .guide-hotspot").forEach((button) => {
    const isSelected = button.dataset.feature === item.id;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
    button.setAttribute("aria-current", isSelected ? "true" : "false");
  });
}

renderRoomCards();
renderHotspots();
renderFeature(houseGuideItems[0].id);

