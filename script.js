// ============================================================
// ResilientCare — Brain v3.0  (Zero API · 100% Local Models + RAG)
// ============================================================

// ─────────────────────────────────────────────────────────────
// SECTION 1: CRISIS SAFETY GATE
// ─────────────────────────────────────────────────────────────

const CRISIS_PATTERNS = [
    /kill\s*(my)?self/i, /want\s*to\s*die/i, /end\s*my\s*life/i,
    /\bsuicid/i, /self[\s-]?harm/i, /hurt\s*myself/i,
    /no\s*reason\s*to\s*live/i, /wish\s*(i\s*was|i\s*were)\s*dead/i,
    /can'?t\s*go\s*on\s*(anymore|like this)/i,
    /don'?t\s*want\s*to\s*(be here|exist)/i,
];

function isCrisis(text) {
    return CRISIS_PATTERNS.some(p => p.test(text));
}

const CRISIS_RESPONSE = {
    text: "I need to pause here because what you shared sounds serious, and your safety matters more than anything else right now.\n\nPlease reach out to someone who can truly help:\n• Crisis Text Line: Text HOME to 741741\n• 988 Suicide & Crisis Lifeline: Call or text 988\n• SAMHSA Helpline: 1-800-662-4357\n\nYou don't have to carry this alone.",
    detectedMode: "Empathetic",
    detectedIntent: "crisis",
    emotionalTone: "distressed",
    isComplete: true,
    suggestedChips: [],
};

// ─────────────────────────────────────────────────────────────
// SECTION 2: MODEL LOADER
// ─────────────────────────────────────────────────────────────

let _embedder   = null;
let _classifier = null;
let _sentiment  = null;
let _seedEmbeddings = {};
let _modelsReady = false;

const INTENT_LABELS = {
    coursework_stress:  "student overwhelmed by too many assignments, coursework piling up, too much work due at once",
    burnout_doubt:      "student completely burned out, exhausted, questioning their major or whether college is worth it",
    harsh_grading:      "student received a bad grade, harsh feedback, unfair grading, feeling crushed by a poor score",
    confusing_material: "student confused by course material, doesn't understand the assignment or subject, feels lost academically",
    imposter_syndrome:  "student feels like everyone else understands but them, feels behind peers, feels like they don't belong",
    deadline_panic:     "student panicking about approaching deadlines, multiple things due soon, feeling out of time",
    exam_anxiety:       "student anxious about an upcoming exam, worried about failing a test, dreading a midterm or final",
    procrastination:    "student can't start their work, avoiding tasks, stuck in procrastination, can't bring themselves to begin",
    focus_struggles:    "student can't concentrate, mind keeps wandering, struggling to stay focused while studying",
    peer_comparison:    "student comparing themselves negatively to classmates, feeling behind others socially or academically",
    frustration:        "student feeling frustrated, annoyed, or irritated about something academic",
    sadness:            "student feeling sad, low, down, or emotionally heavy",
    anxiety:            "student feeling generally anxious, overwhelmed emotionally, or in a state of worry",
    missed_deadline:    "student missed an exam, missed a deadline, forgot to submit something, needs damage control",
    general_venting:    "student needs to vent or talk, not sure what is wrong, general stress without a specific issue",
};

const INTENT_SEEDS = {
    coursework_stress:  ["so much work due","assignments piling up","overwhelmed by coursework","can't keep up with everything","too many things to submit"],
    burnout_doubt:      ["completely burned out","no motivation left","questioning my major","don't know why I'm in school","exhausted and disconnected"],
    harsh_grading:      ["got a terrible grade","professor graded unfairly","bad feedback on my assignment","crushed by my score","failed and feel awful"],
    confusing_material: ["I don't understand anything","lost on this assignment","the material makes no sense","have no idea where to start","completely confused"],
    imposter_syndrome:  ["everyone else gets it but me","I feel like I don't belong here","everyone seems smarter than me","I'm falling behind everyone"],
    deadline_panic:     ["everything is due soon","three deadlines this week","I have no time left","running out of time for assignments"],
    exam_anxiety:       ["terrified about my exam","can't stop worrying about my test","dreading this midterm","anxiety before exam"],
    procrastination:    ["can't bring myself to start","I keep avoiding my work","stuck and not doing anything","won't let myself begin"],
    focus_struggles:    ["I can't concentrate at all","my mind keeps wandering","I can't focus on studying","distracted from my work"],
    peer_comparison:    ["everyone else is doing better","my classmates have it together","I feel behind all my peers"],
    frustration:        ["so frustrated with everything","this is so annoying","I'm fed up with school","everything is making me angry"],
    sadness:            ["feeling really sad","I'm in a low mood","just feel heavy and down","sad for no reason"],
    anxiety:            ["feeling so anxious","I'm overwhelmed with worry","anxiety is through the roof","can't calm my nerves"],
    missed_deadline:    ["I missed my exam","I forgot to submit","I skipped class and missed something important","missed a deadline"],
    general_venting:    ["I just need to vent","everything feels like too much","I don't even know what's wrong","just having a hard time"],
};

async function loadModels() {
    if (!window.transformers) {
        console.warn("Transformers.js not loaded.");
        return;
    }
    const { pipeline, env } = window.transformers;
    env.allowLocalModels = false;

    const setStatus = (msg) => {
        const el = document.getElementById("save-indicator");
        if (el) el.innerText = msg;
    };

    setStatus("Loading sentiment model…");
    _sentiment  = await pipeline("sentiment-analysis", "Xenova/distilbert-base-uncased-finetuned-sst-2-english");

    setStatus("Loading intent model…");
    _classifier = await pipeline("zero-shot-classification", "Xenova/mobilebert-uncased-mnli");

    setStatus("Loading embedding model…");
    _embedder   = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { pooling: "mean", normalize: true });

    setStatus("Building intent index…");
    await _buildSeedEmbeddings();

    setStatus("Loading knowledge base…");
    await buildRAGEmbeddings();

    _modelsReady = true;
    console.log("ResilientCare v3: all models ready.");
    setStatus("AI Ready ✓");
    setTimeout(() => setStatus("Auto-saved ✓"), 2000);
}

async function _buildSeedEmbeddings() {
    for (const [intent, seeds] of Object.entries(INTENT_SEEDS)) {
        const vecs = await Promise.all(seeds.map(s => _embed(s)));
        _seedEmbeddings[intent] = _meanVec(vecs);
    }
}

loadModels();

// ─────────────────────────────────────────────────────────────
// SECTION 3: VECTOR MATH
// ─────────────────────────────────────────────────────────────

async function _embed(text) {
    const out = await _embedder(text);
    return Array.from(out.data);
}

function _dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
}

function _norm(a) { return Math.sqrt(_dot(a, a)); }

function _cosine(a, b) {
    const d = _norm(a) * _norm(b);
    return d === 0 ? 0 : _dot(a, b) / d;
}

function _meanVec(vecs) {
    const len = vecs[0].length;
    const out = new Array(len).fill(0);
    for (const v of vecs) for (let i = 0; i < len; i++) out[i] += v[i];
    return out.map(x => x / vecs.length);
}

// ─────────────────────────────────────────────────────────────
// SECTION 4: INTENT DETECTION ENGINE
// ─────────────────────────────────────────────────────────────

async function detectIntent(text) {
    const intents = Object.keys(INTENT_LABELS);

    let zsScores = {};
    if (_classifier) {
        const zs = await _classifier(text, Object.values(INTENT_LABELS));
        zs.labels.forEach((label, i) => {
            const key = intents.find(k => INTENT_LABELS[k] === label) || "general_venting";
            zsScores[key] = zs.scores[i];
        });
    }

    let cosScores = {};
    if (_embedder && Object.keys(_seedEmbeddings).length > 0) {
        const inputVec = await _embed(text);
        for (const [intent, seedVec] of Object.entries(_seedEmbeddings)) {
            cosScores[intent] = Math.max(0, _cosine(inputVec, seedVec));
        }
    }

    const fusedScores = {};
    const hasEmbedder = _embedder && Object.keys(_seedEmbeddings).length > 0;
    for (const intent of intents) {
        const zs  = zsScores[intent]  ?? (1 / intents.length);
        const cos = cosScores[intent] ?? 0;
        fusedScores[intent] = hasEmbedder ? (0.6 * zs + 0.4 * cos) : zs;
    }

    const top = Object.entries(fusedScores).sort((a, b) => b[1] - a[1])[0];
    return { intent: top[0], confidence: top[1], allScores: fusedScores };
}

// ─────────────────────────────────────────────────────────────
// SECTION 5: EMOTION LAYER
// ─────────────────────────────────────────────────────────────

async function detectEmotion(text) {
    if (!_sentiment) return "neutral";
    const result = await _sentiment(text);
    if (!result || !result[0]) return "neutral";
    const { label, score } = result[0];
    if (label === "NEGATIVE" && score > 0.92) return "distressed";
    if (label === "NEGATIVE" && score > 0.75) return "anxious";
    if (label === "NEGATIVE") return "frustrated";
    return "neutral";
}

const EMPATHY_PREFIXES = {
    distressed: ["I can tell this is really weighing on you right now. ","That sounds incredibly hard to carry. ","I hear how much this is affecting you. "],
    anxious:    ["That kind of pressure can feel so suffocating. ","It makes total sense that you're feeling anxious about this. ","Your nervous system is clearly in overdrive right now. "],
    frustrated: ["That frustration is completely valid. ","Ugh, that kind of friction is genuinely exhausting. ","I'd be frustrated too — this is a lot. "],
};

function applyEmotionLayer(text, emotion, turn) {
    if (turn > 0) return text;
    const prefixes = EMPATHY_PREFIXES[emotion];
    if (!prefixes) return text;
    return prefixes[Math.floor(Math.random() * prefixes.length)] + text;
}

// ─────────────────────────────────────────────────────────────
// SECTION 6: ENTITY EXTRACTOR
// ─────────────────────────────────────────────────────────────

function extractEntities(history) {
    const fullText = history.map(m => m.text).join(" ");
    const e = { subject: null, task: null, deadline: null, grade: null, professor: null };

    const courseCode = fullText.match(/\b([A-Z]{2,5}\s?\d{3}[A-Z]?)\b/i);
    if (courseCode) e.subject = courseCode[1];

    if (!e.subject) {
        const sub = fullText.match(/\b(organic chemistry|biology|calculus|statistics|physics|history|economics|psychology|computer science|english|philosophy|accounting|anatomy|algebra|programming|data structures|algorithms|machine learning|sociology)\b/i);
        if (sub) e.subject = sub[1];
    }

    const task = fullText.match(/\b(essay|paper|project|midterm|final|exam|quiz|lab report|presentation|thesis|assignment|homework|problem set|coding assignment)\b/i);
    if (task) e.task = task[1];

    const deadline = fullText.match(/\b(tomorrow|tonight|midnight|this week|friday|monday|tuesday|wednesday|thursday|saturday|sunday|in \d+ (hours?|days?)|next week)\b/i);
    if (deadline) e.deadline = deadline[1];

    const grade = fullText.match(/\b(\d{1,3}%|[A-F][+-]?)\b/);
    if (grade) e.grade = grade[1];

    const prof = fullText.match(/\b(professor|prof\.?|dr\.?)\s+([A-Z][a-z]+)/i);
    if (prof) e.professor = prof[0];

    return e;
}

// ─────────────────────────────────────────────────────────────
// SECTION 7: RESPONSE POOLS
// ─────────────────────────────────────────────────────────────

const RESPONSE_POOLS = {
    coursework_stress: {
        opener: [
            e => `That feeling when everything is due at once and your brain just locks up is real. ${e.task ? `What's the ${e.task} situation specifically?` : "Which class has you the most worried right now?"}`,
            e => `${e.subject ? `${e.subject} piling up on top of everything else` : "Having that much coursework stacked up"} is genuinely a lot. Walk me through what's actually due — even a rough list helps.`,
            e => `Assignment overload feels bigger in your head than on paper, but it's still real. What's due absolutely first?`,
        ],
        explore: [
            e => `Okay, so ${e.task ? `the ${e.task}` : "that assignment"} is the pressure point. What part is tripping you up — getting started, the middle, or just finding the time?`,
            e => `When you picture sitting down to work on it, what happens in your head? Does it feel impossible to start, or do you start and then stall?`,
            e => `Is the stress about the volume of work, or more about one specific thing that feels overwhelming?`,
        ],
        bridge: [
            e => `You don't have to finish ${e.task ? `the ${e.task}` : "all of it"} today. You just have to make it smaller. What's the absolute tiniest version of starting?`,
            e => `The brain can't handle "I need to do everything." It can only handle one sentence, one section, one function. What's the one small unit you could produce in the next 20 minutes?`,
            e => `Most of the pain is coming from thinking about the work, not the work itself. What's one thing you could close a loop on today — even partially?`,
        ],
        action: [
            e => `Set a 20-minute timer and open ${e.task ? `the ${e.task} document` : "just one assignment"}. You're not writing — you're just looking at it. That's the whole goal.`,
            e => `Write three bullet points about what you already know about ${e.task ? `the ${e.task}` : "the assignment"}. Three bullets. Nothing more.`,
            e => `Close every tab except the one assignment. Set a 15-minute sprint. After the timer, you're allowed to stop — but you have to start.`,
        ],
        closure: [
            e => `You named the overwhelm instead of letting it sit. The next time the pile-up hits, start with that same move: list it, then shrink it.`,
            e => `Overload doesn't mean failure. It means your plate got too full. Keep breaking things into 20-minute chunks and you'll be surprised what you can move through.`,
        ],
    },
    burnout_doubt: {
        opener: [
            e => `Burnout is its own kind of heavy — not just tired, but that specific hollowness where nothing feels like it matters. How long have you been running on empty?`,
            e => `Questioning your major when you're burned out is so common — but it's worth separating "I hate this subject" from "I need to rest." When did you last feel any spark for your studies?`,
            e => `That exhausted, disconnected feeling where even small tasks feel massive. Is this something that crept up gradually or did something specific tip it?`,
        ],
        explore: [
            e => `When you imagine a full day off with zero guilt — no studying — what comes up? Relief, or does the anxiety about falling behind follow you?`,
            e => `There's a difference between burning out on the workload and burning out on the actual field. Which feels closer to true?`,
            e => `What used to feel interesting about ${e.subject ? e.subject : "your major"}, even a little, before this kicked in?`,
        ],
        bridge: [
            e => `Burnout distorts everything. It makes you think you hate things you actually just need a break from. Before drawing any conclusions, your brain needs a real reset.`,
            e => `Right now your brain is running on fumes and making permanent-sounding decisions from a temporary state. You don't have to solve the major question today.`,
            e => `The doubt is real, but it's speaking through exhaustion. You don't have to figure out your whole future — just the next few hours.`,
        ],
        action: [
            e => `Can you give yourself two hours today that belong only to you, with zero school attached? No planning, no studying, no "productive" anything?`,
            e => `Go outside for 15 minutes, no podcast or music. Just walk. Your brain needs decompression, not more input.`,
            e => `Write one sentence about something outside of school that used to make you feel like yourself. Just one sentence. That's your anchor for today.`,
        ],
        closure: [
            e => `Burnout is reversible. It doesn't mean you made the wrong choice — it means you've been pushing without recovering. Recovery is the work right now.`,
            e => `The fact that you're questioning things shows you care. That fire isn't gone, it's just smothered. Give it air before making any big calls.`,
        ],
    },
    harsh_grading: {
        opener: [
            e => `${e.grade ? `A ${e.grade}` : "A grade like that"} stings in a really specific way, especially if you worked hard on it. Was this a surprise, or did you have a feeling it might go this way?`,
            e => `Getting crushed on ${e.task ? `a ${e.task}` : "an assignment"} is such a deflating experience. What part of it is hitting you the hardest right now?`,
            e => `That gut-drop feeling when you see a bad score is rough. Were you feeling okay about it when you submitted it, or were you already nervous?`,
        ],
        explore: [
            e => `Let's look at the actual ${e.task ? e.task : "work"} for a second. If you had to guess where things went off track, what would it be?`,
            e => `Sometimes a bad score happens because the material was genuinely confusing, and sometimes it's just about how much time you had. Which one feels more true here?`,
            e => `When you look back at how you prepared for this, is there anything that stands out to you now?`,
        ],
        bridge: [
            e => `One grade is just a single data point, not your whole academic identity. The most useful thing right now is figuring out the one concrete thing to adjust for next time.`,
            e => `Bad grades are recoverable, especially if you can isolate what exactly went wrong. You're allowed to be frustrated today, but tomorrow we look at the "why."`,
            e => `It's easy to spiral and think this ruins everything. It doesn't. We just need to figure out the gap between what was expected and what happened.`,
        ],
        action: [
            e => `Tonight, close the portal and stop looking at the grade. Tomorrow, try to find the one specific area that cost you the most points. Just find it.`,
            e => `For your next ${e.task ? e.task : "assignment"}, add one quick checklist item based on what went wrong here. One line. That's how you use this.`,
            e => `If you are completely in the dark about why the score is what it is, a quick email to ${e.professor ? e.professor : "the professor"} asking for clarification is your best move.`,
        ],
        closure: [
            e => `You showed up, you submitted, and you're facing the disappointment instead of ignoring it. That's what students who grow do.`,
            e => `One bad score changes nothing about your overall trajectory if you use it as information. You've got this.`,
        ],
    },
    confusing_material: {
        opener: [
            e => `There's a specific kind of panic when the material won't click and you can't even figure out what you don't understand. ${e.subject ? `What part of ${e.subject} has you stuck?` : "What are you looking at that makes no sense?"}`,
            e => `Being lost on ${e.task ? `a ${e.task}` : "an assignment"} is frustrating, but it's almost never "I'm not smart enough" — it's usually one missing piece. Where exactly does your understanding break down?`,
            e => `${e.subject ? e.subject : "Material like this"} can genuinely be hard to parse. Are you frozen at the start, or did you hit a wall somewhere in the middle?`,
        ],
        explore: [
            e => `When you read the ${e.task ? e.task : "prompt or material"}, at what specific sentence or concept does your brain go "wait, what?"`,
            e => `Is there anything in ${e.subject ? e.subject : "this topic"} that you do feel solid on, even a small piece? The path forward often starts from what you already know.`,
            e => `Have you tried explaining what you think it's asking back to yourself out loud? Sometimes that alone reveals where the gap is.`,
        ],
        bridge: [
            e => `Confusion almost always means one foundational piece is missing underneath. You're not lost — you're just missing the step before this step. What's the last concept you felt okay about?`,
            e => `You don't need to understand all of ${e.subject ? e.subject : "it"} right now. You need the one piece that unlocks this problem. Let's find that piece.`,
            e => `Forget the assignment for a second. Google just the one term you keep hitting and can't get past. Just one definition. That's often all it takes.`,
        ],
        action: [
            e => `Pick the one concept in ${e.subject ? e.subject : "this material"} you feel least clear on. Search for it with "explained simply" after it. Read one explanation. Just one.`,
            e => `Reread the ${e.task ? e.task : "assignment"} and underline every word you don't fully understand. That becomes your real list. Tackle it one item at a time.`,
            e => `Try explaining to yourself — out loud — what you think the question is asking you to do. Even if you're wrong, it'll surface exactly where the gap is.`,
        ],
        closure: [
            e => `Being confused doesn't mean you don't belong in this class. It means you're working at the edge of your current understanding — which is exactly where learning happens.`,
            e => `You broke it down instead of staring at it frozen. That's the skill. Next time, go straight to "what's the one thing I don't understand" and start there.`,
        ],
    },
    imposter_syndrome: {
        opener: [
            e => `That feeling — where everyone around you seems to have a map and you're wandering — is one of the most isolating things about being a student. What's making it feel especially sharp today?`,
            e => `Imposter syndrome shows you everyone's highlight reel and compares it to your backstage. What specifically made you feel like you don't belong today?`,
            e => `The "I'm the only one who doesn't get it" feeling is something so many students carry quietly. What triggered it for you right now?`,
        ],
        explore: [
            e => `Is this tied to a specific person you're comparing yourself to, or is it more of a general fog of inadequacy?`,
            e => `When you imagine what your classmates' internal experience is actually like — not what they perform — what do you think they're feeling?`,
            e => `What's the evidence your brain is using to decide you don't belong here? Let's look at it directly.`,
        ],
        bridge: [
            e => `Here's something real: people who feel most like frauds are usually the most conscientious ones. The people who genuinely don't belong rarely question whether they belong.`,
            e => `Nobody got into ${e.subject ? e.subject : "this program"} by accident. The doubts are loud, but they're not facts. What's one thing you've actually done well recently?`,
            e => `Comparison steals from yourself. The version of your classmate you're comparing to is a projection. What would it feel like to measure yourself against yesterday's you instead?`,
        ],
        action: [
            e => `Write down two things you've figured out this semester — anything, even if they feel small. Read them back. That's your reality, not the comparison.`,
            e => `Next time you're in class and feel lost, try saying "can you clarify that?" — you'll find half the room had the same question. Silence isnt comprehension.`,
            e => `Write one sentence about something you genuinely understand in ${e.subject ? e.subject : "your field"} right now. Own it.`,
        ],
        closure: [
            e => `The doubt doesn't mean you don't belong. It usually means you care deeply. You were accepted because someone looked at your ability and said yes.`,
            e => `You're not behind. You're in the middle of learning. That's not the same thing.`,
        ],
    },
    deadline_panic: {
        opener: [
            e => `Deadline-panic mode where everything feels due right now and your brain freezes is a real physiological response, not a character flaw. ${e.deadline ? `With something due ${e.deadline}` : "What's the most urgent deadline you're looking at?"} — what's on the list?`,
            e => `Okay, let's stop the spiral. Panic is your brain trying to process everything at once, which it can't do. What's the single most urgent deadline?`,
            e => `Multiple deadlines converging is genuinely stressful. What's due first? Not everything — just first.`,
        ],
        explore: [
            e => `For the most urgent one: how much is actually done? Even partial progress counts.`,
            e => `If you had to choose just one assignment to save your grade, which would it be?`,
            e => `Is the panic about not having enough time, not knowing how to do the work, or both?`,
        ],
        bridge: [
            e => `Here's the only thing that matters right now: ${e.task ? `the ${e.task}` : "the first one"}. Everything else goes in a mental drawer. You cannot think about the other stuff yet.`,
            e => `Panic makes you feel like you need to do everything at once. You don't. You need to do one thing next. What's the literal first sentence or step you could produce?`,
            e => `The work doesn't get done in your head — it gets done in the document. The gap between "nothing" and "something on the page" is the hardest part.`,
        ],
        action: [
            e => `Open ${e.task ? `the ${e.task}` : "the most urgent assignment"} right now. Set a 20-minute timer. Your only job is to produce something — anything. Not good, just something.`,
            e => `If you can't decide where to start, just type your name and the title. The document is open. You've begun.`,
            e => `Three 25-minute work sprints with 5-minute breaks each. That's the whole plan for the next two hours.`,
        ],
        closure: [
            e => `You broke through the freeze — that's the hardest part. Keep breaking it into time blocks and you'll be surprised how much you can move.`,
            e => `You handled this by getting specific instead of spiraling. That's the skill to bring to every crunch.`,
        ],
    },
    exam_anxiety: {
        opener: [
            e => `Pre-exam anxiety is your brain running worst-case scenarios on repeat. ${e.task ? `When is the ${e.task}?` : "When's the exam, and what's making it feel especially heavy?"}`,
            e => `That specific dread before an exam doesn't mean you're going to fail — it means you care. What part has you most worried?`,
            e => `Exam anxiety is physical — your body is in mild threat mode. What does it feel like for you right now?`,
        ],
        explore: [
            e => `Is the anxiety more about the content itself, or more about the pressure and what's at stake?`,
            e => `When you picture sitting down to take it, what's the specific fear — blanking out, not finishing in time, a particular topic?`,
            e => `How prepared do you actually feel, not how anxious? Those two things can be very different.`,
        ],
        bridge: [
            e => `Anxiety about an exam and readiness for an exam are completely separate things. You can be very prepared and very anxious. What you know doesn't disappear because you're nervous.`,
            e => `Your brain has stored more than it feels like right now. Anxiety narrows your access to it — which is why practice problems open that access back up.`,
            e => `You have gotten through every hard thing you've faced so far. This is one more.`,
        ],
        action: [
            e => `Do one practice problem on the concept you feel least solid on. Just one. It signals to your brain "I'm prepared" and takes the edge off.`,
            e => `Tonight: put the notes down two hours before sleep. Your brain consolidates better with rest than with last-minute cramming. Trust what's already in there.`,
            e => `The morning of: eat something, drink water, arrive early. Physical readiness is real exam prep.`,
        ],
        closure: [
            e => `Whatever happens on this exam, it is one data point in a long story. You are more than any single grade.`,
            e => `You prepared, you showed up, you faced it. That's all you can control — and that's exactly what you did.`,
        ],
    },
    procrastination: {
        opener: [
            e => `That stuck feeling — where you know you need to start but your whole system resists — is usually not laziness. It's avoidance, and avoidance has a reason underneath it. What does the thought of starting ${e.task ? `the ${e.task}` : "the work"} actually feel like?`,
            e => `Procrastination is almost never about not wanting to work — it's usually about something the work is connected to. Fear of it being bad, fear of trying and still failing. Does any of that sound familiar?`,
            e => `The can't-start loop is one of the most frustrating places to be. What have you been doing instead of starting?`,
        ],
        explore: [
            e => `When you think about opening ${e.task ? `the ${e.task}` : "it"} right now, what feeling actually comes up? Boredom, dread, overwhelm, something else?`,
            e => `Is this specific to ${e.subject ? e.subject : "this class"} or is it happening across everything right now?`,
            e => `What would have to be true for you to feel okay about starting? What condition are you waiting for?`,
        ],
        bridge: [
            e => `The task never gets smaller while you wait, but the dread does get bigger. The only way out is the tiniest possible start — something so small it can't be resisted.`,
            e => `You don't need to be ready. You don't need to feel like doing it. You just need to do one thing so small it barely counts. Then inertia takes over.`,
            e => `The goal right now is not to finish. Not even to do it well. The goal is just to break the seal.`,
        ],
        action: [
            e => `Your only task: open the document. That's it. Open it and stare at it for 60 seconds. You don't have to type anything.`,
            e => `Set a 5-minute timer and write anything — even "I don't know how to start this" — in the document. Five minutes. Then you're allowed to stop.`,
            e => `Tell yourself: "I'm starting ${e.task ? `the ${e.task}` : "my work"} for exactly 10 minutes. Then I can stop." The commitment to a short time reduces avoidance significantly.`,
        ],
        closure: [
            e => `You identified what was really going on instead of just calling yourself lazy. That's the work. Next time, name the resistance first — then negotiate with it.`,
            e => `The starting is always the hardest part. You broke through it. That matters.`,
        ],
    },
    focus_struggles: {
        opener: [
            e => `The inability to concentrate even when you're trying is maddening. Is this a today problem, or has focus been hard for a while?`,
            e => `Sitting at your desk while your brain refuses to cooperate is exhausting. What does the distraction look like — phone, thoughts, something else?`,
            e => `Focus struggles can come from a dozen places. Are you physically tired, emotionally drained, or is it more like restless mental energy that won't settle?`,
        ],
        explore: [
            e => `When you try to study ${e.subject ? e.subject : ""}, how long are you able to focus before it breaks — 30 seconds, 5 minutes?`,
            e => `What's your setup right now — where are you, what's around you, what's on your screen?`,
            e => `Is something specific running in the background of your mind pulling your attention, or is it more diffuse than that?`,
        ],
        bridge: [
            e => `Focus isn't a willpower game — it's an environment game. The brain defaults to distraction unless the environment makes focus the path of least resistance.`,
            e => `Forcing concentration when your nervous system is dysregulated is like sprinting while exhausted. Sometimes the move is a 10-minute reset before you try again.`,
            e => `Two-minute rule: write down everything on your mind before you start. Externalizing it frees up the mental RAM that was holding it.`,
        ],
        action: [
            e => `Phone in another room — not face-down, in another room. Set a 25-minute timer. You can check it after. That physical barrier reduces checking more than you'd expect.`,
            e => `Try the 2-minute brain dump: before studying, write everything on your mind for 2 minutes straight. Then close that notebook and open the work.`,
            e => `Change one thing about your physical space right now — different chair, different room, facing a different direction. Novel environment resets attention slightly.`,
        ],
        closure: [
            e => `Focus is a skill and a resource, not a fixed trait. The days it's hard say nothing about your ability.`,
        ],
    },
    peer_comparison: {
        opener: [
            e => `Comparing yourself to classmates is one of the quickest paths to feeling terrible — and social media makes it ten times worse. What set this off today?`,
            e => `That "everyone has it together except me" feeling is so pervasive in academic environments. What are you comparing specifically?`,
            e => `Seeing peers succeed can trigger something really painful when you're struggling. What does the comparison look like for you right now?`,
        ],
        explore: [
            e => `Is this about academic performance, or is it more social — feeling less connected, confident, or put-together than your peers?`,
            e => `What would it mean to you if it turned out your peers were struggling just as much but not showing it?`,
            e => `Do you know for a fact how those people are doing, or are you inferring it from what they project?`,
        ],
        bridge: [
            e => `Students consistently overestimate how well their peers are doing. Everyone is performing some version of "fine." The behind-the-scenes is almost always messier than it looks.`,
            e => `You're measuring your insides against their outsides. That comparison is structurally rigged — you'll lose every time. The only fair comparison is you yesterday vs. you today.`,
        ],
        action: [
            e => `Mute or unfollow one account that consistently makes you feel worse about yourself. It's not dramatic — it's just good environment design.`,
            e => `Write one thing you've handled or figured out this week that was hard. Doesn't have to be impressive. Just true.`,
        ],
        closure: [
            e => `Your path and theirs are not the same path. There's no single finish line everyone's racing toward. You're building something that's yours.`,
        ],
    },
    frustration: {
        opener: [
            e => `Frustration like that usually means something you care about isn't working the way it should. Is this pointed at something specific, or is it more like everything at once?`,
            e => `That building irritation where nothing is catastrophic but everything is grinding — exhausting in its own right. What pushed you over the edge today?`,
            e => `Sometimes frustration is just the surface feeling for something harder underneath. What's actually going on?`,
        ],
        explore: [
            e => `If you had to name the one thing most responsible for how you're feeling, what would it be?`,
            e => `Is this frustration something you feel like you can do anything about, or does it feel out of your control?`,
        ],
        bridge: [
            e => `Frustration is energy. It's uncomfortable, but it's not passive — there's something in it that wants to change something. What would "better" look like from here?`,
            e => `There's usually one small thing within arm's reach even when everything feels out of control. What's one thing you actually have control over right now?`,
        ],
        action: [
            e => `Step away from whatever is in front of you for 10 minutes. Not to fix it — just to let your cortisol drop. Frustration decisions are usually worse than post-break decisions.`,
            e => `Write it down: what happened, what you wanted to happen, and what you're actually going to do. Externalizing it makes it smaller.`,
        ],
        closure: [
            e => `You named it and worked through it instead of letting it fester. Frustration is going to show up again — now you've practiced the move.`,
        ],
    },
    sadness: {
        opener: [
            e => `I'm really glad you reached out. Sadness without a clear reason is its own kind of heavy. Is there anything contributing to how you're feeling, or is it more like a general weight?`,
            e => `It takes something to admit you're feeling sad — a lot of people just push through it. I want to make space for that. What's it like for you today?`,
            e => `Some days just feel gray, and that's okay. What do you need most right now — to vent, to problem-solve, or just to be heard?`,
        ],
        explore: [
            e => `Have you been carrying this for a while, or did something shift recently?`,
            e => `Is there anything you've been avoiding or not letting yourself feel that might be feeding into this?`,
            e => `When you're sad like this, what usually helps even a little — movement, connection, distraction, rest?`,
        ],
        bridge: [
            e => `Being gentle with yourself right now is the right call. This isn't a problem to solve — it's a state to move through. The only goal today is taking care of yourself.`,
            e => `Sadness often signals something that matters to you isn't being honored. Your feelings are pointing at something real, even if you can't name it yet.`,
        ],
        action: [
            e => `One small act of care: drink some water, put on something comfortable, and give yourself permission to not be productive today.`,
            e => `Is there one person you could reach out to today — not to talk about this necessarily, just to feel connected? Sometimes proximity to someone kind helps.`,
        ],
        closure: [
            e => `You showed up for yourself today. That counts for a lot, especially on the hard days.`,
            e => `Sadness moves through. You don't have to fight it — just let yourself feel it without judgment.`,
        ],
    },
    anxiety: {
        opener: [
            e => `Anxiety makes everything feel urgent and threatening even when it isn't — your body is in overdrive. Is this tied to something specific, or is it more of a general overwhelm?`,
            e => `That anxious, can't-settle feeling is physically real. When did it start feeling this way today?`,
            e => `Anxiety this strong is hard to think through from inside it. Before we talk about causes — are you somewhere safe and comfortable right now?`,
        ],
        explore: [
            e => `What's your body doing right now — heart racing, chest tight, mind spinning?`,
            e => `Is there one specific thing your brain keeps returning to, or is it more like a dozen things at once?`,
        ],
        bridge: [
            e => `Your nervous system needs a physical signal that you're safe before your brain can think clearly. The logic part is less accessible when you're in this state.`,
            e => `Anxiety tells you that thinking harder or worrying more will help. It won't. The reset has to come through your body, not your thoughts.`,
        ],
        action: [
            e => `Breathe in for 4 counts, hold for 4, out for 6. Do it three times. That extended exhale activates the parasympathetic system — it's physiological, not just a saying.`,
            e => `Get a glass of cold water and drink it slowly. The physical act of swallowing and the temperature change genuinely help regulate the nervous system.`,
            e => `Step outside for 5 minutes if you can. Brief contact with fresh air and a change of environment interrupts the anxiety cycle.`,
        ],
        closure: [
            e => `You're safe. The anxiety is uncomfortable, but it passes. You've made it through every anxious moment so far, and you'll make it through this one.`,
            e => `You reached out instead of sitting with it alone. You don't have to carry this by yourself.`,
        ],
    },
    missed_deadline: {
        opener: [
            e => `Okay, that sinking feeling is real — but let's not spiral. The most important thing is damage control, not self-punishment. Have you contacted ${e.professor ? e.professor : "the professor"} yet?`,
            e => `Missing a deadline is recoverable in most cases, but speed matters. The sooner you act, the more options you have. What exactly was missed?`,
            e => `This happened. We can't undo it, but we can control what happens next. Check the syllabus right now for the late work policy — what does it say?`,
        ],
        explore: [
            e => `Was there a reason it was missed — an emergency, an oversight — or did it just slip through?`,
            e => `Have you looked at the late policy? Some professors accept late work for partial credit even when it's not formally stated.`,
        ],
        bridge: [
            e => `The worst thing you can do is say nothing and hope it disappears. Professors almost always respond better to a student who communicates than one who ghosts.`,
            e => `A polite, honest email can save your grade in situations like this. Most instructors are human beings who've had bad weeks too.`,
        ],
        action: [
            e => `Right now: send a short, direct email to ${e.professor ? e.professor : "the professor"}. Acknowledge you missed it, explain briefly if there's a real reason, and ask if there are any options. Three to four sentences.`,
            e => `Check your syllabus/assignment portal — sometimes late submission portals stay open even after the deadline. Worth checking before you email.`,
        ],
        closure: [
            e => `You handled it. You took action instead of avoiding. Whatever comes next, you gave yourself the best possible shot.`,
        ],
    },
    general_venting: {
        opener: [
            e => `I'm here. You don't have to have it figured out or have the right words — just tell me what's going on.`,
            e => `Sometimes it's not one thing, it's just everything pressing in at once. What's at the front of your mind right now?`,
            e => `Take your time. What's making today feel hard?`,
        ],
        explore: [
            e => `What would help most right now — talking it through, problem-solving, or just being heard?`,
            e => `Is there a part of this that feels more in your control than the rest?`,
            e => `When did things start feeling this way — was there a moment, or has it been building?`,
        ],
        bridge: [
            e => `It makes sense that you're feeling this way. A lot is clearly going on. You don't have to fix everything right now.`,
            e => `You can't do everything at once. But you can do one thing. What would make you feel even 5% better in the next hour?`,
        ],
        action: [
            e => `What's one thing — even tiny — you can do in the next 20 minutes to take a little weight off?`,
            e => `Sometimes the most helpful thing is just writing it down. What are the three biggest things taking up space in your head right now?`,
        ],
        closure: [
            e => `You took time to check in with yourself today. That's not small. Take it one step at a time.`,
            e => `You've got this. And I'm here when you need to process more.`,
        ],
    },
};

// ─────────────────────────────────────────────────────────────
// SECTION 7.5: LOCAL RAG KNOWLEDGE BASE & RETRIEVAL
// ─────────────────────────────────────────────────────────────

const RAG_KNOWLEDGE_BASE = [
    // Stress & Panic
    { id: "rag_stress_1", intent: "coursework_stress", text: "Try the Pomodoro technique: set a timer for 25 minutes of focused work, followed by 5 minutes of rest. It breaks the wall of overwhelm into a small block." },
    { id: "rag_stress_2", intent: "coursework_stress", text: "Write out a 'To-Don't' list. Explicitly write down the tasks you are NOT going to worry about today, and pick just one to focus on." },
    { id: "rag_panic_1", intent: "deadline_panic", text: "Close every single browser tab except the one assignment you need to start. Minimizing visual clutter directly reduces cognitive overload." },
    
    // Burnout & Imposter
    { id: "rag_burnout_1", intent: "burnout_doubt", text: "Step completely away from the screen. Go for a 15-minute walk outside without your phone or any audio. Let your visual field expand." },
    { id: "rag_imposter_1", intent: "imposter_syndrome", text: "Write down three bugs you successfully fixed or concepts you mastered this semester. The proof of your capability is in your past work, not in how you feel right now." },
    
    // Academic Friction ( HARSH GRADING ENTRIES)
    { id: "rag_confuse_1", intent: "confusing_material", text: "Use rubber duck debugging. Explain what the syntax or assignment is supposed to do out loud to an empty room, line by line. The gap in logic usually reveals itself." },
    { id: "rag_grade_1", intent: "harsh_grading", text: "When you realize a bad grade is tied to your own study habits, the best move is turning that guilt into a system. Block out specific study windows on your calendar a week before the next exam." },
    { id: "rag_grade_2", intent: "harsh_grading", text: "If an assignment lacked feedback, reach out to the professor during office hours. Don't argue the grade, just ask: 'How can I align my next submission with your expectations?'" },
    { id: "rag_grade_3", intent: "harsh_grading", text: "One bad grade is a data point, not a trend. Look at the syllabus and calculate exactly how much this actually impacts your final grade—it is usually much less than your anxiety is telling you." },

    // General
    { id: "rag_general_1", intent: "general_venting", text: "Try the 5-4-3-2-1 grounding method. Acknowledge 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste to pull your nervous system back to the present." }
];

let _ragEmbeddings = [];

async function buildRAGEmbeddings() {
    for (const item of RAG_KNOWLEDGE_BASE) {
        const vec = await _embed(item.text);
        _ragEmbeddings.push({ ...item, vector: vec });
    }
    console.log(`RAG Pipeline ready: Embedded ${_ragEmbeddings.length} strategies.`);
}

async function retrieveBestStrategy(userQuery, targetIntent, currentTurn) {
    if (_ragEmbeddings.length === 0) return null;

    const queryVec = await _embed(userQuery);
    let bestMatch = null;
    let highestScore = -1;

    for (const item of _ragEmbeddings) {
        if (item.intent !== targetIntent && item.intent !== "general_venting") continue;

        const score = _cosine(queryVec, item.vector);
        if (score > highestScore) {
            highestScore = score;
            bestMatch = item;
        }
    }

    // Require a stronger math score (0.55) to interrupt early exploration phases .
    // Standard confidence (0.4) for the later action phases .
    const requiredConfidence = currentTurn < 3 ? 0.55 : 0.4;

    return highestScore > requiredConfidence ? bestMatch : null;
}

// ─────────────────────────────────────────────────────────────
// SECTION 8: RESPONSE SELECTOR & CLASSIFIERS
// ─────────────────────────────────────────────────────────────

function _getStage(turn) {
    if (turn === 0) return "opener";
    if (turn <= 2)  return "explore";
    if (turn === 3) return "bridge";
    if (turn === 4) return "action";
    return "closure";
}

// 1. ACKNOWLEDGMENTS: Valid short answers or nods. (ADVANCES SCRIPT)
function _isAcknowledgment(text) {
    const t = text.toLowerCase().trim().replace(/[.,!?]+$/, '');
    const acks = [
        "yes", "yeah", "yea", "yep", "yup", "sure", 
        "ok", "okay", "alright", "hmm", "mhm", "uh huh", 
        "no", "nope", "nah", "makes sense", "got it", "i see", "right", "true", "exactly"
    ];
    return acks.includes(t);
}

// 2. FILLERS: Uncertainty or non-committal noises. (PROMPTS FOR MORE)
function _isFiller(text) {
    if (_isAcknowledgment(text)) return false; // Acks are not fillers
    const t = text.toLowerCase().trim().replace(/[.,!?]+$/, '');
    const fillers = [
        "not sure", "maybe", "i guess", "dunno", "not really", 
        "lol", "haha", "hm", "ugh", "oof", "eh", "meh", "wow", "damn"
    ];
    return fillers.includes(t);
}

// 3. RESISTANCE: Complete shut down or blanking. (HOLDS SCRIPT)
function _isResistance(text) {
    if (_isAcknowledgment(text) || _isFiller(text)) return false; 
    
    const t = text.toLowerCase().trim().replace(/[.,!?]+$/, '');
    
    if (/^(idk|idc|nothing|whatever|nevermind|forget it)$/i.test(t)) return true;
    if (t.includes("don't know") || t.includes("dont know")) return true;
    
    if (t.length <= 2) return true;
    
    return false;
}

// 4. CLOSING: User is ending the chat.
function _isClosing(text) {
    const t = text.toLowerCase().trim().replace(/[.,!?]+$/, '');
    const closingPhrases = [
        "thank you", "thanks", "that helps", "that helped", "i feel better",
        "feeling better", "i'll do that", "ill do that", "i will do that",
        "i will try", "ill try", "bye", "goodbye", "see ya", "good night", "thanks!"
    ];
    return closingPhrases.some(phrase => t.includes(phrase)) && t.length < 50;
}

function selectResponse(intent, turn, entities, usedIds) {
    const pool = RESPONSE_POOLS[intent] || RESPONSE_POOLS.general_venting;
    const stage = _getStage(turn);
    const candidates = pool[stage] || pool.explore || pool.opener;

    const fresh = candidates.filter((_, i) => !usedIds.has(`${intent}:${stage}:${i}`));
    const source = fresh.length > 0 ? fresh : candidates;

    const chosen   = source[Math.floor(Math.random() * source.length)];
    const realIdx  = candidates.indexOf(chosen);
    const id       = `${intent}:${stage}:${realIdx}`;
    const text     = typeof chosen === "function" ? chosen(entities) : chosen;

    return { text, id };
}

// ─────────────────────────────────────────────────────────────
// SECTION 9: USER MEMORY ENGINE
// ─────────────────────────────────────────────────────────────

const UserMemory = {
    getProfile() {
        const saved = JSON.parse(localStorage.getItem("rc_userProfile")) || {};
        return {
            totalSessions: saved.totalSessions || 0,
            streakCount: saved.streakCount || 0,
            lastVisitDate: saved.lastVisitDate || null,
            moodLog: saved.moodLog || [],
            frictionMap: saved.frictionMap || {}
        };
    },
    saveProfile(p) { localStorage.setItem("rc_userProfile", JSON.stringify(p)); },
    logSession(emotion, intent) {
        const p = this.getProfile();
        const today = new Date().toLocaleDateString();
        if (p.lastVisitDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            p.streakCount = p.lastVisitDate === yesterday.toLocaleDateString() ? p.streakCount + 1 : 1;
            p.totalSessions++;
            p.lastVisitDate = today;
        }
        
        if (intent) p.frictionMap[intent] = (p.frictionMap[intent] || 0) + 1;
        
        p.moodLog.push({ date: today, emotion, intent });
        if (p.moodLog.length > 30) p.moodLog.shift();
        this.saveProfile(p);
        return p;
    },
    getNudge() {
        const p = this.getProfile();
        if (p.moodLog.length < 3) return null;
        const recent = p.moodLog.slice(-3);
        if (recent.every(l => l.emotion === "distressed" || l.emotion === "anxious")) {
            return "Before we dive in — I've noticed you've been carrying a lot across our last few sessions. That takes real strength to keep showing up. What's on your mind today?";
        }
        if (p.totalSessions === 5)  return "This is your 5th session. You've been consistently showing up for yourself — that's worth acknowledging. What are we working through?";
        if (p.totalSessions === 10) return "Ten sessions in. Every time you open this instead of letting things spiral, you're building a real skill. What's going on?";
        return null;
    },
};

// ─────────────────────────────────────────────────────────────
// SECTION 10: CONVERSATION ENGINE (Production Fix)
// ─────────────────────────────────────────────────────────────

const EXACT_MATCHES = {
    "I feel sad. What are some steps to cope?": "sadness",
    "I feel frustrated. How can I deal with this frustration?": "frustration",
    "I feel anxious. How can I manage this anxiety?": "anxiety",
    "I feel stressed so much coursework has to get done.": "coursework_stress",
    "I missed an exam": "missed_deadline",
    "I'm completely burned out. I don't know why I'm even in this major.": "burnout_doubt",
    "Everyone else gets it but me.": "imposter_syndrome",
    "Too many deadlines at once.": "deadline_panic",
    "I'm so lost on this assignment.": "confusing_material",
    "I got a bad grade and I feel crushed.": "harsh_grading"
};

function generateContextualEcho(userInput, turn) {
    const text = userInput.trim().replace(/[.,!?]+$/, '');
    const lower = text.toLowerCase();

    // 1. Skip on the first turn, or if the user is stalling
    if (turn === 0 || _isResistance(lower) || _isFiller(lower)) return "";

    // 2. Catch conversational agreements to prevent "'sounds good' - that's real"
    const extendedAcks = ["sounds good", "alright", "will do", "i will", "gotcha", "makes sense"];
    if (_isAcknowledgment(lower) || extendedAcks.some(ack => lower.includes(ack))) {
        // Return a simple nod, or sometimes nothing at all so it isn't repetitive
        const basicValidations = ["Got it. ", "Makes sense. ", "I hear you. ", ""];
        return basicValidations[Math.floor(Math.random() * basicValidations.length)];
    }

    // 3. Pronoun Check: Prevents grammar breaks like "It makes sense that [i will get through this]..."
    const hasFirstPerson = /\b(i|my|me|mine|we|our|us)\b/i.test(lower);

    // 4. Strict Echoing: Only echo very short, noun-phrase-like inputs (1-5 words) without pronouns
    const wordCount = text.split(" ").length;
    if (wordCount <= 5 && !hasFirstPerson) {
        const echoes = [
            `"${text}" — I hear that. `,
            `It makes total sense that ${lower} is standing out to you right now. `,
            `Yeah, ${lower}. That's completely valid. `
        ];
        return echoes[Math.floor(Math.random() * echoes.length)];
    }

    // 5. Default generic validations for longer sentences
    const validations = [
        "I hear exactly what you're saying. ",
        "That makes a lot of sense. ",
        "Thank you for sharing that. ",
        "I completely understand where you're coming from. ",
        "That's incredibly valid. "
    ];
    
    // Only return a generic validation 40% of the time so it doesn't sound repetitive
    return Math.random() > 0.6 ? validations[Math.floor(Math.random() * validations.length)] : "";
}

class ResilientCareEngine {
    constructor() {
        this.history = [];
        this.state = {
            currentIntent:   null,
            turn:            0,
            sessionStarted:  false,
            usedResponseIds: new Set(),
            entities:        {},
            consecutiveHolds: 0, 
        };
    }

    reset() {
        this.history = [];
        this.state = { currentIntent: null, turn: 0, sessionStarted: false, usedResponseIds: new Set(), entities: {}, consecutiveHolds: 0 };
    }

    async generateResponse(userInput) {
        if (typeof isCrisis === "function" && isCrisis(userInput)) return typeof CRISIS_RESPONSE !== "undefined" ? CRISIS_RESPONSE : null;

        this.history.push({ role: "user", text: userInput });

        if (!this.state.sessionStarted) {
            this.state.sessionStarted = true;
            const nudge = UserMemory.getNudge();
            if (nudge) {
                this.history.push({ role: "assistant", text: nudge });
                if (typeof autoSaveSession === "function") autoSaveSession("ResilientCare AI", nudge);
                return { text: nudge, detectedMode: "Empathetic", detectedIntent: null, emotionalTone: "neutral", isComplete: false, suggestedChips: [] };
            }
        }

        const normalizedInput = userInput.toLowerCase().replace(/[^\w\s]/g, "").trim();
        const matchedKey = Object.keys(EXACT_MATCHES).find(key => key.toLowerCase().replace(/[^\w\s]/g, "").trim() === normalizedInput);

        let intentResult = null;
        let emotion = "neutral";

        if (matchedKey) {
            const matchedIntent = EXACT_MATCHES[matchedKey];
            intentResult = { intent: matchedIntent, confidence: 1.0 };
            if (["sadness", "frustration", "anxiety", "burnout_doubt", "harsh_grading", "deadline_panic", "coursework_stress"].includes(matchedIntent)) {
                emotion = "distressed";
            }
        } else {
            [intentResult, emotion] = await Promise.all([
                (typeof _modelsReady !== "undefined" && _modelsReady && typeof detectIntent === "function") ? detectIntent(userInput) : Promise.resolve({ intent: "general_venting", confidence: 0.5 }),
                (typeof _modelsReady !== "undefined" && _modelsReady && typeof detectEmotion === "function") ? detectEmotion(userInput) : Promise.resolve("neutral"),
            ]);
        }

        const shouldSwitch = !this.state.currentIntent || (intentResult.confidence > 0.75 && intentResult.intent !== this.state.currentIntent);

        if (shouldSwitch) {
            this.state.currentIntent = intentResult.intent;
            this.state.turn = 0;
            this.state.usedResponseIds = new Set();
            this.state.consecutiveHolds = 0;
            UserMemory.logSession(emotion, intentResult.intent);
        }

        const isRes = _isResistance(userInput);
        const isFil = _isFiller(userInput);
        
        if (isRes || isFil) {
            this.state.consecutiveHolds++;
        } else {
            this.state.consecutiveHolds = 0;
        }

        if (_isClosing(userInput) && this.state.turn > 1) {
            const snapshotIntent = this.state.currentIntent; 
            const pool = RESPONSE_POOLS[snapshotIntent] || RESPONSE_POOLS.general_venting;
            const closurePool = pool.closure || ["Take care of yourself. You did good work today."];
            const chosen = closurePool[Math.floor(Math.random() * closurePool.length)];
            let closureText = typeof chosen === "function" ? chosen(this.state.entities) : chosen;

            if (userInput.toLowerCase().includes("thank")) closureText = "You're very welcome. " + closureText;

            this.history.push({ role: "assistant", text: closureText });
            this.state.currentIntent = null;
            this.state.turn = 0;

            return { text: closureText, detectedMode: "Balanced", detectedIntent: snapshotIntent, emotionalTone: emotion, isComplete: true, suggestedChips: [] };
        }

        if (this.state.consecutiveHolds >= 2 && this.state.turn > 0) {
            const snapshotIntent = this.state.currentIntent;
            const closingMsg = "It's completely okay if you don't have the energy to dive into this right now. Sometimes just acknowledging that you're overwhelmed is enough for one day. I'll let you rest, but I'm always here when you're ready.";
            
            this.history.push({ role: "assistant", text: closingMsg });
            
            this.state.currentIntent = null;
            this.state.turn = 0;
            this.state.consecutiveHolds = 0;

            return {
                text: closingMsg,
                detectedMode: "Empathetic",
                detectedIntent: snapshotIntent,
                emotionalTone: emotion,
                isComplete: true, 
                suggestedChips: [],
            };
        }

        if (this.state.turn > 0) {
            if (isRes) {
                const responses = [
                    "It's completely okay if you don't have the words right now. Take your time.",
                    "You don't have to figure it all out right this second. No pressure at all.",
                    "That's perfectly fine. When things get heavy, the brain just kind of blanks.",
                    "I hear you. Sometimes it's just overwhelming. I'm right here with you.",
                    "That makes sense. We don't have to solve it right now. We can just take it slow."
                ];
                const text = responses[Math.floor(Math.random() * responses.length)];
                this.history.push({ role: "assistant", text });
                return { text, detectedMode: "Empathetic", detectedIntent: this.state.currentIntent, emotionalTone: emotion, isComplete: false, suggestedChips: [] };
            }
            
            if (isFil) {
                const softContinue = [
                    "It's okay to be unsure. Can you tell me a bit more about what's on your mind?",
                    "That makes sense. If you had to guess, what would you say?",
                    "No worries. What's the main thing standing out to you right now?",
                    "I'm listening. Take your time and feel free to expand on that.",
                ];
                const text = softContinue[Math.floor(Math.random() * softContinue.length)];
                this.history.push({ role: "assistant", text });
                return { text, detectedMode: "Balanced", detectedIntent: this.state.currentIntent, emotionalTone: emotion, isComplete: false, suggestedChips: [] };
            }
        }

        // --- STANDARD RESPONSE ADVANCEMENT & RAG INJECTION ---
        this.state.entities = extractEntities(this.history);
        
        let rawText, id;
        
        // ALLOW RAG TO TRIGGER EARLIER (Turns 1-4) IF THERE IS A STRONG MATCH
        if (this.state.turn >= 1 && this.state.turn <= 4 && _modelsReady) {
            // Pass the current turn into the RAG engine so it knows how strict to be
            const ragMatch = await retrieveBestStrategy(userInput, this.state.currentIntent, this.state.turn);
            if (ragMatch && !this.state.usedResponseIds.has(ragMatch.id)) {
                rawText = ragMatch.text;
                id = ragMatch.id;
            }
        }
        
        // Fallback to static deterministic pools if RAG didn't find a match
        if (!rawText) {
            const poolRes = selectResponse(this.state.currentIntent, this.state.turn, this.state.entities, this.state.usedResponseIds);
            rawText = poolRes.text;
            id = poolRes.id;
        }

        this.state.usedResponseIds.add(id);

        let echoText = generateContextualEcho(userInput, this.state.turn);
        const combinedText = echoText + rawText;
        const finalText = applyEmotionLayer(combinedText, emotion, this.state.turn);
        
        this.state.turn++; 
        const isComplete = this.state.turn >= 6;

        if (isComplete) {
            this.state.currentIntent = null;
            this.state.turn = 0;
            this.state.consecutiveHolds = 0;
        }

        this.history.push({ role: "assistant", text: finalText });

        const modeMap = {
            coursework_stress:"Direct", deadline_panic:"Direct", missed_deadline:"Direct",
            procrastination:"Direct", focus_struggles:"Direct", burnout_doubt:"Empathetic",
            sadness:"Empathetic", anxiety:"Empathetic", frustration:"Empathetic",
            imposter_syndrome:"Grounded", peer_comparison:"Grounded",
            confusing_material:"Balanced", harsh_grading:"Balanced", exam_anxiety:"Balanced", general_venting:"Balanced",
        };

        return {
            text:           finalText,
            detectedMode:   modeMap[isComplete ? null : this.state.currentIntent] || "Balanced",
            detectedIntent: isComplete ? null : this.state.currentIntent,
            emotionalTone:  emotion,
            isComplete,
            suggestedChips: [],
        };
    }
}

const AI = new ResilientCareEngine();

// ─────────────────────────────────────────────────────────────
// SECTION 11: UI, NAVIGATION, VENT BOX
// ─────────────────────────────────────────────────────────────

window.sendChip = function(text) {
    const inputArea = document.getElementById('chat-input-area');
    if (inputArea) inputArea.style.display = 'flex'; 

    const inputElement = document.getElementById('vent-input');
    if (inputElement) {
        inputElement.value = text;
        handleSend(); 
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

function openHowItWorks(e) {
    if (e) e.preventDefault(); 
    const modal = document.getElementById('howItWorksModal');
    if (!modal) return; 
    const modalBox = modal.querySelector('.modal-content-box');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
    setTimeout(() => {
        modal.style.opacity = '1';
        modalBox.style.transform = 'translateY(0)';
    }, 10);
}

function closeHowItWorks() {
    const modal = document.getElementById('howItWorksModal');
    if (!modal) return;
    const modalBox = modal.querySelector('.modal-content-box');
    modal.style.opacity = '0';
    modalBox.style.transform = 'translateY(20px)';
    document.body.style.overflow = 'auto'; 
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

window.addEventListener('click', function(event) {
    const modal = document.getElementById('howItWorksModal');
    if (event.target === modal) {
        closeHowItWorks();
    }
});

// ─────────────────────────────────────────────────────────────
// SECTION 12: VENT BOX CHAT & AUTO-SAVE LOGIC
// ─────────────────────────────────────────────────────────────

window.startNewSession = function () {
    AI.reset();
    localStorage.removeItem("activeSessionId");
    window.location.href = "vent.html";
};

function autoSaveSession(role, text) {
    let history = JSON.parse(localStorage.getItem('resilientCareHistory')) || [];
    const now = new Date();
    
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
        sessionId: sessionId 
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

window.handleSend = function () {
    const inputEl  = document.getElementById("vent-input");
    const userText = inputEl.value.trim();
    if (!userText) return;
    inputEl.value = "";

    displayUserMessage(userText);
    showTypingIndicator();

    AI.generateResponse(userText)
        .then(res => {
            const typingDelay = Math.min(Math.max(res.text.length * 15, 1200), 3500);

            setTimeout(() => {
                removeTypingIndicator();
                displayChatMessage(res.text);
                console.log(`[RC v3] intent=${res.detectedIntent} | mode=${res.detectedMode} | tone=${res.emotionalTone}`);
                if (res.isComplete) setTimeout(() => displayEndSessionUI(), 1000);
            }, typingDelay); 
        })
        .catch(err => {
            removeTypingIndicator();
            console.error("AI Generation Error:", err);
            displayChatMessage("I'm having a little trouble processing that. Could you try saying that again?");
        });
};

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
    typingDiv.className = 'ai-message-bubble typing-bubble'; 
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    mainContent.appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicators = document.querySelectorAll('.typing-bubble');
    indicators.forEach(ind => ind.remove());
}

// ─────────────────────────────────────────────────────────────
// SECTION 13: INSIGHTS PAGE GRAPH GENERATION LOGIC
// ─────────────────────────────────────────────────────────────

function loadInsightsGraph() {
    try {
        const profile = UserMemory.getProfile();
        const streakEl = document.getElementById('streak-counter');
        
        if (streakEl) {
            streakEl.innerText = profile.streakCount > 0 ? `${profile.streakCount} Days` : "Ready to start!";
        }

        const history = JSON.parse(localStorage.getItem('resilientCareHistory')) || [];

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

// ─────────────────────────────────────────────────────────────
// SECTION 14: HISTORY PAGE LOGIC
// ─────────────────────────────────────────────────────────────

function loadHistoryPage() {
    const feedContainer = document.getElementById('history-feed');
    if (!feedContainer) return;

    const history = JSON.parse(localStorage.getItem('resilientCareHistory')) || [];

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
    body.innerHTML = ''; 

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

// ─────────────────────────────────────────────────────────────
// SECTION 15: SETTINGS PAGE LOGIC
// ─────────────────────────────────────────────────────────────

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