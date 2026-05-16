import type { VercelRequest, VercelResponse } from '@vercel/node';

const ACTIVE_LEARNING_PROMPT = `
You are "Nalar.ai", a specialized pedagogical AI assistant designed to foster active learning.
Your goal is NEVER to provide immediate full answers. Instead, you guide the student through discovery and critical thinking.

GUIDANCE RULES:
1. Always start by acknowledging the user's level.
2. Use lead-in questions: Guide them step-by-step instead of dumping facts.
3. Use analogies: Explain abstract concepts using relatable metaphors.
4. Error handling: If they are wrong, don't just say "no", but ask "Why do you think that? What about [alternative]?"

STRICT UNIVERSAL RULES:
1. SCANNABLE RESPONSE: Use markdown, bolding, and bullet points.
2. MATH: Use LaTeX ($inline$ and $$block$$).
3. Language: Indonesian (Slang educational/professional mixed is OK).

4. INTERACTIVE BLOCKS (MANDATORY):
   You MUST end every single message with exactly ONE interactive block. 
   CRITICAL: You MUST use double brackets [[TYPE:{...}]] and ensure you include ALL required JSON fields.
   DO NOT truncate the JSON.

   FORMATS (Double brackets are REQUIRED):
   
   A. MULTIPLE CHOICE QUIZ:
   [[QUIZ:{"question":"Teks Pertanyaan?","options":["A","B","C"],"correct":0,"explanation":"Penjelasan singkat"}]]
   
   B. GAP FILL:
   [[GAP_FILL:{"sentence":"Kata ___ adalah...","answer":"kunci","hint":"Bocoran"}]]
   
   C. PARAPHRASE:
   [[PARAPHRASE:{"context":"Jelaskan ulang konsep X"}]]

TONE: Intellectually stimulating, sharp, but very supportive.
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  // Validate request
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Format request tidak valid — messages harus array' });
  }

  if (messages.length > 10) {
    return res.status(400).json({ error: 'Maksimal 10 pesan per request' });
  }

  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: 'Setiap pesan harus memiliki role dan content' });
    }
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return res.status(400).json({ error: 'Role harus "user" atau "assistant"' });
    }
    if (typeof msg.content !== 'string') {
      return res.status(400).json({ error: 'Content harus berupa string' });
    }
    if (msg.content.length > 2000) {
      return res.status(400).json({ error: 'Content maksimal 2000 karakter' });
    }
    if (msg.content.trim().length === 0) {
      return res.status(400).json({ error: 'Content tidak boleh kosong' });
    }
  }

  try {
    const lastMessage = messages[messages.length - 1].content;

    let contextualPrompt = lastMessage;
    if (messages.length > 1) {
      const history = messages.slice(-5, -1)
        .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      contextualPrompt = `Berikut adalah percakapan sebelumnya:\n${history}\n\nUser: ${lastMessage}`;
    }

    const apiUrl = process.env.AI_API_URL || 'https://api.siputzx.my.id/api/ai/glm47flash';
    const url = new URL(apiUrl);
    url.searchParams.append('prompt', contextualPrompt);
    url.searchParams.append('system', ACTIVE_LEARNING_PROMPT);
    url.searchParams.append('temperature', '0.7');

    const headers: Record<string, string> = {};
    if (process.env.AI_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.AI_API_KEY}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const result = await response.json();

    if (result.status && result.data && result.data.response) {
      return res.status(200).json({ content: result.data.response });
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error: any) {
    console.error('AI API Error:', error);
    return res.status(500).json({
      error: 'Gagal mendapatkan jawaban dari AI',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
}