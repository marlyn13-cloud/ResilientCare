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
        let isComplete = false; // Tracks whether we've completed a session. 

        // 3. GENERATE RESPONSE BASED ON STATE
        if (this.state.currentIntent && this.intentDatabase[this.state.currentIntent]) {
            const handler = this.intentDatabase[this.state.currentIntent].handler;
            
            responseText = handler(this.getContext(), this.state.step, userInput); 
            
            finalMode = this.intentDatabase[this.state.currentIntent].autoMode;

            if (this.state.step === 0) {
                responseText = this.applyEmotionLayer(responseText, emotion);
            }

            if (this.state.step >= 2) {
                this.state.currentIntent = null;
                this.state.step = 0;
                isComplete = true; //Confirms the end of a session
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
            detectedMode: finalMode,
            isComplete: isComplete
        };
    }
}

const AI = new ResilientCareEngine();

//END OF AI LOGIC

// 3. UI, NAVIGATION, VENT BOX
// ==========================================

window.sendChip = function(text) {
    // 1. REVEAL THE TEXT BOX
    const inputArea = document.getElementById('chat-input-area');
    if (inputArea) {
        inputArea.style.display = 'flex'; 
    }

    // 2. DROP THE TEXT IN THE TEXT BOX
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
// END OF VENT BOX FUNCTIONS

//HOME SCREEN FUNCTIONS
    // 1. Setup Date on Home Screen
    const dateEl = document.getElementById('current-date');
    if(dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.innerText = new Date().toLocaleDateString('en-US', options);
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
    };
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
            
            // If the AI says the session is complete then it shows more options
            if (aiResponse.isComplete) {
                setTimeout(() => {
                    displayEndSessionUI();
                }, 1000); // Slight delay so it feels like a natural transition
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
        const history = JSON.parse(localStorage.getItem('resilientCareHistory')) || [];

        // 1. Group messages into sessions
        const sessions = [];
        let currentSession = [];
        let lastTimeObj = null;

        history.forEach(msg => {
            if(!msg.date || !msg.time) return;
            const msgTimeObj = new Date(`${msg.date} ${msg.time}`);
            
            if (lastTimeObj && ((msgTimeObj - lastTimeObj) / (1000 * 60)) > 1) {
                sessions.push(currentSession);
                currentSession = [];
            }
            currentSession.push(msg);
            lastTimeObj = msgTimeObj;
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
        //CLEAR GRAPH DATA 
    window.clearGraphData = function() {
    // 1. Ask the user to confirm deletion
    const isConfirmed = confirm("Are you sure you want to delete all your session history? This cannot be undone.");
    
    if (isConfirmed) {
        // 2. Wipes the local memory
        localStorage.removeItem('resilientCareHistory');
        
        // 3. Clears the Graph 
        const container = document.getElementById('d3-graph-container');
        if (container) {
            container.innerHTML = '<p style="color:#9b9a9a; padding:20px; text-align:center; width:100%; margin-top:80px;">Complete a chat session to generate your graph.</p>';
        }

        // 4. Reset the Bottom Stats
        const statsSummary = document.getElementById('stats-summary');
        const themeTags = document.getElementById('theme-tags');
        
        if (statsSummary) statsSummary.innerText = "0 Sessions Logged";
        if (themeTags) themeTags.innerHTML = '<span class="theme-tabs">No data yet</span>';
        
        console.log("Graph and history cleared successfully.");
    }
};
        // 2. Prepares Data for the D3 Graph Engine
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

        // Creates Session Nodes & Links
        sessions.forEach((sessionMsgs, index) => {
            const sessionId = `Session ${index + 1}`;
            const theme = getSummaryWord(sessionMsgs);
            themeSet.add(theme);

            nodes.push({ id: sessionId, group: 'session', date: sessionMsgs[0].date, theme: theme, messages: sessionMsgs });
            links.push({ source: sessionId, target: theme }); // Links the session to its theme
        });

        // Creates Theme Nodes
        themeSet.forEach(theme => {
            nodes.push({ id: theme, group: 'theme' });
        });

        //THEME CONNECTIONS
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
                    links.push({ source: t1, target: t2, type: 'theme-link' }); // Creates the dashed-line
                }
            }
        }

        // 3. Setup the D3 Canvas with Zoom & Pan
        // ------------------------------------
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

        // 4. Creates the graph
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.type === 'theme-link' ? 250 : 100)) 
            .force("charge", d3.forceManyBody().strength(-400)) 
            .force("center", d3.forceCenter(width / 2, height / 2)); 

        // 5. Draw the Connecting Lines
        const link = g.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            //theme links as dashed purple lines, and session links as solid gray lines
            .attr("stroke", d => d.type === 'theme-link' ? "#a78bfa" : "#3b3c54")
            .attr("stroke-width", d => d.type === 'theme-link' ? 1.5 : 2)
            .attr("stroke-dasharray", d => d.type === 'theme-link' ? "6,6" : "none")
            .attr("stroke-opacity", d => d.type === 'theme-link' ? 0.4 : 0.6);

        // 6. Draws the Nodes
        const node = g.append("g")
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", d => d.group === 'theme' ? 24 : 14) // Makes themes larger than sessions
            .attr("fill", d => d.group === 'theme' ? "#a78bfa" : "#1e1e2f")
            .attr("stroke", d => d.group === 'theme' ? "#fff" : "#a78bfa")
            .attr("stroke-width", 2)
            .attr("cursor", "pointer")
            .call(drag(simulation)); // Enables dragging individual nodes

        // 7. Add Text Labels
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

        // 8. Handle Clicks
        node.on("click", (event, d) => {
            if (d.group === 'session') {
                openSessionModule(d.id.replace('Session ', ''), d.date, d.theme, d.messages);
            }
        });

        // 9. Updates positions on every frame
        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            node.attr("cx", d => d.x).attr("cy", d => d.y);
            labels.attr("x", d => d.x).attr("y", d => d.y);
        });

        // 10. Dragging Logic
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

        // bottom theme tags
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

    //THE AI SUMMARIZER
    
    // 1. Filter to only look at what the user typed
    const userMsgs = messages.filter(m => m.role === 'User').map(m => m.text);
    let summaryText = "You checked in today but didn't share much. Taking the time to open the app is still a great first step toward building resilience!";

    if (userMsgs.length > 0) {
        const firstMsg = userMsgs[0];
        
        // Holds the longest message the user sent
        const longestMsg = userMsgs.reduce((a, b) => a.length > b.length ? a : b, "");
        
        // Clean up the string so it doesn't break the paragraph visually
        const snippet = longestMsg.length > 90 ? longestMsg.substring(0, 90) + "..." : longestMsg;

        if (userMsgs.length === 1) {
            summaryText = `In this brief session, you reached out experiencing feelings of ${label}. You noted: "${firstMsg}"`;
        } else {
            summaryText = `You started this session dealing with feelings of ${label}. We spent time unpacking this friction, particularly focusing on when you mentioned: "${snippet}" By venting these thoughts, you took a highly positive step toward managing your stress today.`;
        }
    }

    //generated summary
    document.getElementById('module-summary').innerText = summaryText;

    //display summary
    document.getElementById('session-module').style.display = 'flex';
}

function closeSessionModule() {
    document.getElementById('session-module').style.display = 'none';
}
//END OF INSIGHTS PAGE
//====================

// ==========================================
// 6. HISTORY PAGE LOGIC
// ==========================================

function loadHistoryPage() {
    const feedContainer = document.getElementById('history-feed');
    if (!feedContainer) return;

    const history = JSON.parse(localStorage.getItem('resilientCareHistory')) || [];

    // 1. Group messages into sessions
    const sessions = [];
    let currentSession = [];
    let lastTimeObj = null;

    history.forEach(msg => {
        if(!msg.date || !msg.time) return;
        const msgTimeObj = new Date(`${msg.date} ${msg.time}`);
        
        if (lastTimeObj && ((msgTimeObj - lastTimeObj) / (1000 * 60)) > 1) {
            sessions.push(currentSession);
            currentSession = [];
        }
        currentSession.push(msg);
        lastTimeObj = msgTimeObj;
    });
    if (currentSession.length > 0) sessions.push(currentSession);

    // 2. Handle Empty State
    if (sessions.length === 0) {
        feedContainer.innerHTML = '<p style="color:#9b9a9a; text-align:center; margin-top:50px;">No session history found. Start venting to see your records here!</p>';
        return;
    }

    // 3. Reverse the array so NEWEST sessions are at the top
    sessions.reverse();
    feedContainer.innerHTML = '';

    // 4. Generate the HTML Cards
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

        // Pass data to module
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

    document.getElementById('session-module-overlay').style.display = 'flex';
}

function hideSessionDetails() {
    document.getElementById('session-module-overlay').style.display = 'none';
}

function clearHistoryData() {
    const isConfirmed = confirm("Are you sure you want to delete all your session history? This cannot be undone.");
    if (isConfirmed) {
        localStorage.removeItem('resilientCareHistory');
        loadHistoryPage(); // Instantly reloads the page to show the "No history" message
    }
}
// ==========================================
// 7. SETTINGS PAGE LOGIC
// ==========================================

const themes = {
    blue: { color: "#60a5fa", label: "BLUE" },
    pink: { color: "#f472b6", label: "Pink" },
    green: { color: "#34d399", label: "Green" },
    purple: { color: "#a78bfa", label: "Purple" }
};

function loadSettings() {
    // 1. Load Notifications State
    const reminderToggle = document.getElementById('daily-reminder-toggle');
    if (reminderToggle) {
        const isEnabled = localStorage.getItem('dailyReminder') === 'true';
        reminderToggle.checked = isEnabled;
    }

    // 2. Load Theme State
    const currentTheme = localStorage.getItem('appTheme') || 'pink';
    updateThemeUI(currentTheme);
}

function toggleReminder() {
    const toggle = document.getElementById('daily-reminder-toggle');
    localStorage.setItem('dailyReminder', toggle.checked);
}

function setTheme(themeName) {
    localStorage.setItem('appTheme', themeName);
    updateThemeUI(themeName);
}

function updateThemeUI(activeTheme) {
    // Reset all buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active-theme');
        const baseId = btn.id.replace('theme-', '');
        if (themes[baseId]) btn.innerText = themes[baseId].label;
    });

    // Highlight the selected button and add the checkmark
    const activeBtn = document.getElementById(`theme-${activeTheme}`);
    if (activeBtn) {
        activeBtn.classList.add('active-theme');
        activeBtn.innerText = themes[activeTheme].label + " ✓";
    }
    
    //new color into the CSS root variables!
    if (themes[activeTheme]) {
        document.documentElement.style.setProperty('--primary-accent', themes[activeTheme].color);
    }
}

// settings load automatically when the page is opened
document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById('daily-reminder-toggle')) {
        loadSettings();
    }
});