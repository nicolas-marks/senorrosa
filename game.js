const startButton = document.getElementById("startButton");
const landingScreen = document.getElementById("landingScreen");
const gameScreen = document.getElementById("gameScreen");
const treeHotspot = document.getElementById("treeHotspot");

startButton.addEventListener("click", () => {
    landingScreen.classList.remove("active-screen");
    gameScreen.classList.add("active-screen");
});

treeHotspot.addEventListener("click", () => {
    alert("You found an interactive story element.");
});