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

        // Inside your startHold function...
        holdTimer = setTimeout(() => {
        clearInterval(progressInterval);
    
        // This is the line that opens the new page!
        window.location.href = "vent.html"; 
    
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

//Load vent box screen
function navigateTo(screenId) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.style.display = 'none';
        document.getElementById(screenId).style.display = 'block';
    });

    const target = document.getElementById(screenId);
    target.style.display = 'block';
}
// 1. The Auto-Save Engine
function autoSaveSession(role, text) {
    // Grab existing history or start a new array
    let history = JSON.parse(localStorage.getItem('resilientCareHistory')) || [];
    const now = new Date();
    
    // Push the new message with a timestamp
    history.push({
        role: role,
        text: text,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString()
    });
    
    // Save it back to the browser's memory
    localStorage.setItem('resilientCareHistory', JSON.stringify(history));
    
    // 2. Trigger the Visual Indicator in the Header
    const indicator = document.getElementById('save-indicator');
    if(indicator) {
        indicator.innerText = "Saving...";
        indicator.style.color = "#C084FC"; // Flashes lavender while saving
        
        setTimeout(() => {
            indicator.innerText = "Auto-saved ✓";
            indicator.style.color = "#9CA3AF"; // Returns to gray
        }, 1000);
    }
}
function displayUserMessage(text) {
    // ... your existing code to show the bubble ...
    
    // Trigger auto-save!
    autoSaveSession('User', text); 
}

// Placeholder for sending vent data
function handleSend() {
    const text = document.getElementById('vent-input').value;
    if(text) {
        alert("Analyzing your stressors...");
        //link AI logic!
    }
}
