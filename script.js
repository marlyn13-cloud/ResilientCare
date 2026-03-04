// 1. AI NLP ENGINE (The Brain)
class ResilientCareEngine {
    constructor() {
        this.intents = [
            {
                context: "Harsh Grading",
                defaultMode: "Direct",
                keywords: ["failed", "points docked", "unfair", "rubric", "grader", "feedback", "harsh", "grade"],
                responses: [
                    "That was a high-friction moment, but we can reset. Here are three steps to handle this and move forward:\n\n1. Physical Reset: Spend 5 minutes doing boxed breathing (inhale 4s, hold 4s, exhale 4s) to stop the shaky feeling.\n2. Isolate the Critique: Write down the one specific technical thing to fix. Ignore the tone; just keep the data.\n3. Micro-Transition: Drink some water and walk away for a few minutes to mentally close the door on the previous hour."
                ]
            },
            {
                context: "Confusing Material",
                defaultMode: "Balanced",
                keywords: ["don't understand", "lost", "staring at screen", "stuck", "assignments", "instructions", "nothing is happening"],
                responses: [
                    "It sounds like you're experiencing a total system overload—that distant feeling is usually your brain trying to protect itself from too much input. It’s okay to want quiet right now. Let’s try a low-input approach:\n\n• The Validation: You aren't lazy; you're overwhelmed by daily friction. It happens to the best students.\n• The Action: Set a timer for just 10 minutes. Don't try to do the assignment; just highlight the sentences in the instructions that are confusing so you can ask about them later.\n• Final Solution: After those 10 minutes, ignore your phone for an hour and do something low energy like listening to a familiar playlist to reset."
                ]
            },
            {
                context: "High Stress Crisis",
                defaultMode: "Empathetic",
                keywords: ["changing major", "not cut out", "burnout", "distant", "don't want to talk", "shaky", "overwhelmed", "breaking point", "quit"],
                responses: [
                    "I hear how heavy this feels. Pouring your life into something and not seeing it reflected is exhausting and discouraging. It's completely valid to feel like you're at a breaking point right now.\n\nBefore you make any big decisions, just let yourself be frustrated for a moment. You’ve been under a lot of pressure; it makes sense that your system is feeling overwhelmed."
                ]
            }
        ];

        this.fallbackResponses = {
            Empathetic: "I'm hearing that things feel really heavy right now. You don't have to fix everything in this exact minute. Just breathe. I'm here.",
            Direct: "Let's break this down. What is the single smallest step you can take right now to clear the friction?",
            Balanced: "This sounds incredibly draining, and your frustration makes total sense. Let's step away from the screen for 15 minutes, then look at just one small piece of the problem."
        };
    }

    tokenize(text) {
        return text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(/\s+/);
    }

    analyzeIntent(text) {
        const tokens = this.tokenize(text);
        const inputString = text.toLowerCase();
        let bestMatch = null;
        let highestScore = 0;

        this.intents.forEach(intent => {
            let score = 0;
            intent.keywords.forEach(keyword => {
                if (inputString.includes(keyword)) {
                    score += 2; 
                } else {
                    keyword.split(" ").forEach(kw => {
                        if (tokens.includes(kw)) score += 1;
                    });
                }
            });
            if (score > highestScore) {
                highestScore = score;
                bestMatch = intent;
            }
        });
        return { intent: bestMatch, score: highestScore };
    }

    generateResponse(userInput, selectedUIMode = null) {
        const analysis = this.analyzeIntent(userInput);
        if (analysis.intent && analysis.score > 0) {
            const responses = analysis.intent.responses;
            return { text: responses[Math.floor(Math.random() * responses.length)] };
        }
        const fallbackMode = selectedUIMode || "Empathetic";
        return { text: this.fallbackResponses[fallbackMode] };
    }
}
const AI = new ResilientCareEngine();

// Dropdown toggle function
function toggleDropdown() {
    const menu = document.getElementById("modeDropdown");
    menu.classList.toggle("show");
}

// Select a Mode and Save it to Memory
function selectMode(element, mode) {
    const cards = document.querySelectorAll(".mode-card");
    cards.forEach(c => c.classList.remove("active"));
    element.classList.add("active");
    
    // Save to browser memory so the AI knows what to do!
    localStorage.setItem('resilientCareMode', mode);
}

// Initialize Page Data
document.addEventListener("DOMContentLoaded", () => {
    // Set default mode if empty
    if (!localStorage.getItem('resilientCareMode')) {
        localStorage.setItem('resilientCareMode', 'Empathetic');
    }

    // Auto-updating Date
    function updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateEl = document.getElementById('current-date');
        if(dateEl) dateEl.innerText = now.toLocaleDateString('en-US', options);
    }
    updateDate();

    // Hold-to-Vent Logic
    const circle = document.querySelector('.progress-ring__circle');
    const ventBtn = document.querySelector('.btn-vent');
    if(circle && ventBtn) {
        const circumference = 597;
        let progressInterval;
        let holdTimer;
        let currentOffset = circumference;

        function startHold(e) {
            e.preventDefault();
            currentOffset = circumference;
            progressInterval = setInterval(() => {
                currentOffset -= (circumference / 15); 
                circle.style.strokeDashoffset = Math.max(0, currentOffset);
            }, 100);

            holdTimer = setTimeout(() => {
                clearInterval(progressInterval);
                window.location.href = "vent.html"; 
            }, 1500); 
        }

        function cancelHold() {
            clearTimeout(holdTimer);
            clearInterval(progressInterval);
            circle.style.strokeDashoffset = circumference; 
        }

        ventBtn.addEventListener('mousedown', startHold);
        ventBtn.addEventListener('touchstart', startHold);
        ventBtn.addEventListener('mouseup', cancelHold);
        ventBtn.addEventListener('mouseleave', cancelHold);
        ventBtn.addEventListener('touchend', cancelHold);
    }
});

function navigateTo(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.style.display = 'none');
    const target = document.getElementById(screenId);
    if(target) target.style.display = 'block';
}
// 3. VENT BOX CHAT & AUTO-SAVE LOGIC

// Auto-Save
function autoSaveSession(role, text) {
    let history = JSON.parse(localStorage.getItem('resilientCareHistory')) || [];
    const now = new Date();
    
    history.push({
        role: role,
        text: text,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString()
    });
    
    localStorage.setItem('resilientCareHistory', JSON.stringify(history));
    
    const indicator = document.getElementById('save-indicator');
    if(indicator) {
        indicator.innerText = "Saving...";
        indicator.style.color = "#C084FC"; 
        
        setTimeout(() => {
            indicator.innerText = "Auto-saved ✓";
            indicator.style.color = "#9CA3AF"; 
        }, 1000);
    }
}

// Handle sending the message
function handleSend() {
    const inputElement = document.getElementById('vent-input');
    const userText = inputElement.value.trim();
    if (!userText) return;

    inputElement.value = ''; 
    displayUserMessage(userText); 
    showTypingIndicator(); // Show AI thinking

    // Simulate AI processing time
    setTimeout(() => {
        removeTypingIndicator();
        const savedMode = localStorage.getItem('resilientCareMode') || 'Balanced';
        const aiResponse = AI.generateResponse(userText, savedMode); 
        displayChatMessage(aiResponse.text);
    }, 2000);
}

// Render User Message
function displayUserMessage(text) {
    const mainContent = document.querySelector('.vent-main');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message-bubble';
    messageDiv.innerText = text;
    mainContent.appendChild(messageDiv);
    window.scrollTo(0, document.body.scrollHeight);
    autoSaveSession('User', text); 
}

function displayChatMessage(messageText) {
    const mainContent = document.querySelector('.vent-main');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message-bubble';
    messageDiv.innerHTML = messageText.replace(/\n/g, '<br>');
    mainContent.appendChild(messageDiv);
    window.scrollTo(0, document.body.scrollHeight);
    autoSaveSession('ResilientCare AI', messageText); 
}

// Typing Indicators
function showTypingIndicator() {
    const mainContent = document.querySelector('.vent-main');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'ai-message-bubble typing-bubble';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    mainContent.appendChild(typingDiv);
    window.scrollTo(0, document.body.scrollHeight);
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}
// Function to force the chat to the bottom
function scrollToBottom() {
    const chatContainer = document.querySelector('.vent-main');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function displayUserMessage(text) {
    const mainContent = document.querySelector('.vent-main');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message-bubble';
    messageDiv.innerText = text;
    mainContent.appendChild(messageDiv);
    
    scrollToBottom();
    autoSaveSession('User', text); 
}

function displayChatMessage(messageText) {
    const mainContent = document.querySelector('.vent-main');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message-bubble';
    messageDiv.innerHTML = messageText.replace(/\n/g, '<br>');
    mainContent.appendChild(messageDiv);
    
    // Trigger Auto-Scroll and Auto-Save
    scrollToBottom();
    autoSaveSession('ResilientCare AI', messageText); 
}