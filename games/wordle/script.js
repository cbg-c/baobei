/* --- Official Wordle Engine Replication --- */
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

// Game State
let gameState = {
    currentRow: 0,
    currentTile: 0,
    isGameOver: false,
    boardData: [], // Stores DOM element refs
    targetWord: "",
    validWords: new Set(),
    // Tracks the color priority of each keyboard key: 3=correct, 2=present, 1=absent, 0=unknown
    letterStates: {} 
};

// Official QWERTY layout
const LAYOUT = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"]
];

async function init() {
    // 1. Fetch official Database
    try {
        const res = await fetch("words.json");
        if (!res.ok) throw new Error("Failed to load dictionary.");
        const data = await res.json();
        gameState.validWords = new Set([...data.answers, ...data.validGuesses]);
        // Set target word based on date or random (here random for simplicity)
        gameState.targetWord = data.answers[Math.floor(Math.random() * data.answers.length)];
        console.log("Target Word Set");
    } catch (e) {
        showMessage("Error: Dictionary not found.");
        return;
    }

    // 2. Build Game Board
    const board = document.getElementById("board");
    for (let r = 0; r < MAX_GUESSES; r++) {
        const row = document.createElement("div");
        row.className = "row";
        const rowDomRefs = [];
        for (let c = 0; c < WORD_LENGTH; c++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.setAttribute('data-state', 'empty');
            row.appendChild(tile);
            rowDomRefs.push(tile);
        }
        board.appendChild(row);
        gameState.boardData.push(rowDomRefs);
    }

    // 3. Build Keyboard
    buildKeyboard();

    // 4. Input Handlers
    document.addEventListener("keydown", handlePhysicalKey);
}

// Consolidate both visual and physical inputs
function processInput(key) {
    if (gameState.isGameOver) return;
    hideMessage(); // Clear old errors

    if (key === "enter") {
        submitGuess();
    } else if (key === "backspace") {
        deleteLetter();
    } else if (/^[a-z]$/.test(key)) {
        addLetter(key);
    }
}

/* --- Input Handling Logic --- */
function handlePhysicalKey(e) { processInput(e.key.toLowerCase()); }

function addLetter(letter) {
    if (gameState.currentTile < WORD_LENGTH) {
        const tile = gameState.boardData[gameState.currentRow][gameState.currentTile];
        tile.textContent = letter;
        tile.setAttribute('data-state', 'filled');
        gameState.currentTile++;
    }
}

function deleteLetter() {
    if (gameState.currentTile > 0) {
        gameState.currentTile--;
        const tile = gameState.boardData[gameState.currentRow][gameState.currentTile];
        tile.textContent = "";
        tile.setAttribute('data-state', 'empty');
    }
}

/* --- Core Wordle Check/Animation Logic --- */
function submitGuess() {
    if (gameState.currentTile !== WORD_LENGTH) {
        showMessage("Not enough letters");
        shakeRow();
        return;
    }

    let guess = "";
    const guessRow = gameState.boardData[gameState.currentRow];
    for (let i = 0; i < WORD_LENGTH; i++) {
        guess += guessRow[i].textContent.toLowerCase();
    }

    if (!gameState.validWords.has(guess)) {
        showMessage("Not in word list");
        shakeRow();
        return;
    }

    // --- Start official reveal sequence ---
    gameState.isGameOver = true; // Temporary lock during animations
    
    let targetArr = gameState.targetWord.split("");
    let results = new Array(WORD_LENGTH).fill('absent'); // Default state

    // First Pass: Find Green matches (Correct position)
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === targetArr[i]) {
            results[i] = 'correct';
            targetArr[i] = null; // consume letter
        }
    }

    // Second Pass: Find Yellow matches (Wrong position)
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (results[i] === 'correct') continue;
        const index = targetArr.indexOf(guess[i]);
        if (index !== -1) {
            results[i] = 'present';
            targetArr[index] = null; // consume letter
        }
    }

    // Sequential flip animation reveal
    const FLIP_DURATION = 500; 
    const STAGGER = 200; 

    guessRow.forEach((tile, i) => {
        // Step 1: Start Flip
        setTimeout(() => {
            tile.classList.add('flip-in');
        }, i * STAGGER);

        // Step 2: Halfway through flip, change color/state
        setTimeout(() => {
            tile.classList.remove('flip-in');
            tile.setAttribute('data-state', results[i]);
            // Step 3: Back-flip to normal position with new color
            tile.style.animation = `flipReveal ${FLIP_DURATION/2}ms ease-out`;
            
            // Clean up back-flip style after animation finishes
            setTimeout(() => { tile.style.animation = ""; }, FLIP_DURATION/2);

            // 4. Update visual keyboard color priority (Letters Left tracked here)
            updateKeyPriority(guess[i], results[i]);

        }, (i * STAGGER) + (FLIP_DURATION / 2));
    });

    // Handle game end status after all animations complete
    const TOTAL_REVEAL_TIME = (WORD_LENGTH * STAGGER) + FLIP_DURATION;
    setTimeout(() => {
        if (guess === gameState.targetWord) {
            showMessage("Splendid!");
            bounceRow();
            gameState.isGameOver = true;
        } else if (gameState.currentRow === MAX_GUESSES - 1) {
            showMessage(gameState.targetWord.toUpperCase()); // Game Over, show answer
            gameState.isGameOver = true;
        } else {
            // Game continues
            gameState.isGameOver = false; 
            gameState.currentRow++;
            gameState.currentTile = 0;
        }
    }, TOTAL_REVEAL_TIME);
}

/* --- Keyboard Tracking & Visual Priorities --- */
function updateKeyPriority(letter, state) {
    // Priorities: correct(3) > present(2) > absent(1) > unknown(0)
    const priority = { 'correct': 3, 'present': 2, 'absent': 1 };
    const currentPriority = gameState.letterStates[letter] || 0;
    const newPriority = priority[state];

    // Only update keyboard color if the new instance of the letter is higher priority
    if (newPriority > currentPriority) {
        gameState.letterStates[letter] = newPriority;
        
        // Update DOM Key visual
        const keyEl = document.querySelector(`.key[data-key='${letter}']`);
        if (keyEl) {
            // Remove previous lower-priority classes
            keyEl.classList.remove('correct', 'present', 'absent');
            // Apply new one
            keyEl.classList.add(state);
        }
    }
}

/* --- Visuals / Animations --- */
function buildKeyboard() {
    const kbContainer = document.getElementById("keyboard");
    LAYOUT.forEach(rowKeys => {
        const row = document.createElement("div");
        row.className = "keyboard-row";
        rowKeys.forEach(key => {
            const btn = document.createElement("button");
            btn.className = "key";
            btn.setAttribute('data-key', key);
            
            // Special key text/icons
            if (key === "backspace") {
                btn.innerHTML = "⌫"; // Unicode backspace icon
            } else if (key === "enter") {
                btn.textContent = "Enter";
            } else {
                btn.textContent = key;
            }

            btn.addEventListener("click", () => processInput(key));
            row.appendChild(btn);
        });
        kbContainer.appendChild(row);
    });
}

function shakeRow() {
    const row = document.querySelector(`.row:nth-child(${gameState.currentRow + 1})`);
    row.classList.add("shake");
    setTimeout(() => row.classList.remove("shake"), 600); // Duration matches CSS
}

function bounceRow() {
    const row = gameState.boardData[gameState.currentRow];
    row.forEach((tile, i) => {
        // Bounce staggered
        setTimeout(() => tile.classList.add("bounce"), i * 100); 
    });
}

function showMessage(msg) {
    const messageEl = document.getElementById("message");
    messageEl.textContent = msg;
    messageEl.style.opacity = "1";
}

function hideMessage() {
    document.getElementById("message").style.opacity = "0";
}

init();
