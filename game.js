const startButton = document.getElementById("startButton");
const landingScreen = document.getElementById("landingScreen");
const gameScreen = document.getElementById("gameScreen");

const treeHotspot = document.getElementById("treeHotspot");
const vocabChallenge = document.getElementById("vocabChallenge");
const answerButtons = document.querySelectorAll(".answer-button");
const challengeMessage = document.getElementById("challengeMessage");

const keyCount = document.getElementById("keyCount");

const journalButton = document.getElementById("journalButton");
const journalPanel = document.getElementById("journalPanel");
const closeJournalButton = document.getElementById("closeJournalButton");
const journalWords = document.getElementById("journalWords");

let vocabularyKeys = [];
let treeCompleted = false;

startButton.addEventListener("click", () => {
    landingScreen.classList.remove("active-screen");
    gameScreen.classList.add("active-screen");
});

treeHotspot.addEventListener("click", () => {
    if (treeCompleted) {
        return;
    }

    vocabChallenge.classList.remove("hidden");
    challengeMessage.textContent = "";
});

answerButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const answer = button.dataset.answer;

        if (answer === "correct") {
            learnWord("árbol", "tree");

            challengeMessage.textContent =
                "Correct! Árbol has been added to your journal.";

            treeCompleted = true;
            treeHotspot.textContent = "Tree inspected ✓";
            treeHotspot.classList.add("hotspot-complete");

            disableAnswerButtons();
        } else {
            challengeMessage.textContent =
                "Not quite. Look closely at the jungle and try again.";
        }
    });
});

journalButton.addEventListener("click", () => {
    journalPanel.classList.remove("hidden");
});

closeJournalButton.addEventListener("click", () => {
    journalPanel.classList.add("hidden");
});

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