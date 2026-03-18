// 1. AI BRAIN
// ==========================================
let sentimentModel = null;
let intentClassifier = null; 

async function loadAIModel() {
    if (!window.transformers) {
        console.warn("Transformers.js not loaded. Check your HTML CDN.");
        return;
    }

    const indicator = document.getElementById('save-indicator');
    if (indicator) indicator.innerText = "Downloading AI Models... (Once)";

    try {
        // 1. Loads the Distress Detector
        sentimentModel = await window.transformers.pipeline(
            "sentiment-analysis",
            "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
        );

        // 2. Load the Classifier 
        intentClassifier = await window.transformers.pipeline(
            "zero-shot-classification",
            "Xenova/mobilebert-uncased-mnli"
        );

        console.log("AI Models Loaded Successfully");
        if (indicator) {
            indicator.innerText = "AI Ready ✓";
            setTimeout(() => { indicator.innerText = "Auto-saved ✓"; }, 2000);
        }
    } catch (error) {
        console.error("Model loading failed:", error);
    }
}

loadAIModel();

async function detectEmotion(text){
    if(!sentimentModel) return "neutral";
    const result = await sentimentModel(text);
    if(result && result[0] && result[0].label === "NEGATIVE") return "distressed";
    return "neutral";
}

// 2.AI ENGINE
// ==========================================

class ResilientCareEngine {
    constructor() {
        this.memory = [];
        this.maxMemory = 12;

        // Tracks where the user is in the conversation
        this.state = {
            currentIntent: null,
            step: 0,
            lastEmotion: "neutral"
        };

        this.intentDatabase = {
            // Different types of intents that coincide with the users emotional state. 
            // Each has a handler that generates the appropriate response based on the conversation step.
            "coursework stress": {
                autoMode: "Direct",
                handler: (ctx, step) => {
                    if (step === 0) return "I hear you. Coursework can pile up fast. Let's get it out of your head. Do a 'Brain Dump'—type out everything you need to do, big or small, and send it to me.";
                    if (step === 1) return "Okay, deep breath. Look at that list and pick the single most urgent task. What's the very first, ridiculously small micro-step you can take to start just that one task?";
                    return "Perfect. Let's use the Pomodoro technique. Set a timer for 25 minutes and focus ONLY on that one step. Take a 5-minute break after. You've got this!";
                }
            },
            "harsh grading": {
                autoMode: "Direct",
                handler: (ctx, step) => {
                    if (step === 0) return "That feedback probably felt personal. What exactly did they say?";
                    if (step === 1) return "Okay, let’s strip the tone away. What’s the actual technical issue they pointed out?";
                    return "Focus only on fixing that one issue. Ignore everything else for now. We can tackle the rest later.";
                }
            },
            "confusing material": {
                autoMode: "Balanced",
                handler: (ctx, step) => {
                    if (step === 0) return "Yeah, that ‘nothing makes sense’ feeling is the worst. What topic is this for?";
                    if (step === 1) return "Let’s shrink it. What’s the first thing in the problem you *do* recognize?";
                    return "Good. Start there—don’t solve it fully, just understand that one piece.";
                }
            },
            "burnout and doubt": {
                autoMode: "Empathetic",
                handler: (ctx, step) => {
                    if (step === 0) return "That sounds exhausting. How long have you been feeling like this?";
                    if (step === 1) return "That’s a lot to carry. Be honest—when was the last time you actually rested?";
                    return "Right now, productivity isn’t the goal. Recovery is. Even 20 minutes completely away from the screen will help.";
                }
            },
            "imposter syndrome": {
                autoMode: "Grounded",
                handler: (ctx, step) => {
                    if (step === 0) return "It feels like everyone else gets it except you, right?";
                    if (step === 1) return "That’s way more common than you think. What specifically feels confusing?";
                    return "Let’s isolate one concept and break it down together. You aren't behind, you are just learning.";
                }
            },
            "deadline overload": {
                autoMode: "Direct",
                handler: (ctx, step) => {
                    if (step === 0) return "Too many deadlines at once can shut your brain down. What’s due absolutely first?";
                    if (step === 1) return "Good. Ignore everything else. What’s the very first step in that specific task?";
                    return "Focus only on that step. Don’t think beyond it yet. One step is progress.";
                }
            },
            "frustration": {
                autoMode: "Empathetic",
                handler: (ctx, step, lastInput) => {
                    if (step === 0) return "Frustration is such a heavy feeling. Is there a specific class, project, or situation that's triggering this right now, or is it just everything at once?";
                    if (step === 1) {
                        if (lastInput.length > 30) return "That sounds incredibly annoying to deal with. When things get this frustrating, it helps to step back. What is one tiny thing you actually have control over in this situation?";
                        return "I hear you. When things get this frustrating, it helps to shrink the focus. What is one tiny thing you actually have control over right now?";
                    }
                    return "Focus just on that piece you can control. Sometimes the best way to deal with frustration is to completely step away for 10 minutes, grab some water, and reset. You don't have to fix it all right now.";
                }
            },
            "sadness": {
                autoMode: "Empathetic",
                handler: (ctx, step, lastInput) => {
                    if (step === 0) return "I'm really sorry you're feeling sad. It's completely okay to have days like this. Do you know what's making you feel down, or is it just a general heaviness?";
                    if (step === 1) {
                        if (lastInput.includes("don't know") || lastInput.length < 15) return "That makes sense. Sometimes the heaviness just sits there without a clear reason. Have you done anything kind for yourself today, even something tiny like getting a snack?";
                        return "Thank you for sharing that with me. When you're feeling sad, it's important to be gentle with yourself. Have you done anything kind for yourself today, even something tiny?";
                    }
                    return "Let's make that the only goal right now. Grab some water, listen to a comfort song, or just rest for a bit. The coursework will be there later; take care of yourself first.";
                }
            },
            "anxiety": {
                autoMode: "Empathetic",
                handler: (ctx, step, lastInput) => {
                    const safeInput = (lastInput || "").toLowerCase();

                    // Step 0: The Initial Question
                    if (step === 0) {
                        return "I'm really sorry you're feeling anxious. It's completely okay to have days like this. Do you know what's making you feel anxious?";
                    }

                    // Step 1: The seperating Paths 
                    if (step === 1) {
                        // PATH A: They don't know why
                        if (safeInput.includes("no") || safeInput.includes("not sure") || safeInput.includes("i don't")) {
                            return "That makes sense. Sometimes the heaviness just sits there without a clear reason. Be kind to yourself today, even something tiny like getting a snack can help. The coursework will be there later; take care of yourself first.";
                        }
                        
                        // PATH B: They say yes, OR they just start venting about the reason
                        return "Thank you for sharing that with me. When you're dealing with anxiety, it's important to be gentle with yourself. Go grab some water, listen to a comfort song, or just rest for a bit to let your nervous system reset.";
                    }
                    
                    // Fallback just in case they keep talking after the flow ends
                    return "Take it one small step at a time. I'm always here if you need to keep venting.";
                }
            },
            "missed exam": {
                autoMode: "Direct",
                handler: (ctx, step, lastInput) => {
                    const safeInput = (lastInput || "").toLowerCase();
                    
                    if (step === 0) return "That stomach-drop feeling is awful, but panicking won't fix it. Have you emailed your professor yet to explain what happened?";
                    
                    if (step === 1) {
                        // 2. PATH A: The user has NOT emailed them yet
                        if (safeInput.includes("no") || safeInput.includes("not yet")) {
                            return "Okay, review the syllabus first to see if there is a makeup policy. If there is, follow those instructions exactly. If not, email the professor immediately to explain the situation and ask if there are options.";
                        }
                        
                        // 3. PATH B: The user HAS already emailed them
                        if (safeInput.includes("yes") || safeInput.includes("already")) {
                            return "Good. You took the hardest step. Now we just have to wait for their reply.";
                        }
                        
                        // 4. FALLBACK: If they type something confusing that isn't yes or no
                        return "Either way, the best move is to check the syllabus for the makeup policy and email the professor as soon as possible.";
                    }
                    
                    // Step 2
                    return "Right now, to reduce stress, close your laptop, wait for a response,step away from the screen for 20 minutes, and let your adrenaline come down. You will survive this.";
                }
            },
        };

        this.categories = Object.keys(this.intentDatabase);
    }

    remember(role, text) {
        this.memory.push({ role, text });
        if (this.memory.length > this.maxMemory) this.memory.shift();
    }

    getContext() {
        return this.memory.map(m => `${m.role}: ${m.text}`).join("\n");
    }

    applyEmotionLayer(baseText, emotion) {
        if (emotion === "distressed") {
            return "I can tell this is really weighing on you. " + baseText;
        }
        return baseText;
    }

    maybeAddFollowUp(text) {
        if (text.includes("?")) return text;
        const followUps = [
            "What part of this is hardest right now?",
            "What’s making this feel overwhelming?",
            "What’s one small step you could try?"
        ];
        if (Math.random() > 0.5) {
            return text + "\n\n" + followUps[Math.floor(Math.random() * followUps.length)];
        }
        return text;
    }

    async generateResponse(userInput) {
        this.remember("user", userInput);

        const emotion = await detectEmotion(userInput);
        
        // 1. Quick Starter presets based on exact matches to common student stress scenarios. 
        // This allows for instant responses if a user doesn't know whow to express themselves.
        const exactMatches = {
            "I feel frustrated. How can I deal with this frustration?": "frustration", 
            "I feel sad. What are some steps to cope?": "sadness",
            "I missed an exam": "missed exam",
            "i missed an exam": "missed exam",
            "I feel stressed so much coursework has to get done. How can I manage this stress?": "coursework stress",
            "I feel stressed so much coursework has to get done.": "coursework stress",
            "I feel anxious. How can I manage this anxiety?": "anxiety",
            "I got harsh feedback on my assignment and I feel crushed.": "harsh grading",
            "I'm so confused by this assignment. I don't even know where to start.": "confusing material",
            "I'm completely burned out. I don't know why I'm even in this major.": "burnout and doubt",
            "I feel like everyone else gets it and I'm the only one lost.": "imposter syndrome",
            "I have three deadlines this week and I'm completely overwhelmed.": "deadline overload",
            //If user types instead of selecting a quick starter.
            "Coursework is piling up and I'm stressed.": "coursework stress",
            "I got a bad grade and I feel crushed.": "harsh grading",
            "I'm so lost on this assignment.": "confusing material",
            "I'm totally burned out.": "burnout and doubt",
            "Everyone else gets it but me.": "imposter syndrome",
            "Too many deadlines at once.": "deadline overload",
            //case sensitivity variations
            "coursework is piling up and I'm stressed.": "coursework stress",
            "i got a bad grade and I feel crushed.": "harsh grading",
            "i'm so lost on this assignment.": "confusing material",
            "i'm totally burned out.": "burnout and doubt",
            "everyone else gets it but me.": "imposter syndrome",
            "too many deadlines at once.": "deadline overload"
        };

        let topMLIntent = null;
        let mlConfidence = 0;
       

        if (intentClassifier && !exactMatches[userInput]) {
            const result = await intentClassifier(userInput, this.categories);
            topMLIntent = result.labels[0];
            mlConfidence = result.scores[0];
        }

        // 2. CONVERSATION STATE 
        if (exactMatches[userInput]) {
            this.state.currentIntent = exactMatches[userInput];
            this.state.step = 0;
        } 
        else if (this.state.currentIntent !== null) {
            if (mlConfidence > 0.70 && topMLIntent !== this.state.currentIntent) {
                this.state.currentIntent = topMLIntent;
                this.state.step = 0;
            } else {
                this.state.step++;
            }
        } 
        else if (mlConfidence > 0.25) {
            this.state.currentIntent = topMLIntent;
            this.state.step = 0;
        }

        let responseText;
        let finalMode = "Balanced";

        // 3. GENERATE RESPONSE BASED ON STATE
        if (this.state.currentIntent && this.intentDatabase[this.state.currentIntent]) {
            const handler = this.intentDatabase[this.state.currentIntent].handler;
            
            // CRITICAL FIX: Add userInput right here!
            responseText = handler(this.getContext(), this.state.step, userInput); 
            
            finalMode = this.intentDatabase[this.state.currentIntent].autoMode;

            if (this.state.step === 0) {
                responseText = this.applyEmotionLayer(responseText, emotion);
            }

            if (this.state.step >= 2) {
                this.state.currentIntent = null;
                this.state.step = 0;
            }
        }
        // 4. SMART RESPONSES
        else {
            if (emotion === "distressed") {
                const stressedFallbacks = [
                    "That sounds really tough to carry. Let’s not solve everything right now—what’s one small thing you can do for yourself?",
                    "I hear how heavy this feels. You don't have to figure it all out today. Just breathe."
                ];
                responseText = stressedFallbacks[Math.floor(Math.random() * stressedFallbacks.length)];
                finalMode = "Empathetic";
            } else {
                const neutralFallbacks = [
                    "I hear you. I'm currently focused on helping with college stress, but I'm here if you need to vent about academics!",
                    "Sounds like a plan. Let me know if you run into any overwhelming friction today."
                ];
                responseText = neutralFallbacks[Math.floor(Math.random() * neutralFallbacks.length)];
                finalMode = "Grounded";
            }
        }

        this.remember("assistant", responseText);

        return {
            text: responseText,
            detectedMode: finalMode
        };
    }
}

const AI = new ResilientCareEngine();

//END OF AI LOGIC

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

// Drops starter text into the chat box 
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

document.addEventListener("DOMContentLoaded", () => {
// END OF VENT BOX FUNCTIONS

//HOME SCREEN FUNCTIONS
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
                //Resets the progress bar if not fully pressed.
                circle.style.strokeDashoffset = circumference;
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

window.handleSend = function() {
    const inputElement = document.getElementById('vent-input');
    const userText = inputElement.value.trim();

    if (!userText) return;

    inputElement.value = '';
    
    displayUserMessage(userText);
    showTypingIndicator();

    setTimeout(() => {
        removeTypingIndicator();

        AI.generateResponse(userText).then(aiResponse => {
            displayChatMessage(aiResponse.text);
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