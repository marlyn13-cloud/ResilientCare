// ==========================================
// 1. AI SENTIMENT MODEL (Browser version)
// ==========================================
let sentimentModel = null;

async function loadAIModel() {
    if (!window.transformers) {
        console.warn("Transformers.js not loaded. Make sure the CDN is in your HTML.");
        return;
    }
    sentimentModel = await window.transformers.pipeline(
        "sentiment-analysis",
        "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );
    console.log("AI Model Loaded");
}

loadAIModel();

async function detectEmotion(text){
    if(!sentimentModel){
        return "neutral";
    }
    const result = await sentimentModel(text);
    if(result && result[0] && result[0].label === "NEGATIVE"){
        return "distressed";
    }
    return "neutral";
}

// ==========================================
// 2. EMOTION & INTENT ENGINES
// ==========================================
class EmotionModel {
    constructor() {
        this.emotions = {
            stress: ["overwhelmed","burnout","too much","pressure","breaking"],
            confusion: ["lost","confused","don't understand","stuck"],
            frustration: ["unfair","failed","angry","annoyed","points docked"],
            sadness: ["tired","hopeless","sad","exhausted","pointless"]
        }
    }

    detectEmotion(text){
        const lower = text.toLowerCase();
        let scores = { stress:0, confusion:0, frustration:0, sadness:0 };

        for(const emotion in this.emotions){
            this.emotions[emotion].forEach(word=>{
                if(lower.includes(word)){
                    scores[emotion]++;
                }
            });
        }

        let highest = "neutral";
        let bestScore = 0;

        for(const e in scores){
            if(scores[e] > bestScore){
                highest = e;
                bestScore = scores[e];
            }
        }
        return highest;
    }
}

const EmotionAI = new EmotionModel();

class ResilientCareEngine {
    constructor(){
        this.memory = []; 
        this.intents = [
            {
                category: "Harsh Grading",
                autoMode: "Direct", 
                keywords: ["failed", "grade", "rubric", "points docked", "harsh", "feedback", "unfair"],
                responses: {
                    Direct: "That was a high-friction moment, but we can reset.\n1. Spend 2 minutes breathing to drop your heart rate.\n2. Isolate the exact technical critique and ignore the tone.\n3. Draft a short, neutral email to the TA for clarification."
                }
            },
            {
                category: "Confusing Material",
                autoMode: "Balanced", 
                keywords: ["confused", "lost", "stuck", "instructions", "assignment", "don't understand"],
                responses: {
                    Balanced: "You aren't lazy; you're just overwhelmed by the input. Set a timer for 10 minutes. Don't try to solve the whole assignment—just map out the very first step. Then take a break."
                }
            },
            {
                category: "Burnout & Identity",
                autoMode: "Empathetic",
                keywords: ["quit", "burnout", "major", "not cut out", "tired", "hopeless", "pointless", "dropping"],
                responses: {
                    Empathetic: "Pouring your life into this major and feeling like you're hitting a wall is deeply discouraging. You've been under immense pressure. Just let yourself rest right now."
                }
            }
        ];

        this.fallbackResponses = {
            Balanced: "This sounds incredibly draining, and your frustration makes total sense. Let's step away from the screen for 15 minutes, then look at just one small piece of the problem."
        };
    }

    analyzeIntent(text){
        const lower = text.toLowerCase();
        let bestMatch = null;
        let highestScore = 0;

        this.intents.forEach(intent => {
            let score = 0;
            intent.keywords.forEach(word=>{
                if(lower.includes(word)){
                    score++;
                }
            });

            if(score > highestScore){
                highestScore = score;
                bestMatch = intent;
            }
        });

        return { intent: bestMatch, score: highestScore };
    }

    remember(role, text){
        this.memory.push({role, text});
        if(this.memory.length > 10){
            this.memory.shift(); 
        }
    }

    async generateResponse(userInput){
        const emotion = await detectEmotion(userInput);

        if(emotion === "distressed"){
            return {
                text: "That sounds really overwhelming. When everything piles up like this, the brain goes into protection mode. Let's slow things down together. What's the smallest thing on your plate right now?",
                detectedMode: "Empathetic"
            };
        }

        const analysis = this.analyzeIntent(userInput);

        if (analysis.intent && analysis.score > 0) {
            const autoSelectedMode = analysis.intent.autoMode;
            return {
                text: analysis.intent.responses[autoSelectedMode],
                detectedMode: autoSelectedMode
            };
        }

        return { 
            text: this.fallbackResponses["Balanced"],
            detectedMode: "Balanced" 
        };
    }
}

const AI = new ResilientCareEngine();

// ==========================================
// 3. UI, NAVIGATION, AND SIDEBAR LOGIC
// ==========================================

// ==========================================
// 3. UI, NAVIGATION, AND MENU LOGIC
// ==========================================

window.toggleMenu = function() {
    const menu = document.getElementById("inline-menu");
    const btn = document.querySelector(".openbtn");
    
    if (menu) {
        menu.classList.toggle("expanded");
        if(btn) btn.classList.toggle("rotated"); // Spins the hamburger icon
    }
}

// Drops starter text into the chat box and auto-closes the menu
window.sendChip = function(text) {
    const inputElement = document.getElementById('vent-input');
    if (inputElement) {
        inputElement.value = text;
        inputElement.focus(); 
    }
    
    // Auto-close the menu so the user can see the chat
    const menu = document.getElementById("inline-menu");
    const btn = document.querySelector(".openbtn");
    if (menu && menu.classList.contains("expanded")) {
        menu.classList.remove("expanded");
        if(btn) btn.classList.remove("rotated");
    }
}

function navigateTo(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.style.display = 'none');
    const target = document.getElementById(screenId);
    if(target) target.style.display = 'block';
}

// ── INITIALIZATION (Event Listeners) ──
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Setup Date on Home Screen
    const dateEl = document.getElementById('current-date');
    if(dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.innerText = new Date().toLocaleDateString('en-US', options);
    }

    // 2. Setup Collapsible Menus in Sidebar
    const collapsibles = document.getElementsByClassName("collapsible");
    for (let i = 0; i < collapsibles.length; i++) {
        collapsibles[i].addEventListener("click", function() {
            this.classList.toggle("active-collapse");
            let content = this.nextElementSibling;
            if (content.style.maxHeight && content.style.maxHeight !== "0px") {
                content.style.maxHeight = "0px";
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
        
    }
    

    // 3. Vent Button Hold Logic
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

// ==========================================
// 4. VENT BOX CHAT & AUTO-SAVE LOGIC
// ==========================================

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

function scrollToBottom() {
    const chatContainer = document.querySelector('.vent-main');
    if(chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Handle sending the message
window.handleSend = function() {
    const inputElement = document.getElementById('vent-input');
    const userText = inputElement.value.trim();

    if (!userText) return;

    inputElement.value = '';
    
    displayUserMessage(userText);
    showTypingIndicator();

    AI.remember("user", userText);

    setTimeout(() => {
        removeTypingIndicator();

        AI.generateResponse(userText).then(aiResponse => {
            displayChatMessage(aiResponse.text);
            AI.remember("ai", aiResponse.text); 
            console.log("AI Auto-Selected Mode:", aiResponse.detectedMode);
        });

    }, 1500);
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
    
    scrollToBottom();
    autoSaveSession('ResilientCare AI', messageText); 
}

function showTypingIndicator() {
    const mainContent = document.querySelector('.vent-main');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'ai-message-bubble typing-bubble';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    mainContent.appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}