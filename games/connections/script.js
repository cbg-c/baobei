let allPuzzles = [];
let currentPuzzle = null;

let gameState = {
    isUnlimited: false,
    words: [],
    selected: [],
    solvedCategories: [],
    mistakes: 4,
    isGameOver: false
};

let messageTimeout;

async function init() {
    const res = await fetch("puzzles.json");
    allPuzzles = await res.json();

    document.getElementById("mode-daily").addEventListener("click", () => switchMode(false));
    document.getElementById("mode-unlimited").addEventListener("click", () => switchMode(true));
    document.getElementById("btn-shuffle").addEventListener("click", shuffleBoard);
    document.getElementById("btn-deselect").addEventListener("click", deselectAll);
    document.getElementById("btn-submit").addEventListener("click", submitGuess);

    loadGame();
}

function switchMode(unlimited) {
    if (gameState.isUnlimited === unlimited) return;
    document.getElementById("mode-daily").className = unlimited ? "mode-btn" : "mode-btn active";
    document.getElementById("mode-unlimited").className = unlimited ? "mode-btn active" : "mode-btn";
    gameState.isUnlimited = unlimited;
    loadGame();
}

function getDailyPuzzle() {
    const now = new Date();
    const start = new Date(2023, 5, 12, 0, 0, 0, 0);
    const diff = now.setHours(0, 0, 0, 0) - start.getTime();
    const index = Math.floor(diff / 86400000);
    return allPuzzles[index % allPuzzles.length];
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function loadGame() {
    document.getElementById("message").className = "";
    document.getElementById("solved-board").innerHTML = "";
    document.getElementById("board").innerHTML = "";
    
    gameState.selected = [];
    gameState.solvedCategories = [];
    gameState.mistakes = 4;
    gameState.isGameOver = false;

    if (gameState.isUnlimited) {
        currentPuzzle = allPuzzles[Math.floor(Math.random() * allPuzzles.length)];
    } else {
        currentPuzzle = getDailyPuzzle();
    }

    let allWords = [];
    currentPuzzle.categories.forEach(cat => {
        allWords = allWords.concat(cat.words);
    });
    
    shuffleArray(allWords);
    gameState.words = allWords;

    if (!gameState.isUnlimited) {
        const saved = localStorage.getItem("dailydle-connections-state");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.id === currentPuzzle.id) {
                gameState.words = parsed.words;
                gameState.solvedCategories = parsed.solvedCategories;
                gameState.mistakes = parsed.mistakes;
                gameState.isGameOver = parsed.isGameOver;
            } else {
                localStorage.removeItem("dailydle-connections-state");
            }
        }
    }

    updateBubbles();
    renderBoard();
    updateControls();
}

function saveState() {
    if (gameState.isUnlimited) return;
    localStorage.setItem("dailydle-connections-state", JSON.stringify({
        id: currentPuzzle.id,
        words: gameState.words,
        solvedCategories: gameState.solvedCategories,
        mistakes: gameState.mistakes,
        isGameOver: gameState.isGameOver
    }));
}

function renderBoard() {
    const solvedContainer = document.getElementById("solved-board");
    solvedContainer.innerHTML = "";
    
    gameState.solvedCategories.forEach(catTitle => {
        const cat = currentPuzzle.categories.find(c => c.title === catTitle);
        const div = document.createElement("div");
        div.className = "solved-category";
        div.style.backgroundColor = cat.color;
        div.innerHTML = `<h3>${cat.title}</h3><p>${cat.words.join(", ")}</p>`;
        solvedContainer.appendChild(div);
    });

    const board = document.getElementById("board");
    board.innerHTML = "";

    gameState.words.forEach(word => {
        const tile = document.createElement("div");
        tile.className = "tile";
        if (gameState.selected.includes(word)) {
            tile.classList.add("selected");
        }
        tile.textContent = word;
        tile.addEventListener("click", () => handleTileClick(word));
        board.appendChild(tile);
    });
}

function handleTileClick(word) {
    if (gameState.isGameOver) return;
    
    const index = gameState.selected.indexOf(word);
    if (index > -1) {
        gameState.selected.splice(index, 1);
    } else {
        if (gameState.selected.length < 4) {
            gameState.selected.push(word);
        }
    }
    
    renderBoard();
    updateControls();
}

function shuffleBoard() {
    if (gameState.isGameOver) return;
    shuffleArray(gameState.words);
    renderBoard();
}

function deselectAll() {
    if (gameState.isGameOver) return;
    gameState.selected = [];
    renderBoard();
    updateControls();
}

function updateControls() {
    const deselectBtn = document.getElementById("btn-deselect");
    const submitBtn = document.getElementById("btn-submit");
    
    deselectBtn.disabled = gameState.selected.length === 0 || gameState.isGameOver;
    submitBtn.disabled = gameState.selected.length !== 4 || gameState.isGameOver;
}

function updateBubbles() {
    const bubbles = document.querySelectorAll(".bubble");
    bubbles.forEach((bubble, index) => {
        if (index >= gameState.mistakes) {
            bubble.classList.add("lost");
        } else {
            bubble.classList.remove("lost");
        }
    });
}

function getSelectedTilesDOM() {
    const domTiles = [];
    document.querySelectorAll(".tile").forEach(tile => {
        if (gameState.selected.includes(tile.textContent)) {
            domTiles.push(tile);
        }
    });
    return domTiles;
}

function submitGuess() {
    if (gameState.selected.length !== 4 || gameState.isGameOver) return;

    let highestMatch = 0;
    let matchedCategory = null;

    currentPuzzle.categories.forEach(cat => {
        let matchCount = 0;
        gameState.selected.forEach(word => {
            if (cat.words.includes(word)) matchCount++;
        });
        if (matchCount > highestMatch) {
            highestMatch = matchCount;
            if (matchCount === 4) matchedCategory = cat;
        }
    });

    const domTiles = getSelectedTilesDOM();

    if (highestMatch === 4) {
        domTiles.forEach((tile, i) => {
            setTimeout(() => {
                tile.classList.add("bounce");
            }, i * 100);
        });

        setTimeout(() => {
            gameState.solvedCategories.push(matchedCategory.title);
            gameState.words = gameState.words.filter(w => !gameState.selected.includes(w));
            gameState.selected = [];
            
            if (gameState.solvedCategories.length === 4) {
                gameState.isGameOver = true;
                showMessage(gameState.isUnlimited ? "Perfect! Select Unlimited to play again." : "Perfect!", true);
            }
            
            renderBoard();
            updateControls();
            saveState();
        }, 600);

    } else {
        gameState.mistakes--;
        updateBubbles();
        saveState();

        if (highestMatch === 3) {
            showMessage("One away...");
        } else if (gameState.mistakes > 0) {
            showMessage("Not quite.");
        }

        domTiles.forEach(tile => {
            tile.classList.add("shake");
            setTimeout(() => tile.classList.remove("shake"), 500);
        });

        if (gameState.mistakes === 0) {
            setTimeout(() => {
                gameState.isGameOver = true;
                showMessage(gameState.isUnlimited ? "Better luck next time. Select Unlimited to play again." : "Better luck next time.", true);
                
                currentPuzzle.categories.forEach(cat => {
                    if (!gameState.solvedCategories.includes(cat.title)) {
                        gameState.solvedCategories.push(cat.title);
                    }
                });
                gameState.words = [];
                gameState.selected = [];
                
                renderBoard();
                updateControls();
                saveState();
            }, 600);
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
