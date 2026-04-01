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
# ✨ Features

-  **"Hold to Vent" Button:** A UI featuring a dynamic CSS-animated orb designed with three different color themes. These colors reduce *cognitive load* during high-stress moments.

-  **Absolute Privacy:** No backend database. No API calls to OpenAI/Anthropic. All chat history and insights are stored securely in local browser storage.

-  **Dynamic Theme Engine:** Fully integrated CSS architecture supporting multiple psychological color profiles *(Midnight Dark, Cocoa Cupcake Pink, Calming Blue)*.

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

# ⚙️ Engineering Trade-Offs & Decisions

- Why Transformers.js over a Cloud LLM API?
  
While connecting to the OpenAI API (GPT-4o) would have been faster to build and allowed for infinite generative responses, it was intentionally rejected due to:

- **Privacy:** Mental health data is highly sensitive. Processing it entirely ensures 100% data privacy for the user.

- **Safety Mechanisms:** LLMs can hallucinate. A *intent-classification + deterministic state-machine* guarantees clinically safe and conversational pathways.

- **Infrastructure Cost:** User's device via WebAssembly, the application scales with $0. This app if **FREE** to use!!

----------------------------------------------------------------------------------------------------------------------------------------

# 💻 Try it out for FREE!!

https://marlyn13-cloud.github.io/ResilientCare/

-----------------------------------------------------------------------------------------------------------------------------------------

Designed and engineered by Marlyn Grullon.

