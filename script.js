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
        
        // The Ash-AI Persona: Tailored for College Student Friction
        // NOW USING AUTOMATIC MODE DETECTION
        this.intents = [
            {
                category: "Harsh Grading",
                autoMode: "Direct", // Auto-routes to Direct
                keywords: ["failed", "grade", "rubric", "points docked", "harsh", "feedback", "unfair"],
                responses: {
                    Direct: "That was a high-friction moment, but we can reset.\n1. Spend 2 minutes breathing to drop your heart rate.\n2. Isolate the exact technical critique and ignore the tone.\n3. Draft a short, neutral email to the TA for clarification."
                }
            },
            {
                category: "Confusing Material",
                autoMode: "Balanced", // Auto-routes to Balanced
                keywords: ["confused", "lost", "stuck", "instructions", "assignment", "don't understand"],
                responses: {
                    Balanced: "You aren't lazy; you're just overwhelmed by the input. Set a timer for 10 minutes. Don't try to solve the whole assignment—just map out the very first step. Then take a break."
                }
            },
            {
                category: "Burnout & Identity",
                autoMode: "Empathetic", // Auto-routes to Empathetic
                keywords: ["quit", "burnout", "major", "not cut out", "tired", "hopeless", "pointless", "dropping"],
                responses: {
                    Empathetic: "Pouring your life into this major and feeling like you're hitting a wall is deeply discouraging. You've been under immense pressure. Just let yourself rest right now."
                }
            }
        ];

        // Fallbacks if no specific keywords are detected
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
        // 1. Run Sentiment Analysis (The Distressed Override)
        const emotion = await detectEmotion(userInput);

        if(emotion === "distressed"){
            return {
                text: "That sounds really overwhelming. When everything piles up like this, the brain goes into protection mode. Let's slow things down together. What's the smallest thing on your plate right now?",
                detectedMode: "Empathetic"
            };
        }

        // 2. Keyword & Intent Analysis (Auto-Detect Mode)
        const analysis = this.analyzeIntent(userInput);

        if (analysis.intent && analysis.score > 0) {
            const autoSelectedMode = analysis.intent.autoMode;
            return {
                text: analysis.intent.responses[autoSelectedMode],
                detectedMode: autoSelectedMode
            };
        }

        // 3. Fallback
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

function toggleSidebar() {

  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const app = document.querySelector('.app');

  if (!sidebar) return;

  if (window.innerWidth <= 640) {
    sidebar.classList.toggle('show-sidebar');

    if (overlay) {
      overlay.classList.toggle('show-overlay');
    }

  } else {
    if (app) {
      app.classList.toggle('sidebar-closed');
    }
  }
}
function injectChip(text) {
  const inp = document.getElementById('user-input');
  inp.value = text;
  updateChar();
  autoResize(inp);
 
  if (window.innerWidth <= 640) {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('show-sidebar');
    if (overlay) overlay.classList.remove('show-overlay');
  }
 
  sendMessage();
}
function sendChip(el, text) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  injectChip(text);
}
// -------------------------------------

function toggleDropdown() {
    const menu = document.getElementById("modeDropdown");
    if(menu) menu.classList.toggle("show");
}

function selectMode(element, mode) {
    const cards = document.querySelectorAll(".mode-card");
    cards.forEach(c => c.classList.remove("active"));
    element.classList.add("active");
    localStorage.setItem('resilientCareMode', mode);
}

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem('resilientCareMode')) {
        localStorage.setItem('resilientCareMode', 'Empathetic');
    }

    function updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateEl = document.getElementById('current-date');
        if(dateEl) dateEl.innerText = now.toLocaleDateString('en-US', options);
    }
    updateDate();

    // Vent Button Hold Logic
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
function handleSend() {
    const inputElement = document.getElementById('vent-input');
    const userText = inputElement.value.trim();

    if (!userText) return;

    inputElement.value = '';
    
    displayUserMessage(userText);
    showTypingIndicator();

    // Store the user's message in the AI's short-term memory
    AI.remember("user", userText);

    setTimeout(() => {
        removeTypingIndicator();

        // The AI now automatically determines the best mode based on what you type!
        AI.generateResponse(userText).then(aiResponse => {
            displayChatMessage(aiResponse.text);
            AI.remember("ai", aiResponse.text); 
            
            // Helpful log for debugging your auto-routing
            console.log("AI Auto-Selected Mode:", aiResponse.detectedMode);
        });

    }, 1500);

    // Close sidebar automatically on mobile if it is open
    const sidebar = document.getElementById('mobile-sidebar');
    if (sidebar && sidebar.classList.contains('show-sidebar')) {
        toggleSidebar(); 
    }
} // <-- FIXED: Removed the extra trailing bracket that was here!

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