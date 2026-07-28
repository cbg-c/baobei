document.addEventListener("DOMContentLoaded", async () => {
    const menuContainer = document.getElementById("menu-container");
    const gameFrame = document.getElementById("game-frame");
    const activeGameName = document.getElementById("active-game-name");
    let buttons = [];

    const response = await fetch("games.json");
    const games = await response.json();

    games.forEach((game, index) => {
        const btn = document.createElement("button");
        btn.className = "game-btn";
        btn.innerHTML = `<strong>${game.name}</strong><small>${game.description}</small>`;
        
        btn.addEventListener("click", () => {
            gameFrame.src = game.path;
            activeGameName.textContent = game.name;
            
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });

        menuContainer.appendChild(btn);
        buttons.push(btn);

        if (index === 0) {
            btn.click();
        }
    });

    gameFrame.addEventListener("load", () => {
        gameFrame.focus();
    });

    document.addEventListener("keydown", (e) => {
        if (document.activeElement !== gameFrame) {
            gameFrame.contentWindow.postMessage({ type: "forward-keydown", key: e.key }, "*");
        }
    });

    document.addEventListener("click", () => {
        gameFrame.focus();
    });
});
