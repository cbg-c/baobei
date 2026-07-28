const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const LAYOUT = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"]
];

let gameState = {
    currentRow: 0,
    currentTile: 0,
    isGameOver: false,
    board: [],
    targetWord: "",
    validWords: new Set(),
    keyStates: {}
};

async function init() {
    const res = await fetch("words.json");
    const data = await res.json();
    gameState.validWords = new Set([...data.answers, ...data.validGuesses]);
    gameState.targetWord = data.answers[Math.floor(Math.random() * data.answers.length)];
    const boardEl = document.getElementById("board");
    for (let r = 0; r < MAX_GUESSES; r++) {
        const row = document.createElement("div");
        row.className = "row";
        const rowDom = [];
        for (let c = 0; c < WORD_LENGTH; c++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.setAttribute('data-state', 'empty');
            row.appendChild(tile);
            rowDom.push(tile);
        }
        boardEl.appendChild(row);
        gameState.board.push(rowDom);
    }
    buildKeyboard();
    document.addEventListener("keydown", handlePhysicalKey);
}

function buildKeyboard() {
    const kbEl = document.getElementById("keyboard");
    LAYOUT.forEach(row => {
        const rowEl = document.createElement("div");
        rowEl.className = "keyboard-row";
        row.forEach(key => {
            const btn = document.createElement("button");
            btn.className = "key";
            btn.setAttribute('data-key', key);
            if (key === "backspace") {
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path fill="currentColor" d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z"/></svg>`;
            } else {
                btn.textContent = key;
            }
            btn.addEventListener("click", () => handleInput(key));
            rowEl.appendChild(btn);
        });
        kbEl.appendChild(rowEl);
    });
}

function handleInput(key) {
    if (gameState.isGameOver) return;
    if (key === "enter") {
        submitGuess();
    } else if (key === "backspace") {
        deleteLetter();
    } else if (/^[a-z]$/.test(key)) {
        addLetter(key);
    }
}

function handlePhysicalKey(e) {
    handleInput(e.key.toLowerCase());
}

function addLetter(letter) {
    if (gameState.currentTile < WORD_LENGTH) {
        const tile = gameState.board[gameState.currentRow][gameState.currentTile];
        tile.textContent = letter;
        tile.setAttribute('data-state', 'filled');
        gameState.currentTile++;
    }
}

function deleteLetter() {
    if (gameState.currentTile > 0) {
        gameState.currentTile--;
        const tile = gameState.board[gameState.currentRow][gameState.currentTile];
        tile.textContent = "";
        tile.setAttribute('data-state', 'empty');
    }
}

function submitGuess() {
    if (gameState.currentTile !== WORD_LENGTH) {
        showMessage("Not enough letters");
        return;
    }
    let guess = "";
    for (let i = 0; i < WORD_LENGTH; i++) {
        guess += gameState.board[gameState.currentRow][i].textContent.toLowerCase();
    }
    if (!gameState.validWords.has(guess)) {
        showMessage("Not in word list");
        return;
    }
    const tileRow = gameState.board[gameState.currentRow];
    let targetArr = gameState.targetWord.split("");
    let results = new Array(WORD_LENGTH).fill('absent');
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === targetArr[i]) {
            results[i] = 'correct';
            targetArr[i] = null;
        }
    }
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (results[i] === 'correct') continue;
        const index = targetArr.indexOf(guess[i]);
        if (index !== -1) {
            results[i] = 'present';
            targetArr[index] = null;
        }
    }
    for (let i = 0; i < WORD_LENGTH; i++) {
        tileRow[i].setAttribute('data-state', results[i]);
        updateKeyState(guess[i], results[i]);
    }
    if (guess === gameState.targetWord) {
        showMessage("Splendid!");
        gameState.isGameOver = true;
    } else if (gameState.currentRow === MAX_GUESSES - 1) {
        showMessage(gameState.targetWord.toUpperCase());
        gameState.isGameOver = true;
    } else {
        gameState.currentRow++;
        gameState.currentTile = 0;
    }
}

function updateKeyState(letter, state) {
    const currentState = gameState.keyStates[letter];
    const priority = { 'correct': 3, 'present': 2, 'absent': 1 };
    if (!currentState || priority[state] > priority[currentState]) {
        gameState.keyStates[letter] = state;
        const keyEl = document.querySelector(`.key[data-key='${letter}']`);
        if (keyEl) {
            keyEl.className = `key ${state}`;
        }
    }
}

function showMessage(msg) {
    const messageEl = document.getElementById("message");
    messageEl.textContent = msg;
    messageEl.className = "visible";
    setTimeout(() => { messageEl.className = ""; }, 1500);
}

init();
