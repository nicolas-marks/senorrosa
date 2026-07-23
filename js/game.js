// HTML elements
const startButton = document.getElementById("startButton");
const landingScreen = document.getElementById("landingScreen");
const gameScreen = document.getElementById("gameScreen");
const comicSequence = document.getElementById("comicSequence");
const chapterTitle = document.getElementById("chapterTitle");
const chapterLabel = document.getElementById("chapterLabel");
const chapterBadge = document.getElementById("chapterBadge");

const vocabChallenge = document.getElementById("vocabChallenge");
const challengeOverlay = document.getElementById("challengeOverlay");
const answerButtons = Array.from(document.querySelectorAll(".answer-button"));
const challengeQuestion = document.getElementById("challengeQuestion");
const challengeMessage = document.getElementById("challengeMessage");

const keyCount = document.getElementById("keyCount");

const journalButton = document.getElementById("journalButton");
const journalPanel = document.getElementById("journalPanel");
const closeJournalButton = document.getElementById("closeJournalButton");
const journalWords = document.getElementById("journalWords");

const fallbackTitle = "The Shadow in the Jungle";
const fallbackNarration =
    "Rain falls over the Yucatán jungle. Something moves behind the trees.";

// Game state
let vocabularyKeys = [];
let treeCompleted = false;
let chapterData = null;
let currentChallenge = null;
let currentReward = null;
let currentCorrectAnswer = "";
let treeHotspot = null;

async function loadChapterData() {
    try {
        const response = await fetch("stories/chapter1/chapter.json");

        if (!response.ok) {
            throw new Error(`Could not load chapter data (${response.status})`);
        }

        chapterData = await response.json();
        renderChapter();
    } catch (error) {
        console.error(
            "Señor Rosa could not load chapter.json. Using the built-in fallback text instead.",
            error
        );

        renderChapter();
    }
}

function renderChapter() {
    const title = chapterData?.title || fallbackTitle;
    const chapterNumber = chapterData?.chapter
        ? `Chapter ${chapterData.chapter}`
        : "Chapter 1";

    if (chapterTitle) {
        chapterTitle.textContent = title;
    }

    if (chapterLabel) {
        chapterLabel.textContent = chapterNumber;
    }

    if (chapterBadge) {
        chapterBadge.textContent = chapterNumber;
    }

    const firstPage = chapterData?.pages?.[0] || {};
    const firstHotspot = firstPage.hotspots?.[0] || null;

    currentChallenge = firstHotspot?.challenge || null;
    currentReward = firstHotspot?.reward || null;
    currentCorrectAnswer = currentChallenge?.correct || "";

    if (challengeQuestion && currentChallenge?.question) {
        challengeQuestion.textContent = currentChallenge.question;
    }

    answerButtons.forEach((button, index) => {
        button.disabled = false;
        button.classList.remove("hotspot-complete");

        const answer = currentChallenge?.answers?.[index];

        if (answer) {
            button.textContent = answer;
            button.value = answer;
        } else {
            button.textContent = "";
            button.value = "";
        }
    });

    if (challengeMessage) {
        challengeMessage.textContent = "";
    }

    const panels = chapterData?.panels?.length
        ? chapterData.panels
        : getFallbackPanels();

    renderPanels(panels, firstHotspot);
}

function getFallbackPanels() {
    return [
        {
            id: "establishing",
            type: "Establishing",
            narration: fallbackNarration,
            visualClass: "panel-establishing"
        },
        {
            id: "interaction",
            type: "Interaction",
            narration: "Vines curl around the tree trunks. Something is hidden in the leaves.",
            visualClass: "panel-interaction",
            hotspotId: "tree"
        },
        {
            id: "mystery",
            type: "Mystery",
            narration: "A shadow moves deeper into the jungle. The path ahead feels uncertain.",
            visualClass: "panel-mystery"
        }
    ];
}

function renderPanels(panels, hotspot) {
    if (!comicSequence) {
        return;
    }

    comicSequence.innerHTML = "";

    panels.forEach((panel) => {
        const panelElement = document.createElement("section");
        panelElement.className = `comic-panel ${panel.visualClass || "panel-default"}`;
        panelElement.dataset.panelId = panel.id || "panel";

        panelElement.innerHTML = `
            <div class="panel-visual"></div>
            <div class="panel-content">
                <p class="panel-type">${panel.type || "Panel"}</p>
                <p class="narration">${panel.narration || fallbackNarration}</p>
            </div>
        `;

        const visualLayer = panelElement.querySelector(".panel-visual");

        if (panel.hotspotId && hotspot && panel.hotspotId === hotspot.id) {
            treeHotspot = document.createElement("button");
            treeHotspot.id = "treeHotspot";
            treeHotspot.className = "story-hotspot";
            treeHotspot.type = "button";
            treeHotspot.setAttribute("aria-label", hotspot.label || "Inspect the hotspot");
            treeHotspot.innerHTML = '<span class="hotspot-marker">+</span>';
            treeHotspot.dataset.hotspotId = hotspot.id || "tree";
            treeHotspot.dataset.rewardSpanish = hotspot.reward?.spanish || "árbol";
            treeHotspot.dataset.rewardEnglish = hotspot.reward?.english || "tree";
            treeHotspot.addEventListener("click", () => {
                if (treeCompleted) {
                    return;
                }

                openChallenge();
            });

            visualLayer.appendChild(treeHotspot);
        }

        comicSequence.appendChild(panelElement);
    });
}

loadChapterData();

// Event listeners
startButton.addEventListener("click", () => {
    landingScreen.classList.remove("active-screen");
    gameScreen.classList.add("active-screen");
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

            if (treeHotspot) {
                treeHotspot.innerHTML = '<span class="hotspot-marker">✓</span>';
                treeHotspot.classList.add("hotspot-complete");
            }

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