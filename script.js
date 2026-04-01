// 1. AI BRAIN & MEMORY ENGINE
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
        sentimentModel = await window.transformers.pipeline(
            "sentiment-analysis",
            "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
        );

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

// THE EMPATHY LAYER (RESISTANCE DETECTION)
// ==============================================
function isResistance(text) {
    const t = text.toLowerCase().trim();
    
    // 1. If user say a short positive word, they are NOT resisting! Lets the script continue.
    if (t === "yes" || t === "yeah" || t === "yep" || t === "sure" || t === "ok" || t === "okay") {
        return false; 
    }
    
    // 2. Otherwise, check for standard resistance words or super short answers
    return t.includes("idk") || t.includes("don't know") || t.includes("not sure") || t.includes("nothing") || t.length <= 4;
}

// LONG-TERM MEMORY & ANALYTICS ENGINE (STREAKS, MOOD LOG)
// ==========================================
const UserMemory = {
    getProfile: function() {
        return JSON.parse(localStorage.getItem('rc_userProfile')) || {
            totalSessions: 0,
            streakCount: 0,
            lastVisitDate: null,
            moodLog: [] 
        };
    },

    saveProfile: function(profile) {
        localStorage.setItem('rc_userProfile', JSON.stringify(profile));
    },

    logSession: function(emotion, intent) {
        let profile = this.getProfile();
        const today = new Date().toLocaleDateString();

        if (profile.lastVisitDate !== today) {
            let yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (profile.lastVisitDate === yesterday.toLocaleDateString()) {
                profile.streakCount++; 
            } else {
                profile.streakCount = 1; 
            }
            profile.totalSessions++;
            profile.lastVisitDate = today;
        }

        profile.moodLog.push({ date: today, emotion: emotion, intent: intent });
        if (profile.moodLog.length > 14) profile.moodLog.shift();

        this.saveProfile(profile);
        return profile;
    },

    getNudge: function() {
        let profile = this.getProfile();
        if (profile.moodLog.length < 3) return null; 

        const recentLogs = profile.moodLog.slice(-3);
        
        //  Stress Nudge
        const consecutiveStress = recentLogs.every(log => log.emotion === 'distressed' || log.intent === 'coursework stress' || log.intent === 'burnout and doubt');
        if (consecutiveStress) {
            return "I noticed you've been feeling stressed or overwhelmed for the last few sessions. It takes a lot of strength to keep checking in. How are you holding up today?";
        }

        // Milestone Nudge
        if (profile.totalSessions === 5 && profile.moodLog.length === 5) {
            return "By the way, this is your 5th session with me! I'm really proud of you for consistently taking time for your mental health. What's on your mind today?";
        }

        return null;
    }
};

// 2.AI ENGINE
// ==========================================

class ResilientCareEngine {
    constructor() {
        this.memory = [];
        this.maxMemory = 12;

        this.state = {
            currentIntent: null,
            step: 0,
            lastEmotion: "neutral"
        };

        this.intentDatabase = {
            "coursework stress": {
                autoMode: "Direct",
                handler: (ctx, step, lastInput) => {
                    const inputLower = (lastInput || "").toLowerCase();
                    let taskType = "work";
                    if (inputLower.includes("essay") || inputLower.includes("paper")) taskType = "writing";
                    if (inputLower.includes("code") || inputLower.includes("project")) taskType = "project";
                    
                    if (step === 0) {
                        return `It sounds like you have a mountain of ${taskType} on your plate. To stop the spiral, let's get it out of your head. Type out a list of exactly what is due.`;
                    }
                    if (step === 1) {
                        if (isResistance(inputLower)) return "It's totally okay if your brain is blanking or if there's too much to list. Let's just pick one tiny thing—what is one class you know you have work for?";
                        return "Good. Now, put the rest of the list in a mental drawer. For the most urgent item, what is the absolute smallest step you can take to get started?";
                    }
                    if (isResistance(inputLower)) return "If you can't think of a first step right now, just start by opening the document or reading the prompt. Set a 5-minute timer and just look at it. You can do this.";
                    return "Awesome. Close your other tabs, set a short timer, and focus just on that piece. Take a break right after.";
                }
            },
            "burnout and doubt": {
                autoMode: "Empathetic",
                handler: (ctx, step, lastInput) => {
                    const inputLower = (lastInput || "").toLowerCase();
                    if (step === 0) return "That sounds exhausting. Burnout is a heavy weight to carry. How long have you been feeling like this?";
                    
                    if (step === 1) {
                        if (isResistance(inputLower)) return "It's okay if you're not sure. When everything blurs together, it's hard to track time. When was the last time you actually rested without feeling guilty?";
                        return "That’s a lot to carry. Be honest—when was the last time you actually rested without looking at a screen or a textbook?";
                    }
                    
                    // Step 2 Empathy 
                    if (isResistance(inputLower)) {
                        return "It's okay if you have no energy left to even figure it out. Please just close your laptop and let yourself exist for a bit. The work will survive without you for an hour.";
                    }
                    return "Right now, productivity isn’t the goal. Recovery is. Please step away from the screen for 20 minutes to reset. Your brain needs a hard reset.";
                }
            },
            "harsh grading": {
                autoMode: "Direct",
                handler: (ctx, step, lastInput) => {
                    const inputLower = (lastInput || "").toLowerCase();
                    if (step === 0) return "That feedback probably felt incredibly personal. Getting a bad grade is always a punch to the gut. What part of the feedback stung the most?";
                    
                    if (step === 1) {
                        if (isResistance(inputLower)) return "It's okay if it all just hurts to look at right now. Try to take a breath and just look at the rubric. What specific area lost the most points?";
                        return "Okay, let’s try to separate the emotion from the critique. If we look past how they said it, what’s the actual technical issue they pointed out?";
                    }
                    if (isResistance(inputLower)) return "Don't force yourself to look at it right now if it's too much. Close the tab, give yourself tonight to be mad about it, and look at it again tomorrow with fresh eyes.";
                    return "Focus only on fixing that one specific issue for your next assignment. Ignore everything else for now. One step at a time.";
                }
            },
            "confusing material": {
                autoMode: "Balanced",
                handler: (ctx, step, lastInput) => {
                    const inputLower = (lastInput || "").toLowerCase();
                    let subject = "this material";
                    if (inputLower.includes("math") || inputLower.includes("calculus") || inputLower.includes("algebra")) subject = "Math";
                    if (inputLower.includes("science") || inputLower.includes("biology") || inputLower.includes("chemistry")) subject = "Science";
                    if (inputLower.includes("code") || inputLower.includes("computer") || inputLower.includes("java")) subject = "Computer Science";

                    if (step === 0) return `I completely understand. ${subject} can feel like a foreign language sometimes. Where exactly are you stuck?`;
                    
                    if (step === 1) {
                        if (isResistance(inputLower)) return "When nothing makes sense, it's easy to completely freeze up. Ignore the question for a second. What is one term or concept in there that you *do* recognize?";
                        return "Let’s shrink it down. Don't try to solve the whole problem. What’s the first thing you *do* recognize?";
                    }
                    if (isResistance(inputLower)) return "If it's truly all gibberish right now, your brain might be too tired to process it. Put it away for 30 minutes and come back to it. You aren't failing, you're just fatigued.";
                    return "Good. Start exactly there. Don’t try to solve it fully yet, just define that one small piece. You are building momentum.";
                }
            },
            "imposter syndrome": {
                autoMode: "Grounded",
                handler: (ctx, step, lastInput) => {
                    const inputLower = (lastInput || "").toLowerCase();
                    if (step === 0) return "It feels like everyone else gets it except you, right? Imposter syndrome is so incredibly common in college.";
                    if (step === 1) {
                        if (isResistance(inputLower)) return "It can feel like a general cloud of inadequacy. Let's ground it in reality: what is one specific concept you feel behind on today?";
                        return "Remember, people only show their successes; they hide their struggles. What specific concept is making you feel behind today?";
                    }
                    if (isResistance(inputLower)) return "You don't have to prove anything to me or anyone else today. Just remember that you were accepted into this program for a reason. You belong here.";
                    return "Let’s isolate that one concept and break it down. You aren't behind, you are just in the middle of learning it.";
                }
            },
            "deadline overload": {
                autoMode: "Direct",
                handler: (ctx, step, lastInput) => {
                    const inputLower = (lastInput || "").toLowerCase();
                    if (step === 0) return "The panic of multiple deadlines can completely freeze your brain. Let's stop the spiral. What is due absolutely first?";
                    
                    if (step === 1) {
                        if (isResistance(inputLower)) return "I know it feels like it's all due at once. If you had to pick just one assignment to save your grade, which one is it?";
                        return "Perfect. Mentally put the other assignments in a drawer. You are only allowed to look at this one. What is the literal first action you need to take for it?";
                    }
                    if (isResistance(inputLower)) return "If picking a step is too hard, just open the blank document and type your name. That is a victory right now.";
                    return "Focus only on that step. Set a 15-minute timer and just start that first action. Do not think beyond it yet.";
                }
            },
            "frustration": {
                autoMode: "Empathetic",
                handler: (ctx, step, lastInput) => {
                    const inputLower = (lastInput || "").toLowerCase();
                    if (step === 0) return "Frustration is such a heavy, uncomfortable feeling. Is there a specific class or situation triggering this, or is it everything at once?";
                    
                    if (step === 1) {
                        if (isResistance(inputLower)) return "It's completely fine if everything just feels generally annoying right now. You don't have to force a reason. Can you do one tiny thing right now to make your space more comfortable?";
                        return "That sounds incredibly annoying to deal with. When things get this frustrating, it helps to shrink the focus. What is one tiny thing you actually have control over right now?";
                    }
                    
                    // Step 2 Empathy 
                    if (isResistance(inputLower)) {
                        return "That is completely okay. You don't have to fix anything or do anything right now. Sometimes the best way to deal with frustration is to just step away, let yourself be annoyed for a bit, and let the wave pass. I'm here when you're ready.";
                    }
                    return "Focus just on that piece you can control. Sometimes the best way to deal with frustration is to completely step away for 10 minutes, grab some water, and reset.";
                }
            },
            "sadness": {
                autoMode: "Empathetic",
                handler: (ctx, step, lastInput) => {
                    const inputLower = (lastInput || "").toLowerCase();
                    if (step === 0) return "I'm really sorry you're feeling sad. It's completely okay to have days like this. Do you know what's making you feel down, or is it just a general heaviness?";
                    
                    if (step === 1) {
                        if (isResistance(inputLower)) return "That makes sense. Sometimes the heaviness just sits there without a clear reason. Have you done anything kind for yourself today, even something tiny like getting a snack?";
                        return "Thank you for sharing that with me. When you're feeling sad, it's important to be gentle with yourself. Have you done anything kind for yourself today?";
                    }
                    
                    // Step 2 Empathy 
                    if (isResistance(inputLower)) {
                        return "That is totally fine. You don't have to do anything right now. Just existing and getting through the day is enough. I'm here for you.";
                    }
                    return "Let's make that the only goal right now. Grab some water, listen to a comfort song, or just rest. Take care of yourself first today.";
                }
            },
            "anxiety": {
                autoMode: "Empathetic",
                handler: (ctx, step, lastInput) => {
                    const inputLower = (lastInput || "").toLowerCase();
                    if (step === 0) return "I'm really sorry you're feeling anxious. Your body is probably in overdrive right now. Do you know what specifically is making you feel this way?";
                    
                    if (step === 1) {
                        if (isResistance(inputLower)) return "That makes perfect sense. Anxiety rarely needs a logical reason to show up. Right now, let's just focus on taking a few deep breaths. Can you go grab a glass of cold water?";
                        return "Thank you for sharing that. When you're dealing with anxiety, it's important to let your nervous system reset. Can you go grab some cold water or listen to a comfort song for a few minutes?";
                    }
                    
                    // Step 2 Empathy 
                    if (isResistance(inputLower)) {
                        return "You don't have to do anything right now. You are safe. Just take a deep breath. I'm right here with you until it passes.";
                    }
                    return "Take it one small step at a time. Be gentle with yourself today. I'm always here if you need to keep venting.";
                }
            },
            "missed exam": {
                autoMode: "Direct",
                handler: (ctx, step, lastInput) => {
                    const inputLower = (lastInput || "").toLowerCase();
                    if (step === 0) return "That stomach-drop feeling is awful, but panicking won't fix it. Have you emailed your professor yet to explain what happened?";
                    
                    if (step === 1) {
                        if (inputLower.includes("no") || inputLower.includes("not yet") || isResistance(inputLower)) return "Okay, review the syllabus first to see if there is a makeup policy. If not, email the professor immediately to politely explain the situation and ask if there are options.";
                        if (inputLower.includes("yes") || inputLower.includes("already")) return "Good. You took the hardest step. Now we just have to wait for their reply. You did what you could.";
                        return "Either way, the best move is to check the syllabus for the makeup policy and email the professor as soon as possible.";
                    }
                    return "Right now, to reduce stress, close your laptop, step away from the screen for 20 minutes, and let your adrenaline come down. You will survive this.";
                }
            },
            "general venting": {
                autoMode: "Balanced",
                handler: (ctx, step, lastInput) => {
                    const inputLower = (lastInput || "").toLowerCase();
                    if (step === 0) return "I hear you. Tell me a bit more about what's going on.";
                    if (step === 1) {
                        if (isResistance(inputLower)) return "It's okay if you don't have the words right now. Sometimes just being here is enough. I'm listening.";
                        return "That makes a lot of sense. What is one small thing you can do right now to make yourself feel just 10% better?";
                    }
                    if (isResistance(inputLower)) return "There is absolutely no pressure. Just take it one step at a time today.";
                    return "Take it one step at a time. You've got this, and I'm here if you need to keep talking.";
                }
            }
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
            const intros = [
                "I can tell this is really weighing on you. ",
                "This sounds incredibly stressful. ",
                "I hear how much this is affecting you. "
            ];
            return intros[Math.floor(Math.random() * intros.length)] + baseText;
        }
        return baseText;
    }

    async generateResponse(userInput) {
        this.remember("user", userInput);

        const emotion = await detectEmotion(userInput);
        
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
            "Everyone else gets it but me.": "imposter syndrome",
            "I have three deadlines this week and I'm completely overwhelmed.": "deadline overload",
            "Coursework is piling up and I'm stressed.": "coursework stress",
            "I got a bad grade and I feel crushed.": "harsh grading",
            "I'm so lost on this assignment.": "confusing material",
            "I'm totally burned out.": "burnout and doubt",
            "Too many deadlines at once.": "deadline overload",
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

        let isNewIntent = false;

        if (exactMatches[userInput]) {
            this.state.currentIntent = exactMatches[userInput];
            this.state.step = 0;
            isNewIntent = true;
        } else if (this.state.currentIntent === null) {
            this.state.currentIntent = (mlConfidence > 0.40) ? topMLIntent : "general venting";
            this.state.step = 0;
            isNewIntent = true;
        } else if (mlConfidence > 0.85 && topMLIntent !== this.state.currentIntent) {
            this.state.currentIntent = topMLIntent;
            this.state.step = 0;
            isNewIntent = true;
        }

        if (isNewIntent && this.state.step === 0) {
            UserMemory.logSession(emotion, this.state.currentIntent);

            const nudge = UserMemory.getNudge();
            if (nudge) {
                this.state.step = 1; 
                this.remember("assistant", nudge);
                return { text: nudge, detectedMode: "Empathetic", isComplete: false };
            }
        }

        let responseText;
        let finalMode = "Balanced";
        let isComplete = false; 

        if (this.state.currentIntent && this.intentDatabase[this.state.currentIntent]) {
            const handler = this.intentDatabase[this.state.currentIntent].handler;
            
            responseText = handler(this.getContext(), this.state.step, userInput); 
            finalMode = this.intentDatabase[this.state.currentIntent].autoMode;

            if (this.state.step === 0) {
                responseText = this.applyEmotionLayer(responseText, emotion);
            }

            if (!isNewIntent) {
                const taskIntents = ["coursework stress", "confusing material", "deadline overload"];
                if (isResistance(userInput) && taskIntents.includes(this.state.currentIntent)) {
                    console.log("Empathy Hold: Waiting for user to be ready.");
                } else {
                    this.state.step++; 
                }
            } else {
                this.state.step++;
            }

            if (this.state.step > 2) {
                this.state.currentIntent = null;
                this.state.step = 0;
                isComplete = true; 
            }
        } else {
            responseText = "I'm here for you. Tell me a bit more about what's going on.";
            isComplete = true;
        }

        this.remember("assistant", responseText);

        return {
            text: responseText,
            detectedMode: finalMode,
            isComplete: isComplete
        };
    }
}

const AI = new ResilientCareEngine();

// 3. UI, NAVIGATION, VENT BOX
// ==========================================

window.sendChip = function(text) {
    const inputArea = document.getElementById('chat-input-area');
    if (inputArea) inputArea.style.display = 'flex'; 

    const inputElement = document.getElementById('vent-input');
    if (inputElement) {
        inputElement.value = text;
        inputElement.focus(); 
    }
}

function navigateTo(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.style.display = 'none');
    const target = document.getElementById(screenId);
    if(target) target.style.display = 'block';
}

document.addEventListener("DOMContentLoaded", () => {
    const dateEl = document.getElementById('current-date');
    if(dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.innerText = new Date().toLocaleDateString('en-US', options);
    }

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
                // Redirects and ensures we start a new tracking ID
                window.startNewSession(); 
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
    };
});

// HOW IT WORKS MODAL LOGIC
// ==========================================

function openHowItWorks(e) {
    if (e) e.preventDefault(); 
    const modal = document.getElementById('howItWorksModal');
    if (!modal) return; // Safety check
    
    const modalBox = modal.querySelector('.modal-content-box');
    
    // 1. Unhide the box and lock the background scrolling
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
    
    // 2. Smooth fade-in animation
    setTimeout(() => {
        modal.style.opacity = '1';
        modalBox.style.transform = 'translateY(0)';
    }, 10);
}

function closeHowItWorks() {
    const modal = document.getElementById('howItWorksModal');
    if (!modal) return;
    
    const modalBox = modal.querySelector('.modal-content-box');
    
    // 1. Smooth fade-out animation
    modal.style.opacity = '0';
    modalBox.style.transform = 'translateY(20px)';
    document.body.style.overflow = 'auto'; // Unlock background scrolling
    
    // 2. Hide the box completely after animation finishes
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Close the pop-up 
window.addEventListener('click', function(event) {
    const modal = document.getElementById('howItWorksModal');
    if (event.target === modal) {
        closeHowItWorks();
    }
});
// 4. VENT BOX CHAT & AUTO-SAVE LOGIC
// ==========================================

// FORCE NEW SESSION LOGIC
window.startNewSession = function() {
    localStorage.removeItem('activeSessionId'); 
    window.location.href = 'vent.html'; // Directs user to the vent box
}

function autoSaveSession(role, text) {
    let history = JSON.parse(localStorage.getItem('resilientCareHistory')) || [];
    const now = new Date();
    
    // Session ID system to properly group sessions
    let sessionId = localStorage.getItem('activeSessionId');
    if (!sessionId) {
        sessionId = Date.now().toString(); 
        localStorage.setItem('activeSessionId', sessionId);
    }
    
    history.push({
        role: role,
        text: text,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString(),
        sessionId: sessionId // Attach the stamp
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
            
            if (aiResponse.isComplete) {
                setTimeout(() => {
                    displayEndSessionUI();
                }, 1000); 
            }
        });

    }, 1500);
}

function displayEndSessionUI() {
    const mainContent = document.querySelector('.vent-main');
    const endDiv = document.createElement('div');
    endDiv.className = 'session-end-container';
    
    endDiv.innerHTML = `
        <div class="session-end-divider"><span>Session Complete</span></div>
        <p class="session-end-text">Click on another topic starter to start a new session, or explore your progress below:</p>
        <div class="session-end-buttons">
            <button class="btn-end-action" onclick="window.location.href='insights.html'">📈 View Insights</button>
            <button class="btn-end-action" onclick="window.location.href='history.html'">🕰️ View History</button>
        </div>
    `;
    
    mainContent.appendChild(endDiv);
    scrollToBottom();
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

// 5. Insights Page Graph Generation Logic
// ==========================================

function loadInsightsGraph() {
    try {
        // THE STREAK COUNTER FROM MEMORY ENGINE
        // =========================================================
        const profile = UserMemory.getProfile();
        const streakEl = document.getElementById('streak-counter');
        
        if (streakEl) {
            streakEl.innerText = profile.streakCount > 0 ? `${profile.streakCount} Days` : "Ready to start!";
        }
        // =========================================================

        const history = JSON.parse(localStorage.getItem('resilientCareHistory')) || [];

        // Session ID  sync with History page
        const sessions = [];
        let currentSession = [];
        let lastSessionId = null;
        let lastTimeObj = null;

        history.forEach(msg => {
            if(!msg.date || !msg.time) return;

            let isNewSession = false;

            if (msg.sessionId) {
                if (lastSessionId && msg.sessionId !== lastSessionId) {
                    isNewSession = true;
                }
            } else {
                // Fallback for older messages
                const msgTimeObj = new Date(`${msg.date} ${msg.time}`);
                if (lastTimeObj && ((msgTimeObj - lastTimeObj) / (1000 * 60)) > 30) {
                    isNewSession = true;
                }
            }

            if (isNewSession) {
                sessions.push(currentSession);
                currentSession = [];
            }

            currentSession.push(msg);
            lastSessionId = msg.sessionId || null;
            lastTimeObj = new Date(`${msg.date} ${msg.time}`);
        });
        if (currentSession.length > 0) sessions.push(currentSession);

        const totalSessions = sessions.length;
        const container = document.getElementById('d3-graph-container');
        if (!container) return;
        
        container.innerHTML = ''; 
        document.getElementById('stats-summary').innerText = `${totalSessions} Sessions Logged`;

        if (totalSessions === 0) {
            container.innerHTML = '<p style="color:#9b9a9a; padding:20px; text-align:center; width:100%; margin-top:80px;">Complete a chat session to generate your graph.</p>';
            return;
        }

        const nodes = [];
        const links = [];
        const themeSet = new Set();

        const getSummaryWord = (messages) => {
            const userTexts = messages.filter(m => m.role === 'User').map(m => m.text);
            const combined = userTexts.join(" ").toLowerCase();
            const keywords = ["overwhelm", "worried", "anxious", "frustrated", "sad", "stressed", "burnout", "harsh", "deadline", "lost"];
            for (let word of keywords) if (combined.includes(word)) return word;
            return "vented"; 
        };

        sessions.forEach((sessionMsgs, index) => {
            const sessionId = `Session ${index + 1}`;
            const theme = getSummaryWord(sessionMsgs);
            themeSet.add(theme);

            nodes.push({ id: sessionId, group: 'session', date: sessionMsgs[0].date, theme: theme, messages: sessionMsgs });
            links.push({ source: sessionId, target: theme }); 
        });

        themeSet.forEach(theme => {
            nodes.push({ id: theme, group: 'theme' });
        });

        const relatedThemes = {
            "overwhelm": ["stressed", "anxious", "deadline", "burnout"],
            "stressed": ["overwhelm", "deadline", "burnout", "worried"],
            "anxious": ["overwhelm", "worried", "concerned"],
            "frustrated": ["harsh", "lost", "sad"],
            "sad": ["frustrated", "lost", "burnout"],
            "burnout": ["overwhelm", "stressed", "sad"],
            "lost": ["frustrated", "sad", "anxious"]
        };

        const themeArray = Array.from(themeSet);
        for (let i = 0; i < themeArray.length; i++) {
            for (let j = i + 1; j < themeArray.length; j++) {
                const t1 = themeArray[i];
                const t2 = themeArray[j];
                
                if ((relatedThemes[t1] && relatedThemes[t1].includes(t2)) || 
                    (relatedThemes[t2] && relatedThemes[t2].includes(t1))) {
                    links.push({ source: t1, target: t2, type: 'theme-link' }); 
                }
            }
        }

        const width = container.clientWidth;
        const height = container.clientHeight || 400;

        const svg = d3.select("#d3-graph-container")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const g = svg.append("g");
        
        const zoomBehavior = d3.zoom()
            .scaleExtent([0.3, 4]) 
            .on("zoom", (event) => g.attr("transform", event.transform));
            
        svg.call(zoomBehavior);

        d3.select("#zoom-in").on("click", () => {
            svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.3);
        });
        
        d3.select("#zoom-out").on("click", () => {
            svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.7);
        });

        d3.select("#zoom-reset").on("click", () => {
            svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity);
        });

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.type === 'theme-link' ? 250 : 100)) 
            .force("charge", d3.forceManyBody().strength(-400)) 
            .force("center", d3.forceCenter(width / 2, height / 2)); 

        const link = g.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", d => d.type === 'theme-link' ? "#a78bfa" : "#3b3c54")
            .attr("stroke-width", d => d.type === 'theme-link' ? 1.5 : 2)
            .attr("stroke-dasharray", d => d.type === 'theme-link' ? "6,6" : "none")
            .attr("stroke-opacity", d => d.type === 'theme-link' ? 0.4 : 0.6);

        const node = g.append("g")
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", d => d.group === 'theme' ? 24 : 14) 
            .attr("fill", d => d.group === 'theme' ? "#a78bfa" : "#1e1e2f")
            .attr("stroke", d => d.group === 'theme' ? "#fff" : "#a78bfa")
            .attr("stroke-width", 2)
            .attr("cursor", "pointer")
            .call(drag(simulation)); 

        const labels = g.append("g")
            .selectAll("text")
            .data(nodes)
            .join("text")
            .text(d => d.id)
            .attr("font-size", d => d.group === 'theme' ? "14px" : "11px")
            .attr("font-weight", d => d.group === 'theme' ? "bold" : "normal")
            .attr("fill", "#e5e7eb")
            .attr("text-anchor", "middle")
            .attr("dy", d => d.group === 'theme' ? 40 : 28);

        node.on("click", (event, d) => {
            if (d.group === 'session') {
                openSessionModule(d.id.replace('Session ', ''), d.date, d.theme, d.messages);
            }
        });

        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            node.attr("cx", d => d.x).attr("cy", d => d.y);
            labels.attr("x", d => d.x).attr("y", d => d.y);
        });

        function drag(simulation) {
            return d3.drag()
                .on("start", (event) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    event.subject.fx = event.subject.x;
                    event.subject.fy = event.subject.y;
                })
                .on("drag", (event) => {
                    event.subject.fx = event.x;
                    event.subject.fy = event.y;
                })
                .on("end", (event) => {
                    if (!event.active) simulation.alphaTarget(0);
                    event.subject.fx = null;
                    event.subject.fy = null;
                });
        }

        const themesHTML = Array.from(themeSet).slice(0, 5).map(theme => `<span class="theme-tabs">${theme}</span>`).join('');
        document.getElementById('theme-tags').innerHTML = themesHTML || '<span class="theme-tabs">N/A</span>';

    } catch (error) {
        console.error("Error drawing force graph:", error);
    }
}

function openSessionModule(id, date, label, messages) {
    document.getElementById('module-title').innerText = `Session ${id}`;
    document.getElementById('module-date').innerText = date;
    document.getElementById('module-theme').innerText = label;

    const userMsgs = messages.filter(m => m.role === 'User').map(m => m.text);
    let summaryText = "You checked in today but didn't share much. Taking the time to open the app is still a great first step toward building resilience!";

    if (userMsgs.length > 0) {
        const firstMsg = userMsgs[0];
        const longestMsg = userMsgs.reduce((a, b) => a.length > b.length ? a : b, "");
        const snippet = longestMsg.length > 90 ? longestMsg.substring(0, 90) + "..." : longestMsg;

        if (userMsgs.length === 1) {
            summaryText = `In this brief session, you reached out experiencing feelings of ${label}. You noted: "${firstMsg}"`;
        } else {
            summaryText = `You started this session dealing with feelings of ${label}. We spent time unpacking this friction, particularly focusing on when you mentioned: "${snippet}" By venting these thoughts, you took a highly positive step toward managing your stress today.`;
        }
    }

    document.getElementById('module-summary').innerText = summaryText;
    document.getElementById('session-module').style.display = 'flex';
}

function closeSessionModule() {
    document.getElementById('session-module').style.display = 'none';
}

// Moved CLEAR GRAPH DATA outside to prevent memory leaks
window.clearGraphData = function() {
    const isConfirmed = confirm("Are you sure you want to delete all your session history? This cannot be undone.");
    
    if (isConfirmed) {
        localStorage.removeItem('resilientCareHistory');
        
        const container = document.getElementById('d3-graph-container');
        if (container) {
            container.innerHTML = '<p style="color:#9b9a9a; padding:20px; text-align:center; width:100%; margin-top:80px;">Complete a chat session to generate your graph.</p>';
        }

        const statsSummary = document.getElementById('stats-summary');
        const themeTags = document.getElementById('theme-tags');
        
        if (statsSummary) statsSummary.innerText = "0 Sessions Logged";
        if (themeTags) themeTags.innerHTML = '<span class="theme-tabs">No data yet</span>';
        
        console.log("Graph and history cleared successfully.");
    }
};

// 6. HISTORY PAGE LOGIC
// ==========================================

function loadHistoryPage() {
    const feedContainer = document.getElementById('history-feed');
    if (!feedContainer) return;

    const history = JSON.parse(localStorage.getItem('resilientCareHistory')) || [];

    // Session ID to sync perfectly with new sessions
    const sessions = [];
    let currentSession = [];
    let lastSessionId = null;
    let lastTimeObj = null;

    history.forEach(msg => {
        if(!msg.date || !msg.time) return;

        let isNewSession = false;

        if (msg.sessionId) {
            if (lastSessionId && msg.sessionId !== lastSessionId) {
                isNewSession = true;
            }
        } else {
            // Fallback
            const msgTimeObj = new Date(`${msg.date} ${msg.time}`);
            if (lastTimeObj && ((msgTimeObj - lastTimeObj) / (1000 * 60)) > 30) {
                isNewSession = true;
            }
        }

        if (isNewSession) {
            sessions.push(currentSession);
            currentSession = [];
        }

        currentSession.push(msg);
        lastSessionId = msg.sessionId || null;
        lastTimeObj = new Date(`${msg.date} ${msg.time}`);
    });
    if (currentSession.length > 0) sessions.push(currentSession);

    if (sessions.length === 0) {
        feedContainer.innerHTML = '<p style="color:#9b9a9a; text-align:center; margin-top:50px;">No session history found. Start venting to see your records here!</p>';
        return;
    }

    sessions.reverse();
    feedContainer.innerHTML = '';

    sessions.forEach((sessionMsgs, index) => {
        const sessionNumber = sessions.length - index; 
        const date = sessionMsgs[0].date;
        const time = sessionMsgs[0].time;
        const totalMessages = sessionMsgs.length;

        const card = document.createElement('div');
        card.className = 'session-history-card';
        card.innerHTML = `
            <div class="history-card-left">
                <h4>Session ${sessionNumber}</h4>
                <p>📅 ${date} &nbsp;•&nbsp; ⏰ ${time} &nbsp;•&nbsp; 💬 ${totalMessages} messages</p>
            </div>
            <div class="history-card-right">Click to View Session Details</div>
        `;

        card.onclick = () => openCardInfo(`Session ${sessionNumber} - ${date}`, sessionMsgs);
        feedContainer.appendChild(card);
    });
}

function openCardInfo(title, messages) {
    document.getElementById('card-info-title').innerText = title;
    
    const body = document.getElementById('card-info-body');
    body.innerHTML = ''; // Clear old chat

    // Render the chat bubbles
    messages.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = msg.role === 'User' ? 'user-message-bubble' : 'ai-message-bubble';
        bubble.innerHTML = msg.text.replace(/\n/g, '<br>');
        body.appendChild(bubble);
    });

    document.getElementById('session-overlay').style.display = 'flex';
}

function hideSessionDetails() {
    document.getElementById('session-overlay').style.display = 'none';
}

function clearHistoryData() {
    const isConfirmed = confirm("Are you sure you want to delete all your session history? This cannot be undone.");
    if (isConfirmed) {
        localStorage.removeItem('resilientCareHistory');
        loadHistoryPage(); 
    }
}

// 7. SETTINGS PAGE LOGIC
// ==========================================

const themes = {
    dark: { label: "Dark", className: "theme-dark" },
    lightPink: { label: "Light Pink", className: "theme-light-pink" },
    lightBlue: { label: "Light Blue", className: "theme-light-blue" }
};

function setTheme(themeName) {
    localStorage.setItem('appTheme', themeName);
    updateThemeUI(themeName);
}

function updateThemeUI(activeTheme) {
    const themeOptions = document.querySelector('.theme-options');
    if (themeOptions) {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active-theme');
            const baseId = btn.id.replace('theme-', '');
            if (themes[baseId]) btn.innerText = themes[baseId].label;
        });

        const activeBtn = document.getElementById(`theme-${activeTheme}`);
        if (activeBtn) {
            activeBtn.classList.add('active-theme');
            activeBtn.innerText = themes[activeTheme].label + " ✓";
        }
    }
    
    document.body.className = ''; 
    if (themes[activeTheme] && activeTheme !== 'dark') {
        document.body.classList.add(themes[activeTheme].className);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem('appTheme') || 'dark';
    updateThemeUI(savedTheme);

});