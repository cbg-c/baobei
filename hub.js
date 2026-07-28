document.addEventListener("DOMContentLoaded", async () => {
    const menuContainer = document.getElementById("menu-container");

    const response = await fetch("games.json");
    const games = await response.json();

    games.forEach(game => {
        const tile = document.createElement("a");
        tile.className = "game-tile";
        tile.href = game.path;
        tile.innerHTML = `
            <h2>${game.name}</h2>
            <p>${game.description}</p>
        `;
        menuContainer.appendChild(tile);
    });
});
