document.addEventListener("DOMContentLoaded", async () => {
    const menuContainer = document.getElementById("menu-container");
    const gameFrame = document.getElementById("game-frame");
    let buttons = [];

    // Fetch game list
    const response = await fetch("games.json");
    const games = await response.json();

    games.forEach((game, index) => {
        const btn = document.createElement("button");
        btn.className = "game-btn";
        btn.innerHTML = `<strong>${game.name}</strong><small>${game.description}</small>`;
        
        btn.addEventListener("click", () => {
            // Update iframe
            gameFrame.src = game.path;
            
            // Manage active state styling
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });

        menuContainer.appendChild(btn);
        buttons.push(btn);

        // Auto-load the first game
        if (index === 0) {
            btn.click();
        }
    });
});
