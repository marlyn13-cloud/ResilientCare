// Dropdown toggle function
function toggleDropdown() {
    const menu = document.getElementById("modeDropdown");
    menu.classList.toggle("show");
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Handle Selection Between Modes
    const cards = document.querySelectorAll(".mode-card");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            cards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
        });
    });
    // Date function
function updateDate() {
    const now = new Date();
    
    // Formatting options 
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };

    const formattedDate = now.toLocaleDateString('en-US', options);
    
    document.getElementById('current-date').innerText = formattedDate;
}

updateDate();
    // 2. Vent Button Hold Logic
    const circle = document.querySelector('.progress-ring__circle');
    const ventBtn = document.querySelector('.btn-vent');
    const circumference = 597;
    let progressInterval;
    let holdTimer;
    let currentOffset = circumference;

    function startHold(e) {
        e.preventDefault();
        currentOffset = circumference;
        
        // Fill the ring over 1.5 seconds
        progressInterval = setInterval(() => {
            currentOffset -= (circumference / 15); 
            circle.style.strokeDashoffset = Math.max(0, currentOffset);
        }, 100);

        holdTimer = setTimeout(() => {
            clearInterval(progressInterval);
            window.location.hash = "#VentBox";
            alert("Vent Box Loaded!");
        }, 1500); 
    }

    function cancelHold() {
        clearTimeout(holdTimer);
        clearInterval(progressInterval);
        circle.style.strokeDashoffset = circumference; // Reset ring
    }

    ventBtn.addEventListener('mousedown', startHold);
    ventBtn.addEventListener('touchstart', startHold);
    ventBtn.addEventListener('mouseup', cancelHold);
    ventBtn.addEventListener('mouseleave', cancelHold);
    ventBtn.addEventListener('touchend', cancelHold);
});