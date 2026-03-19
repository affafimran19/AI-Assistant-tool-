const API_URL = "/.netlify/functions/chat";

let conversationHistory = [];

const chatbox   = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const askBtn    = document.getElementById("askBtn");

const SYSTEM_PROMPT = `
You are a friendly personal AI assistant for Affaf Imran.
Answer questions ONLY using the facts below.
If asked something not covered, say: "Sorry, I don't have information about that yet."
Do NOT invent new facts. Keep answers short, warm, and conversational.

=== PERSONAL INFORMATION ===
Name: Affaf Imran
Education: BBIT (Bachelor of Business and Information Technology) student
Hobbies: Sketching, playing football, and equestrian activities (horse riding)
Personality: Calm, soft-natured, positive mindset, polite, friendly, forgiving, believes in peace and healthy relationships.
Skills: HTML, CSS, JavaScript, freelancing platforms, data analysis, problem-solving, web development interest.
Family: Five members: father, mother, two brothers, one sister. Middle child. Father and one brother in Oman, one brother in Saudi Arabia. Early education in Oman (up to Grade 5), rest in Pakistan. Family visits Oman every two years.
`;

userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    askAI();
  }
});

function sendChip(el) {
  userInput.value = el.textContent;
  askAI();
}

function removeWelcome() {
  const welcome = document.getElementById("welcome");
  if (welcome) welcome.remove();
}

function addMessage(role, text) {
  removeWelcome();
  const wrapper = document.createElement("div");
  wrapper.classList.add("message", role);
  const icon = document.createElement("div");
  icon.classList.add("msg-icon");
  icon.textContent = role === "user" ? "🧑" : "🤖";
  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.textContent = text;
  wrapper.appendChild(icon);
  wrapper.appendChild(bubble);
  chatbox.appendChild(wrapper);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function showTyping() {
  removeWelcome();
  const wrapper = document.createElement("div");
  wrapper.classList.add("message", "ai");
  wrapper.id = "typingIndicator";
  const icon = document.createElement("div");
  icon.classList.add("msg-icon");
  icon.textContent = "🤖";
  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  wrapper.appendChild(icon);
  wrapper.appendChild(bubble);
  chatbox.appendChild(wrapper);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function removeTyping() {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) indicator.remove();
}

function setLoading(loading) {
  askBtn.disabled = loading;
  askBtn.innerHTML = loading
    ? `<span class="btn-icon">⏳</span><span class="btn-label">Thinking…</span>`
    : `<span class="btn-icon">✦</span><span class="btn-label">Ask AI</span>`;
}

async function askAI() {
  const userText = userInput.value.trim();
  if (!userText) return;
  const selectedModel = document.getElementById("modelSelect").value;
  userInput.value = "";
  userInput.style.height = "auto";
  addMessage("user", userText);
  conversationHistory.push({ role: "user", content: userText });
  setLoading(true);
  showTyping();
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...conversationHistory
        ]
      })
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData?.error?.message || `HTTP Error ${response.status}`);
    }
    const data = await response.json();
    const aiReply = data.choices[0].message.content.trim();
    conversationHistory.push({ role: "assistant", content: aiReply });
    removeTyping();
    addMessage("ai", aiReply);
  } catch (error) {
    removeTyping();
    addMessage("ai", `⚠️ Error: ${error.message}`);
  }
  setLoading(false);
  userInput.focus();
}
