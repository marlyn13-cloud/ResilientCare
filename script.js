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
// 3. UI AND NAVIGATION LOGIC
// ==========================================
// ==========================================
// ASH AI — app.js
// College friction companion powered by Claude
// ==========================================

// ── System Prompt ──
const SYSTEM_PROMPT = `You are Ash, a warm, emotionally intelligent AI companion built specifically for college students navigating daily academic friction.

Your role:
- Listen first. Acknowledge feelings before jumping to solutions.
- Be genuine and conversational — never robotic or clinical.
- Help students process stress, confusion, burnout, imposter syndrome, harsh grading, deadline overload, financial stress, and social friction.
- When appropriate, offer one or two small, actionable steps — but never overwhelm.
- You are NOT a crisis counselor. If someone expresses serious self-harm or crisis, gently direct them to campus mental health or 988 (Suicide & Crisis Lifeline) while staying warm.

Detect and respond to these friction types:
1. Harsh Grading → Validate the sting, help separate emotional reaction from technical critique, offer a simple next step (e.g., draft a calm email to the TA).
2. Burnout & Major Doubt → Deep empathy first. Remind them rest is not failure. Avoid toxic positivity. Offer one tiny recovery action.
3. Confusing Material → Normalize confusion. Help them break the problem into the smallest possible first step.
4. Imposter Syndrome → Challenge the "everyone else gets it" narrative with gentle reality checks. Share the statistical normalcy of feeling this way.
5. Deadline Overload → Help triage: what is actually due first? What can be simplified? What can be dropped?
6. Financial Stress → Acknowledge the very real weight this adds. Point toward campus resources (financial aid office, emergency funds) without dismissing the emotional impact.
7. Failed Exam → Validate. Separate identity from outcome. Look at what can be changed vs. accepted.
8. Social / Roommate Friction → Validate without taking sides. Help them articulate what they actually need.

Tone rules:
- Warm, real, slightly casual — like a wise older friend who has been through it.
- Concise responses (3–6 sentences for empathy, then 1–3 action steps if relevant).
- No corporate cheerleading. No "Great question!" or "Absolutely!".
- No bullet lists unless listing steps — use natural prose otherwise.
- Format bold key phrases using **bold** markdown for emphasis sparingly.
- End each response by either asking a gentle follow-up question OR offering a small next step — never just trailing off.

After your response, on a NEW LINE (completely separate), output a JSON object ONLY like this:
{"mode":"Empathetic","category":"Burnout"}

Valid modes: Empathetic, Direct, Grounded, Crisis
Valid categories: Grading, Burnout, Confusion, Imposter, Deadlines, Financial, Exam, Social, General`;

// ── State ──
let conversationHistory = JSON.parse(localStorage.getItem('ash_history') || '[]');
let selectedMood = null;
let isTyping = false;

// ==========================================
// UI HELPERS
// ==========================================

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function updateChar() {
  const inp = document.getElementById('user-input');
  document.getElementById('char-count').textContent = inp.value.length + ' / 1000';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function setMood(el, emoji) {
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedMood = emoji;
  const labels = {
    '😤': 'Frustrated',
    '😔': 'Feeling down',
    '😰': 'Anxious',
    '😐': 'Hanging in there',
    '😊': 'Doing okay'
  };
  document.getElementById('mood-label').textContent = labels[emoji] || '';
}

function setModeBadge(mode) {
  const badge = document.getElementById('mode-badge');
  const map = {
    Empathetic: 'mode-empathetic',
    Direct: 'mode-direct',
    Grounded: 'mode-grounded',
    Crisis: 'mode-crisis'
  };
  badge.className = 'mode-badge ' + (map[mode] || '');
  badge.textContent = mode || 'Listening';
}

function scrollToBottom() {
  const w = document.getElementById('chat-window');
  w.scrollTop = w.scrollHeight;
}

// ==========================================
// SESSION PERSISTENCE
// ==========================================

function saveSession() {
  localStorage.setItem('ash_history', JSON.stringify(conversationHistory));
  const s = document.getElementById('save-status');
  s.textContent = 'Saved ✓';
  setTimeout(() => { s.textContent = 'Auto-saved ✓'; }, 1200);
}

function clearHistory() {
  if (!confirm('Clear conversation history?')) return;
  conversationHistory = [];
  localStorage.removeItem('ash_history');
  const w = document.getElementById('chat-window');
  w.innerHTML = '';
  showEmptyState();
  setModeBadge('');
}

// ==========================================
// EMPTY STATE
// ==========================================

function showEmptyState() {
  const w = document.getElementById('chat-window');
  const es = document.createElement('div');
  es.className = 'empty-state';
  es.id = 'empty-state';
  es.innerHTML = `
    <div class="empty-logo">Ash<span>.</span></div>
    <p class="empty-sub">College is hard. Grades, deadlines, burnout, imposter syndrome — I'm here to help you process it all and find a path forward.</p>
    <div class="prompt-chips">
      <span class="chip" onclick="injectChip('I just got a really harsh grade and I feel devastated.')">Harsh grade ↗</span>
      <span class="chip" onclick="injectChip('I\'m burned out and questioning my major.')">Burnout ↗</span>
      <span class="chip" onclick="injectChip('I have too many deadlines and I don\'t know where to start.')">Deadline panic ↗</span>
      <span class="chip" onclick="injectChip('I feel like everyone gets it except me.')">Imposter syndrome ↗</span>
    </div>`;
  w.appendChild(es);
}

function removeEmptyState() {
  const es = document.getElementById('empty-state');
  if (es) es.remove();
}

// ==========================================
// MESSAGE RENDERING
// ==========================================

/**
 * Renders a message bubble into the chat window.
 * @param {string} role - 'user' or 'ash'
 * @param {string} text - Message content (supports **bold** markdown)
 * @param {object} meta - { mode, category } from Ash's JSON tag
 */
function renderMessage(role, text, meta = {}) {
  removeEmptyState();
  const w = document.getElementById('chat-window');
  const wrapper = document.createElement('div');
  wrapper.className = 'msg ' + role;

  // Detection tag above Ash bubbles
  if (role === 'ash' && meta.mode) {
    const tag = document.createElement('div');
    tag.className = 'detect-tag ' + meta.mode.toLowerCase();
    const icons = { Empathetic: '♡', Direct: '→', Grounded: '◎', Crisis: '!' };
    tag.textContent =
      (icons[meta.mode] || '·') + ' ' + meta.mode +
      (meta.category ? ' · ' + meta.category : '');
    wrapper.appendChild(tag);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = formatText(text);
  wrapper.appendChild(bubble);

  const metaEl = document.createElement('div');
  metaEl.className = 'msg-meta';
  metaEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  wrapper.appendChild(metaEl);

  w.appendChild(wrapper);
  scrollToBottom();
}

/**
 * Converts **bold** markdown and newlines into HTML.
 */
function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

function showTyping() {
  removeTyping();
  const w = document.getElementById('chat-window');
  const el = document.createElement('div');
  el.className = 'msg ash';
  el.id = 'typing-msg';
  const b = document.createElement('div');
  b.className = 'bubble typing-bubble';
  b.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  el.appendChild(b);
  w.appendChild(el);
  scrollToBottom();
}

function removeTyping() {
  const t = document.getElementById('typing-msg');
  if (t) t.remove();
}

// ==========================================
// CHIP / QUICK STARTERS
// ==========================================

/**
 * Populates the input with a preset text and fires sendMessage.
 */
function injectChip(text) {
  const inp = document.getElementById('user-input');
  inp.value = text;
  updateChar();
  autoResize(inp);
  sendMessage();
}

/**
 * Sidebar category button handler — marks it active then fires the chip.
 */
function sendChip(el, text) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  injectChip(text);
}

// ==========================================
// CORE SEND → CLAUDE API
// ==========================================

async function sendMessage() {
  if (isTyping) return;

  const inp = document.getElementById('user-input');
  const text = inp.value.trim();
  if (!text) return;

  inp.value = '';
  inp.style.height = 'auto';
  updateChar();
  isTyping = true;
  document.getElementById('send-btn').disabled = true;

  // Prepend mood tag if the user set one
  const fullText = selectedMood ? `[Mood: ${selectedMood}] ${text}` : text;

  renderMessage('user', text);
  conversationHistory.push({ role: 'user', content: fullText });

  showTyping();

  try {
    const messages = conversationHistory.map(m => ({ role: m.role, content: m.content }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    if (!res.ok) throw new Error('API error ' + res.status);

    const data = await res.json();
    const raw = data.content.map(c => c.text || '').join('');

    // Extract the JSON metadata Ash appends at the end
    const jsonMatch = raw.match(/\{[\s\S]*?"mode"[\s\S]*?\}/);
    let meta = {};
    let cleanText = raw;

    if (jsonMatch) {
      try {
        meta = JSON.parse(jsonMatch[0]);
        cleanText = raw.replace(jsonMatch[0], '').trim();
      } catch (e) {
        // JSON parse failed — keep raw text as-is
      }
    }

    removeTyping();
    renderMessage('ash', cleanText, meta);
    conversationHistory.push({ role: 'assistant', content: raw });

    if (meta.mode) setModeBadge(meta.mode);
    saveSession();

  } catch (err) {
    removeTyping();
    renderMessage('ash',
      "I'm having trouble connecting right now. Try refreshing, or just know — whatever you're going through, it's valid and it can get better.",
      { mode: 'Grounded', category: 'General' }
    );
    console.error('Ash API error:', err);
  }

  isTyping = false;
  document.getElementById('send-btn').disabled = false;
  document.getElementById('user-input').focus();
}

// ==========================================
// INIT — restore previous session
// ==========================================

(function init() {
  if (conversationHistory.length === 0) return;

  removeEmptyState();

  conversationHistory.forEach(m => {
    if (m.role === 'user') {
      // Strip the mood tag before displaying
      renderMessage('user', m.content.replace(/^\[Mood: .+?\] /, ''));
    } else if (m.role === 'assistant') {
      const jsonMatch = m.content.match(/\{[\s\S]*?"mode"[\s\S]*?\}/);
      let meta = {};
      let cleanText = m.content;
      if (jsonMatch) {
        try {
          meta = JSON.parse(jsonMatch[0]);
          cleanText = m.content.replace(jsonMatch[0], '').trim();
        } catch (e) {}
      }
      renderMessage('resilientCare', cleanText, meta);
    }
  });

  scrollToBottom();
})();

function toggleDropdown() {
    const menu = document.getElementById("modeDropdown");
    if(menu) menu.classList.toggle("show");
}

function selectMode(element, mode) {
    const cards = document.querySelectorAll(".mode-card");
    cards.forEach(c => c.classList.remove("active"));
    element.classList.add("active");
    // Saving to localStorage just in case you use it for UI later, but the AI ignores this now
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
    window.sendChip = function(text) {
    const inputElement = document.getElementById('vent-input');
    if (inputElement) {
        inputElement.value = text;
        inputElement.focus(); // Highlights the text box so they can just press send!
    }
}
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