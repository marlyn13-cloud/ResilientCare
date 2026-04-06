# ResilientCare.ai

### OVERVIEW
  
- A secure AI mental wellness companion powered by a machine learning model. ResilientCare is an AI Driven Mental Health Coach which specializes in day to day conflicts, helping the user handle your emotions in any MICRO situation. Students specifically often struggle with Daily Friction. Daily Friction is defined as conflicts that aren't classified as a mental crisis.

- ResilientCare is an intelligent, browser based therapist like agent designed specifically to help users *process academic stress, academic burnout, and academic anxiety.* Unlike traditional AI applications that send sensitive personal data to cloud APIs, ResilientCare runs 100% locally in the user's browser using **WebAssembly** and **Hugging Face models.**

- This project demonstrates a production ready implementation of Client-Side Machine Learning, prioritizing  user privacy, zero network latency, and zero server costs.

------------------------------------------------------------------------------------------------------------------------------------------

## 🚀 Technical Highlights & AI Architecture

To achieve a responsive and a conversational experience without compromising privacy, this application utilizes a hybrid architecture: *combining lightweight NLP models* for *state routing* with a state machine for clinical safety.

1. **In-Browser Inference Engine**
The core ML pipeline is built on Transformers.js, allowing NLP models to run directly in the browser via WebAssembly (WASM).

  1a. **Zero-Shot Classification:** Utilizes mobilebert-uncased-mnli to dynamically categorize user inputs into distinct conversational branches (e.g., Imposter Syndrome, Coursework Stress, General Anxiety).

  1b. **Sentiment & Emotion Analysis:** Fine-tuned distilbert-base-uncased-finetuned-sst-2-english model to assess the *emotional weight* of user input in real-time.

  1c. **Caching:** Models are quantized for the web, resulting in sub-30MB payloads that are cached locally on the user's device, which enables instant load times for all future sessions.

2. **Context Routing & Empathy State Machine** - 
Because pure LLM text-generation can hallucinate and is generally unsafe for mental health contexts, ResilientCare utilizes a *deterministic Conversational Routing Engine*:

  2a. **Resistance Detection:** The system  monitors user inputs for cognitive resistance *(e.g., short replies, "idk", "nothing")*. If resistance is detected, the AI automatically shifts from *"Direct Mode" (task-oriented)* to *"Empathetic Mode" (validating and grounding)*.

  2b. **Dynamic Response Layering:** Base conversational scripts are modified with an *EmotionLayer* based on the *DistilBERT sentiment score*, ensuring the tone matches the user's *distress level*.

3. **Data Visualization & Analytics Engine**-

  3a. **D3.js Graphs:** The Insights dashboard parses localStorage session data to build interactive network graphs of the user's emotional themes over time.

  3b. **Pattern Recognition:** Automatically clusters related conversational nodes *(e.g., linking "Overwhelm" nodes to "Deadline" nodes)* to help users identify their  triggers.

---------------------------------------------------------------------------------------------------------------------------------------

#  AI Architectural Workflow

## Architecture 1: The Privacy NLP Router
**Use Case:** Healthcare apps, secure journaling, mental wellness (e.g., ResilientCare).

**Core Objective:** Zero data exfiltration. Ensure sensitive text never leaves the user's device while maintaining strict clinical safety.

### The Pipeline Workflow
1. **Input Client:** User types a sensitive entry.
2. **Sensory Layer:**
   * **Model A (Intent):** A Zero-Shot classifier (e.g., MobileBERT via WebAssembly) categorizes the topic (e.g., "Anxiety", "Frustration").
   * **Model B (Sentiment):** A lightweight sequence classifier evaluates distress levels.
4. **Local State Machine (Execution Layer):** The app routes the user to a locally stored conversational tree for the detected intent and emotional state.
----------------------------------------------------------------------------------
### Sample AI Example: Burnout & Doubt
This scenario demonstrates how the  AI pipeline processes severe emotional exhaustion by prioritizing empathetic validation and cognitive recovery over task productivity. It also highlights the engine's built-in conversational fatigue detection.

**1. Initial Input & Inference**
> **User:** *"I'm completely burned out. I don't know why I'm even in this major."*
* **NLP Engine:** Evaluates the text and outputs `Distress: 85%` and `Intent: Burnout and Doubt`.

**2. State Machine Routing**
* **System Action:** The Empathetic Routing protocol activates. It validates the emotional weight of the statement before gently asking for a timeline.
  
> **AI:** *"I can tell this is really weighing on you right now. Burnout is its own kind of heavy — not just tired, but that specific hollowness where nothing feels like it matters. How long have you been running on empty?"*

> **User:** *"a while now"*

> **AI:** *"Yeah, a while now. That's completely valid. There's a difference between burning out on the workload and burning out on the actual field. Which feels closer to true?"*

> **User:** *"workload"*

> **AI:** *""workload" — that's incredibly real. When you imagine a full day off with zero guilt — no studying — what comes up? Relief, or does the anxiety about falling behind follow you?"*

> **User:** *"mostly relief"*

> **AI:** *"Yeah, mostly relief. That's completely valid. The doubt is real, but it's speaking through exhaustion. You don't have to figure out your whole future — just the next few hours.?"*

>**User:** *"alright sounds good"*

> **AI:** *"Yeah, alright sounds good. That's completely valid. Can you give yourself two hours today that belong only to you, with zero school attached? No planning, no studying, no "productive" anything?"*

>**User:** *"sure"*

>**AI:** *"Makes sense. Burnout is reversible. It doesn't mean you made the wrong choice — it means you've been pushing without recovering. Recovery is the work right now."*

--Session Complete--

## SAMPLE CRISIS PATTERN

> **User:** *"I feel sad. What are some steps to cope?"*

>**AI:** *"Before we dive in — I've noticed you've been carrying a lot across our last few sessions. That takes real strength to keep showing up. What's on your mind today?"*

>**User:** *"i just dont want to be here anymore"*

>**AI:** *"I need to pause here because what you shared sounds serious, and your safety matters more than anything else right now.

> Please reach out to someone who can truly help:

> • Crisis Text Line: Text HOME to 741741

> • 988 Suicide & Crisis Lifeline: Call or text 988

> • SAMHSA Helpline: 1-800-662-4357

> You don't have to carry this alone. "*

----------------------------------------------------------------------------------------------------------------------------------------

# ✨ Features

-  **"Hold to Vent" Button:** A UI featuring a dynamic CSS-animated orb designed with three different color themes. These colors reduce *cognitive load* during high-stress moments.

-  **Absolute Privacy:** No backend database. No API calls to OpenAI/Anthropic. All chat history and insights are stored securely in local browser storage.

-  **(SETTINGS) Theme Engine:** Fully integrated CSS architecture supporting multiple psychological color profiles *(Dark, Cocoa Cupcake Pink, Calming Blue)*.

-  **Interactive Insights:** Real-time streak tracking, session counting, and mapping of user entries.

------------------------------------------------------------------------------------------------------------------------------------------ 

# 🛠️ Technology Stack

**Frontend / UI:**

- HTML, CSS , JavaScript 

- D3.js (Data Visualization/Graph Generation)

**Machine Learning / AI:**

- Transformers.js

- WebAssembly (WASM)

- Hugging Face Models (mobilebert, distilbert)

-------------------------------------------------------------------------------------------------------------------------------------------

# ⚙️ Engineering Decisions

- Why Transformers.js over a Cloud LLM API?
  
While connecting to the OpenAI API (GPT-4o) would have been faster to build and allowed for infinite generative responses, it was intentionally rejected due to:

- **Privacy:** Mental health data is highly sensitive. Processing it entirely ensures 100% data privacy for the user.

- **Safety Mechanisms:** LLMs can hallucinate. A *intent-classification + deterministic state-machine* guarantees clinically safe and conversational pathways.

- **Infrastructure Cost:** User's device via WebAssembly, the application scales with $0. This app if **FREE** to use!!

----------------------------------------------------------------------------------------------------------------------------------------

## 🧠 What I Learned

Building ResilientCare pushed me to grow as an AI Engineer. A few of my takeaways include:

* **Edge AI & WebAssembly:** I learned how to move machine learning inference out of the cloud and directly into the browser. Working with `Transformers.js` taught me how to manage model quantization, caching, and browser memory constraints.

* **Designing for Human-Computer Interaction (HCI):** I learned that in mental health applications, UI *is* UX. Building the "Hold to Vent" orb and the dynamic Nocturnal  theme taught me how color theory, CSS animations, and simplified navigation directly impact user cognitive load.
  
* **Deterministic AI Safety:** I realized that raw LLM text generation isn't always the right tool. Building the resistance protocol taught me how to combine deterministic state-machine logic with AI sentiment analysis to create a safer and a better user experience.
  
* **JavaScript State Management:** Instead of relying on heavy frameworks like React, I strengthened my core DOM manipulation skills with JavaScript. I learned how to  pass state (like the active theme or the user's emotional data) across multiple HTML pages using `localStorage` and dynamic CSS variables.

---------------------------------------------------------------------------------------

# 💻 Try it out for FREE!!

https://marlyn13-cloud.github.io/ResilientCare/

-----------------------------------------------------------------------------------------------------------------------------------------

Designed and engineered by Marlyn Grullon.

