"use strict";

const comics = [
  {
    title: "Comic One",
    description:
      "True stories, questionable Spanish, and an unusually large Doberman.",
    image: "comics/comictest1.png",
    alt: "Señor Rosa comic one"
  },
  {
    title: "Comic Two",
    description:
      "Another true story from life between Oregon and Mexico.",
    image: "comics/comictest2.png",
    alt: "Señor Rosa comic two"
  },
  {
    title: "Comic Three",
    description:
      "An illustrated adventure featuring Señor Rosa and company.",
    image: "comics/comictest3.png",
    alt: "Señor Rosa comic three"
  },
  {
    title: "Comic Four",
    description:
      "A true story told with bright colors and imperfect decisions.",
    image: "comics/comictest4.png",
    alt: "Señor Rosa comic four"
  },
  {
    title: "Comic Five",
    description:
      "A roadside stop turns into a very awkward memory.",
    image: "comics/comictest5.png",
    alt: "Señor Rosa comic five"
  }
];

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
  const comic = comics[currentComicIndex];

  comicTitle.textContent = comic.title;
  comicDescription.textContent = comic.description;
  comicImage.src = comic.image;
  comicImage.alt = comic.alt;

  comicCounter.textContent =
    `Comic ${currentComicIndex + 1} of ${comics.length}`;

  const isFirstComic = currentComicIndex === 0;
  const isLastComic = currentComicIndex === comics.length - 1;

  previousButton.disabled = isFirstComic;
  previousButtonBottom.disabled = isFirstComic;
  nextButton.disabled = isLastComic;
  nextButtonBottom.disabled = isLastComic;

  document.title = `${comic.title} — Señor Rosa`;

  if (scrollToTop) {
    document.querySelector(".comic-intro").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function showPreviousComic() {
  if (currentComicIndex <= 0) {
    return;
  }

  currentComicIndex -= 1;
  renderComic({ scrollToTop: true });
}

function showNextComic() {
  if (currentComicIndex >= comics.length - 1) {
    return;
  }

  currentComicIndex += 1;
  renderComic({ scrollToTop: true });
}

previousButton.addEventListener("click", showPreviousComic);
previousButtonBottom.addEventListener("click", showPreviousComic);
nextButton.addEventListener("click", showNextComic);
nextButtonBottom.addEventListener("click", showNextComic);

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

renderComic();