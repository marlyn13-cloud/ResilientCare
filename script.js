// Dropdown toggle function
function toggleDropdown() {
    const menu = document.getElementById("modeDropdown");
    menu.classList.toggle("show");
}

// handle selection between modes
document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".mode-card");

    cards.forEach(card => {
        card.addEventListener("click", () => {
            cards.forEach(c => c.classList.remove("active"));

            card.classList.add("active");
        });
    });
});