// ═══════════════════════════════════════════════
// api/chat.js  —  Vercel Serverless Function
//
// Yeh kya karta hai:
// 1. Browser se request aati hai (model + messages)
// 2. Yeh function secret API key use karta hai
// 3. Groq ko call karta hai
// 4. Response browser ko bhejta hai
//
// API key kabhi browser tak nahi pahunchi! ✅
// ═══════════════════════════════════════════════

export default async function handler(req, res) {

  // ── CORS Headers — browser ko allow karo ──
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Browser OPTIONS request handle karo (CORS preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Sirf POST allow hai
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sirf POST allowed hai" });
  }

  try {
    // Browser se model aur messages lo
    const { model, messages } = req.body;

    // ── SECRET KEY — .env se lo, GitHub par nahi hai ──
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "API key server par set nahi hai. Vercel environment variables check karo."
      });
    }

    // ── Groq API call — server side se ──
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}` // 🔒 Key yahan use hoti hai — server par!
        },
        body: JSON.stringify({
          model:       model || "llama-3.3-70b-versatile",
          max_tokens:  512,
          temperature: 0.7,
          messages:    messages
        })
      }
    );

    // Groq error ho toh wapas bhejo
    if (!groqRes.ok) {
      const errData = await groqRes.json();
      return res.status(groqRes.status).json({
        error: errData?.error?.message || "Groq API error aayi"
      });
    }

    // ✅ Groq ka jawab browser ko bhejo
    const data = await groqRes.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}