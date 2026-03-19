// api/chat.js — Netlify Serverless Function

exports.handler = async function(event, context) {

  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // OPTIONS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Only POST allowed" }) };
  }

  try {
    const { model, messages } = JSON.parse(event.body);

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API key set nahi hai. Netlify environment variables check karo." })
      };
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || "llama-3.3-70b-versatile",
        max_tokens: 512,
        temperature: 0.7,
        messages: messages
      })
    });

    if (!groqRes.ok) {
      const errData = await groqRes.json();
      return {
        statusCode: groqRes.status,
        headers,
        body: JSON.stringify({ error: errData?.error?.message || "Groq API error" })
      };
    }

    const data = await groqRes.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
