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
    isAnimating: false,
    board: [],
    targetWord: "",
    validWords: new Set(),
    keyStates: {},
    isUnlimited: false
};

let allAnswers = [];
let messageTimeout;

async function init() {
    const res = await fetch("words.json");
    const data = await res.json();
    allAnswers = data.answers;
    gameState.validWords = new Set([...data.answers, ...data.validGuesses]);

    document.getElementById("mode-daily").addEventListener("click", () => switchMode(false));
    document.getElementById("mode-unlimited").addEventListener("click", () => switchMode(true));

    document.addEventListener("keydown", handlePhysicalKey);
    window.addEventListener("message", (e) => {
        if (e.data && e.data.type === "forward-keydown") {
            handleInput(e.data.key.toLowerCase());
        }
    });

    await loadGame();
}

async function switchMode(unlimited) {
    if (gameState.isUnlimited === unlimited) return;
    document.getElementById("mode-daily").className = unlimited ? "mode-btn" : "mode-btn active";
    document.getElementById("mode-unlimited").className = unlimited ? "mode-btn active" : "mode-btn";
    gameState.isUnlimited = unlimited;
    await loadGame();
}

async function getDailyWord() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;
    const url = `https://www.nytimes.com/svc/wordle/v2/${dateString}.json`;
    
    const proxies = [
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];

    for (const proxy of proxies) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(proxy, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.solution) {
                    return data.solution;
                }
            }
        } catch (e) {}
    }
    
    const start = new Date(2021, 5, 19, 0, 0, 0, 0);
    const diff = now.setHours(0, 0, 0, 0) - start.getTime();
    const index = Math.floor(diff / 86400000);
    return allAnswers[index % allAnswers.length];
}

async function loadGame() {
    document.getElementById("message").className = "";
    const boardEl = document.getElementById("board");
    boardEl.innerHTML = "";
    const kbEl = document.getElementById("keyboard");
    kbEl.innerHTML = "";

    gameState.currentRow = 0;
    gameState.currentTile = 0;
    gameState.isGameOver = false;
    gameState.isAnimating = false;
    gameState.board = [];
    gameState.keyStates = {};
    gameState.targetWord = "";

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

    if (gameState.isUnlimited) {
        gameState.targetWord = allAnswers[Math.floor(Math.random() * allAnswers.length)];
    } else {
        gameState.targetWord = await getDailyWord();
    }

    if (!gameState.isUnlimited) {
        const saved = localStorage.getItem("dailydle-wordle-state");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.targetWord === gameState.targetWord) {
                restoreState(parsed);
            } else {
                localStorage.removeItem("dailydle-wordle-state");
            }
        }
    }
}

function restoreState(parsed) {
    parsed.guesses.forEach(guess => {
        for (let i = 0; i < WORD_LENGTH; i++) {
            addLetter(guess[i]);
        }
        submitGuess(true);
    });
}

function saveState() {
    if (gameState.isUnlimited) return;
    const guesses = [];
    for (let r = 0; r < gameState.currentRow; r++) {
        let guess = "";
        for (let c = 0; c < WORD_LENGTH; c++) {
            guess += gameState.board[r][c].textContent.toLowerCase();
        }
        guesses.push(guess);
    }
    localStorage.setItem("dailydle-wordle-state", JSON.stringify({
        targetWord: gameState.targetWord,
        guesses: guesses
    }));
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
    if (gameState.isAnimating || !gameState.targetWord) return;
    if (gameState.isGameOver) {
        if (gameState.isUnlimited && key === "enter") {
            loadGame();
        }
        return;
    }
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

function submitGuess(isRestoring = false) {
    if (gameState.currentTile !== WORD_LENGTH) {
        if (!isRestoring) {
            showMessage("Not enough letters");
            shakeRow();
        }
        return;
    }
    let guess = "";
    for (let i = 0; i < WORD_LENGTH; i++) {
        guess += gameState.board[gameState.currentRow][i].textContent.toLowerCase();
    }
    if (!gameState.validWords.has(guess)) {
        if (!isRestoring) {
            showMessage("Not in word list");
            shakeRow();
        }
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
    
    if (isRestoring) {
        for (let i = 0; i < WORD_LENGTH; i++) {
            tileRow[i].setAttribute('data-state', results[i]);
            updateKeyState(guess[i], results[i]);
        }
        finalizeGuess(guess, isRestoring);
    } else {
        gameState.isAnimating = true;
        for (let i = 0; i < WORD_LENGTH; i++) {
            setTimeout(() => {
                tileRow[i].classList.add("flip-in");
                setTimeout(() => {
                    tileRow[i].classList.remove("flip-in");
                    tileRow[i].setAttribute('data-state', results[i]);
                    tileRow[i].classList.add("flip-out");
                    updateKeyState(guess[i], results[i]);
                    setTimeout(() => {
                        tileRow[i].classList.remove("flip-out");
                    }, 250);
                }, 250);
            }, i * 300);
        }
        setTimeout(() => {
            gameState.isAnimating = false;
            finalizeGuess(guess, isRestoring);
        }, (WORD_LENGTH * 300) + 250);
    }
}

function finalizeGuess(guess, isRestoring) {
    gameState.currentRow++;
    if (!isRestoring) saveState();
    
    if (guess === gameState.targetWord) {
        if (!isRestoring) {
            showMessage(gameState.isUnlimited ? "Splendid! Press Enter to play again." : "Splendid!", true);
            const tileRow = gameState.board[gameState.currentRow - 1];
            for (let i = 0; i < WORD_LENGTH; i++) {
                setTimeout(() => {
                    tileRow[i].classList.add("bounce");
                }, i * 100);
            }
        }
        gameState.isGameOver = true;
    } else if (gameState.currentRow === MAX_GUESSES) {
        if (!isRestoring) showMessage(gameState.targetWord.toUpperCase() + (gameState.isUnlimited ? " - Press Enter to replay" : ""), true);
        gameState.isGameOver = true;
    } else {
        gameState.currentTile = 0;
    }
}

function shakeRow() {
    const row = gameState.board[gameState.currentRow][0].parentNode;
    row.classList.add("shake");
    setTimeout(() => row.classList.remove("shake"), 600);
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

function showMessage(msg, persistent = false) {
    const messageEl = document.getElementById("message");
    messageEl.textContent = msg;
    messageEl.className = "visible";
    clearTimeout(messageTimeout);
    if (!persistent) {
        messageTimeout = setTimeout(() => { messageEl.className = ""; }, 2500);
    }
}

init();
