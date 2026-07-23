// HTML elements
const startButton = document.getElementById("startButton");
const landingScreen = document.getElementById("landingScreen");
const gameScreen = document.getElementById("gameScreen");

const treeHotspot = document.getElementById("treeHotspot");
const vocabChallenge = document.getElementById("vocabChallenge");
const challengeOverlay = document.getElementById("challengeOverlay");
const answerButtons = document.querySelectorAll(".answer-button");
const challengeMessage = document.getElementById("challengeMessage");

const keyCount = document.getElementById("keyCount");

const journalButton = document.getElementById("journalButton");
const journalPanel = document.getElementById("journalPanel");
const closeJournalButton = document.getElementById("closeJournalButton");
const journalWords = document.getElementById("journalWords");
const chapterTitle = document.querySelector("#gameScreen .comic-panel h2");
const narration = document.querySelector("#gameScreen .comic-panel .narration");
const challengeQuestion = document.querySelector("#vocabChallenge p");
const fallbackTitle = "The Shadow in the Jungle";
const fallbackNarration =
    "Rain falls over the Yucatán jungle. Something moves behind the trees.";

// Game state
let vocabularyKeys = [];
let treeCompleted = false;
let chapterData = null;
let currentHotspot = null;
let currentChallenge = null;
let currentReward = null;
let currentCorrectAnswer = "";

async function loadChapterData() {
    try {
        const response = await fetch("stories/chapter1/chapter.json");

        if (!response.ok) {
            throw new Error(`Could not load chapter data (${response.status})`);
        }

        chapterData = await response.json();

        if (chapterTitle) {
            chapterTitle.textContent = chapterData.title || fallbackTitle;
        }

        if (narration) {
            const firstPage = chapterData.pages && chapterData.pages[0];
            narration.textContent = firstPage?.narration || fallbackNarration;
        }

        const firstPage = chapterData.pages && chapterData.pages[0];
        const firstHotspot = firstPage?.hotspots?.[0];

        if (firstHotspot) {
            currentHotspot = firstHotspot;
            currentChallenge = firstHotspot.challenge;
            currentReward = firstHotspot.reward;
            currentCorrectAnswer = firstHotspot.challenge?.correct || "";

            if (treeHotspot) {
                treeHotspot.dataset.hotspotId = firstHotspot.id || "tree";
                treeHotspot.setAttribute(
                    "aria-label",
                    firstHotspot.label || "Inspect the hotspot"
                );
            }

            if (challengeQuestion && currentChallenge?.question) {
                challengeQuestion.textContent = currentChallenge.question;
            }

            if (currentChallenge?.answers) {
                answerButtons.forEach((button, index) => {
                    const answer = currentChallenge.answers[index];

                    if (answer) {
                        button.textContent = answer;
                        button.value = answer;
                    }
                });
            }

            if (currentReward?.spanish && currentReward?.english) {
                treeHotspot.dataset.rewardSpanish = currentReward.spanish;
                treeHotspot.dataset.rewardEnglish = currentReward.english;
            }
        }
    } catch (error) {
        console.error(
            "Señor Rosa could not load chapter.json. Using the built-in fallback text instead.",
            error
        );

        if (chapterTitle) {
            chapterTitle.textContent = fallbackTitle;
        }

        if (narration) {
            narration.textContent = fallbackNarration;
        }
    }
}

loadChapterData();

// Event listeners
startButton.addEventListener("click", () => {
    landingScreen.classList.remove("active-screen");
    gameScreen.classList.add("active-screen");
});

treeHotspot.addEventListener("click", () => {
    if (treeCompleted) {
        return;
    }

    openChallenge();
});

answerButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const selectedAnswer = button.value.trim();

        if (selectedAnswer === currentCorrectAnswer) {
            const rewardSpanish = currentReward?.spanish || "árbol";
            const rewardEnglish = currentReward?.english || "tree";

            learnWord(rewardSpanish, rewardEnglish);

            challengeMessage.textContent =
                `Correct! ${rewardSpanish} has been added to your journal.`;

            treeCompleted = true;

            treeHotspot.innerHTML =
                '<span class="hotspot-marker">✓</span>';

            treeHotspot.classList.add("hotspot-complete");

            disableAnswerButtons();

            setTimeout(() => {
                closeChallenge();
            }, 1400);
        } else {
            challengeMessage.textContent =
                "Not quite. Look closely at the jungle and try again.";
        }
    });
});

challengeOverlay.addEventListener("click", () => {
    closeChallenge();
});

journalButton.addEventListener("click", () => {
    journalPanel.classList.remove("hidden");
});

closeJournalButton.addEventListener("click", () => {
    journalPanel.classList.add("hidden");
});

// Functions
function openChallenge() {
    vocabChallenge.classList.remove("hidden");
    challengeOverlay.classList.remove("hidden");
    challengeMessage.textContent = "";
}

function closeChallenge() {
    vocabChallenge.classList.add("hidden");
    challengeOverlay.classList.add("hidden");
}

function learnWord(spanish, english) {
    const alreadyLearned = vocabularyKeys.some(
        (word) => word.spanish === spanish
    );

    if (alreadyLearned) {
        return;
    }

    vocabularyKeys.push({
        spanish,
        english
    });

    updateHud();
    updateJournal();
}

function updateHud() {
    keyCount.textContent = vocabularyKeys.length;
}

function updateJournal() {
    journalWords.innerHTML = "";

    vocabularyKeys.forEach((word) => {
        const wordCard = document.createElement("div");
        wordCard.classList.add("journal-word");

        wordCard.innerHTML = `
            <strong>${word.spanish}</strong>
            <p>${word.english}</p>
            <small>Vocabulary Key</small>
        `;

        journalWords.appendChild(wordCard);
    });
}

function disableAnswerButtons() {
    answerButtons.forEach((button) => {
        button.disabled = true;
    });
}