const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
let currentRow = 0;
let currentTile = 0;
let gameOver = false;
let board = [];
let targetWord = "";
let validWords = new Set();

async function init() {
    // 1. Load the database
    const res = await fetch("words.json");
    const data = await res.json();
    
    validWords = new Set([...data.answers, ...data.validGuesses]);
    
    // Pick a random word from answers (In a real scenario, base this on the date)
    targetWord = data.answers[Math.floor(Math.random() * data.answers.length)];
    
    // 2. Build the UI board
    const boardContainer = document.getElementById("board");
    for (let r = 0; r < MAX_GUESSES; r++) {
        const row = document.createElement("div");
        row.className = "row";
        const rowData = [];
        for (let c = 0; c < WORD_LENGTH; c++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            row.appendChild(tile);
            rowData.push(tile);
        }
        boardContainer.appendChild(row);
        board.push(rowData);
    }
}

// 3. Handle keyboard input
document.addEventListener("keydown", (e) => {
    if (gameOver) return;

    const key = e.key.toLowerCase();
    const messageEl = document.getElementById("message");
    messageEl.textContent = ""; // clear messages

    if (key === "enter") {
        submitGuess();
    } else if (key === "backspace") {
        deleteLetter();
    } else if (/^[a-z]$/.test(key)) {
        addLetter(key);
    }
});

function addLetter(letter) {
    if (currentTile < WORD_LENGTH) {
        const tile = board[currentRow][currentTile];
        tile.textContent = letter;
        tile.classList.add("filled");
        currentTile++;
    }
}

function deleteLetter() {
    if (currentTile > 0) {
        currentTile--;
        const tile = board[currentRow][currentTile];
        tile.textContent = "";
        tile.classList.remove("filled");
    }
}

function submitGuess() {
    if (currentTile !== WORD_LENGTH) {
        document.getElementById("message").textContent = "Not enough letters";
        return;
    }

    // Gather the guess
    let guess = "";
    for (let i = 0; i < WORD_LENGTH; i++) {
        guess += board[currentRow][i].textContent.toLowerCase();
    }

    if (!validWords.has(guess)) {
        document.getElementById("message").textContent = "Not in word list";
        return;
    }

    // Check colors
    let targetLetters = targetWord.split("");
    let guessTiles = board[currentRow];

    // First pass: Find exact matches (Green)
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === targetWord[i]) {
            guessTiles[i].classList.add("correct");
            targetLetters[i] = null; // consume letter
        }
    }

    // Second pass: Find present letters (Yellow) or Absent (Gray)
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessTiles[i].classList.contains("correct")) continue;

        let index = targetLetters.indexOf(guess[i]);
        if (index !== -1) {
            guessTiles[i].classList.add("present");
            targetLetters[index] = null; // consume letter
        } else {
            guessTiles[i].classList.add("absent");
        }
    }

    // End game logic
    if (guess === targetWord) {
        document.getElementById("message").textContent = "You win!";
        document.getElementById("message").style.color = "#6aaa64";
        gameOver = true;
    } else if (currentRow === MAX_GUESSES - 1) {
        document.getElementById("message").textContent = targetWord.toUpperCase();
        gameOver = true;
    } else {
        currentRow++;
        currentTile = 0;
    }
}

init();
