/* ═══════════════════════════════════════════════
   AFFAF AI ASSISTANT — script.js
   Step 3 of 3: All logic and API calls live here
   ═══════════════════════════════════════════════ */


/* ─────────────────────────────────────────────
   1. CONFIG — API credentials & endpoint
   ───────────────────────────────────────────── */

/.netlify/functions/chat




/* ─────────────────────────────────────────────
   2. SYSTEM PROMPT — Affaf's personal info
   This is the "character sheet" sent to the AI
   on every request. It tells the AI who it is
   and what it knows. The AI ONLY uses these facts.
   ───────────────────────────────────────────── */

const SYSTEM_PROMPT = `
You are a friendly personal AI assistant for Affaf Imran.
Answer questions ONLY using the facts below.
If asked something not covered, say: "Sorry, I don't have information about that yet."
Do NOT invent new facts. Keep answers short, warm, and conversational.

=== PERSONAL INFORMATION ===

Name: Affaf Imran

Education: BBIT (Bachelor of Business and Information Technology) student

Hobbies: Sketching, playing football, and equestrian activities (horse riding)

Personality:
- Calm and soft-natured
- Balanced and simple life habits
- Positive mindset, treats people with kindness and respect
- Polite, friendly, and considerate in different situations
- Forgiving nature — does not hold grudges
- Believes in understanding others, maintaining peace, and healthy relationships
- Appreciates simplicity, emotional balance, and respectful communication

Skills:
- Foundational knowledge in HTML, CSS, and JavaScript
- Familiar with freelancing and online work platforms
- Understands data analysis and logical thinking
- Problem-solving abilities
- Interest in learning modern digital skills and web development

Family:
- Five family members: father, mother, two brothers, one sister
- Affaf holds the middle-child position in the family
- Father works in Oman; one brother lives in Oman, the other is in Saudi Arabia
- Early education (up to Grade 5) completed in Oman; remaining education in Pakistan
- Family travels to Oman approximately every two years

=== RESPONSE STYLE ===
- Warm and natural tone
- Short and clear answers
- Use first person ("My name is Affaf...") when speaking AS Affaf
- Use third person ("Affaf is...") when describing from outside
`;


/* ─────────────────────────────────────────────
   3. STATE — conversation memory
   Every message is stored here so the AI
   remembers the whole chat (multi-turn memory).
   ───────────────────────────────────────────── */

let conversationHistory = [];


/* ─────────────────────────────────────────────
   4. UI HELPERS
   ───────────────────────────────────────────── */

// Grab the DOM elements we'll interact with
const chatbox   = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const askBtn    = document.getElementById("askBtn");

/**
 * Auto-resize the textarea as the user types.
 * It grows up to 120px tall, then stops and scrolls.
 */
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
});

/**
 * Press Enter to send. Shift+Enter inserts a newline.
 */
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // stop the newline
    askAI();
  }
});

/**
 * Clicking a suggestion chip fills the input and sends it.
 * @param {HTMLElement} el — the chip button that was clicked
 */
function sendChip(el) {
  userInput.value = el.textContent;
  askAI();
}

/**
 * Remove the welcome screen the first time a message appears.
 */
function removeWelcome() {
  const welcome = document.getElementById("welcome");
  if (welcome) welcome.remove();
}

/**
 * Create and append a message bubble to the chat.
 * @param {string} role — "user" or "ai"
 * @param {string} text — message content
 */
function addMessage(role, text) {
  removeWelcome();

  // Outer wrapper (controls left/right alignment via CSS)
  const wrapper = document.createElement("div");
  wrapper.classList.add("message", role);

  // Small icon circle
  const icon = document.createElement("div");
  icon.classList.add("msg-icon");
  icon.textContent = role === "user" ? "🧑" : "🤖";

  // The speech bubble
  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.textContent = text;

  wrapper.appendChild(icon);
  wrapper.appendChild(bubble);
  chatbox.appendChild(wrapper);

  // Scroll to the latest message
  chatbox.scrollTop = chatbox.scrollHeight;
}

/**
 * Show animated "..." while waiting for the AI response.
 */
function showTyping() {
  removeWelcome();

  const wrapper = document.createElement("div");
  wrapper.classList.add("message", "ai");
  wrapper.id = "typingIndicator"; // so we can find & remove it later

  const icon = document.createElement("div");
  icon.classList.add("msg-icon");
  icon.textContent = "🤖";

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  // Three animated dots (CSS animates them in style.css)
  bubble.innerHTML = `
    <div class="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  wrapper.appendChild(icon);
  wrapper.appendChild(bubble);
  chatbox.appendChild(wrapper);
  chatbox.scrollTop = chatbox.scrollHeight;
}

/**
 * Remove the typing indicator once we have the real response.
 */
function removeTyping() {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) indicator.remove();
}

/**
 * Disable or re-enable the Ask AI button.
 * @param {boolean} loading — true = disable, false = re-enable
 */
function setLoading(loading) {
  askBtn.disabled = loading;
  askBtn.innerHTML = loading
    ? `<span class="btn-icon">⏳</span><span class="btn-label">Thinking…</span>`
    : `<span class="btn-icon">✦</span><span class="btn-label">Ask AI</span>`;
}


/* ─────────────────────────────────────────────
   5. MAIN FUNCTION — askAI()
   This is the heart of the app. It:
   a) Reads the user's question
   b) Shows it in the chat
   c) Sends it to Groq with fetch() + async/await
   d) Displays the AI's reply
   ───────────────────────────────────────────── */

async function askAI() {

  // a) Get and validate the input
  const userText = userInput.value.trim();
  if (!userText) return; // do nothing if empty

  const selectedModel = document.getElementById("modelSelect").value;

  // b) Reset input and show the user's message in chat
  userInput.value = "";
  userInput.style.height = "auto";
  addMessage("user", userText);

  // c) Add message to memory (so AI knows the conversation so far)
  conversationHistory.push({ role: "user", content: userText });

  // Show loading state
  setLoading(true);
  showTyping();

  try {

    /* ── FETCH CALL ──────────────────────────────
       We call the Groq API using fetch().
       async/await means we WAIT here until the
       response comes back before moving on.
       ─────────────────────────────────────────── */
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${API_KEY}` // API key in the header
      },
      body: JSON.stringify({
        model:      selectedModel, // from the dropdown
        max_tokens: 512,           // max length of AI reply
        temperature: 0.7,          // 0 = robotic, 1 = creative
        messages: [
          // First: the system prompt (AI instructions)
          { role: "system", content: SYSTEM_PROMPT },
          // Then: the full conversation history (memory)
          ...conversationHistory
        ]
      })
    });

    // If the request failed, throw with the API error message
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData?.error?.message || `HTTP Error ${response.status}`);
    }

    // Parse the JSON response
    const data    = await response.json();
    const aiReply = data.choices[0].message.content.trim();

    // Save AI reply to conversation memory
    conversationHistory.push({ role: "assistant", content: aiReply });

    // Show the AI response in the chat
    removeTyping();
    addMessage("ai", aiReply);

  } catch (error) {
    // Something went wrong — show a friendly error message
    removeTyping();
    addMessage("ai", `⚠️ Error: ${error.message}`);
    console.error("Groq API Error:", error);
  }

  // Re-enable the button
  setLoading(false);
  userInput.focus();
}
