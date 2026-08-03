"use strict";

let comics = [];
let currentComicIndex = 0;

const comicTitle = document.querySelector("#comic-title");
const comicDescription = document.querySelector("#comic-description");
const comicImage = document.querySelector("#comic-image");
const comicCounter = document.querySelector("#comic-counter");

const previousButton = document.querySelector("#previous-button");
const nextButton = document.querySelector("#next-button");
const previousButtonBottom = document.querySelector("#previous-button-bottom");
const nextButtonBottom = document.querySelector("#next-button-bottom");

function renderComic({ scrollToTop = false } = {}) {
  if (!comics.length) {
    return;
  }

  const comic = comics[currentComicIndex];

  comicTitle.textContent = comic.title;
  comicDescription.textContent = comic.summary || comic.alt || "A Señor Rosa comic.";
  comicImage.src = comic.image;
  comicImage.alt = comic.alt || comic.title;

  comicCounter.textContent = `Comic ${currentComicIndex + 1} of ${comics.length}`;

  const isFirstComic = currentComicIndex === 0;
  const isLastComic = currentComicIndex === comics.length - 1;

  if (previousButton) {
    previousButton.disabled = isFirstComic;
  }

  if (previousButtonBottom) {
    previousButtonBottom.disabled = isFirstComic;
  }

  if (nextButton) {
    nextButton.disabled = isLastComic;
  }

  if (nextButtonBottom) {
    nextButtonBottom.disabled = isLastComic;
  }

  document.title = `${comic.title} — Señor Rosa`;

  const url = new URL(window.location.href);
  url.searchParams.set("comic", comic.slug);
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);

  if (scrollToTop) {
    document.querySelector(".comic-intro").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function showPreviousComic() {
  if (!comics.length || currentComicIndex <= 0) {
    return;
  }

  currentComicIndex -= 1;
  renderComic({ scrollToTop: true });
}

function showNextComic() {
  if (!comics.length || currentComicIndex >= comics.length - 1) {
    return;
  }

  currentComicIndex += 1;
  renderComic({ scrollToTop: true });
}

async function loadComics() {
  try {
    const response = await fetch("./comics/comics.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Unable to load comics manifest (${response.status})`);
    }

    const manifest = await response.json();
    comics = Array.isArray(manifest) ? manifest : [];

    if (!comics.length) {
      comicTitle.textContent = "No published comics yet";
      comicDescription.textContent = "Add a numbered comic folder with comic.md and comic.png, then run npm run build-comics.";
      comicImage.removeAttribute("src");
      comicImage.alt = "No comics available";
      comicCounter.textContent = "No comics";
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedSlug = params.get("comic");

    if (requestedSlug) {
      const requestedIndex = comics.findIndex((comic) => comic.slug === requestedSlug);
      if (requestedIndex >= 0) {
        currentComicIndex = requestedIndex;
      }
    } else {
      currentComicIndex = comics.length - 1;
    }

    renderComic();
  } catch (error) {
    console.error("Unable to load comic manifest:", error);
    comicTitle.textContent = "Unable to load comics";
    comicDescription.textContent = "Run npm run build-comics to generate the manifest.";
    comicImage.removeAttribute("src");
    comicImage.alt = "Unable to load comics";
    comicCounter.textContent = "No comics";
  }
}

if (previousButton) {
  previousButton.addEventListener("click", showPreviousComic);
}

if (previousButtonBottom) {
  previousButtonBottom.addEventListener("click", showPreviousComic);
}

if (nextButton) {
  nextButton.addEventListener("click", showNextComic);
}

if (nextButtonBottom) {
  nextButtonBottom.addEventListener("click", showNextComic);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    showPreviousComic();
  }

  if (event.key === "ArrowRight") {
    showNextComic();
  }
});

document.querySelector("#current-year").textContent =
  new Date().getFullYear();

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");

    document.body.classList.toggle("nav-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

loadComics();