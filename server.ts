import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// System Instruction for the Active Learning AI
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
   You MUST end every instructional turn with exactly ONE interactive block using this syntax. 
   Do NOT provide the answer in the text before the block.

   FORMATS:
   
   A. MULTIPLE CHOICE QUIZ:
   [[QUIZ:{"question":"Teks Pertanyaan","options":["Pilihan A","Pilihan B","Pilihan C"],"correct":0,"explanation":"Kenapa A benar"}]]

   B. GAP FILL (Melengkapi Kalimat):
   [[GAP_FILL:{"sentence":"Kalimat dengan ___ bagian kosong.","answer":"jawaban","hint":"Bocoran sedikit"}]]

   C. PARAPHRASE CHALLENGE:
   [[PARAPHRASE:{"context":"Ringkasan materi yang harus mereka jelaskan ulang dengan kata-kata sendiri"}]]

TONE: Intellectually stimulating, sharp, but very supportive.
`;

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  try {
    const lastMessage = messages[messages.length - 1].content;
    
    // Constructing history context if needed, but for this API we use prompt + system
    // We can prepend some history to the prompt if we want to maintain context
    let contextualPrompt = lastMessage;
    if (messages.length > 1) {
      const history = messages.slice(-5, -1) // last 4 messages for context
        .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      contextualPrompt = `Berikut adalah percakapan sebelumnya:\n${history}\n\nUser: ${lastMessage}`;
    }

    const apiUrl = new URL('https://api.siputzx.my.id/api/ai/glm47flash');
    apiUrl.searchParams.append('prompt', contextualPrompt);
    apiUrl.searchParams.append('system', ACTIVE_LEARNING_PROMPT);
    apiUrl.searchParams.append('temperature', '0.7');

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const result = await response.json();
    
    if (result.status && result.data && result.data.response) {
      res.json({ content: result.data.response });
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error: any) {
    console.error('AI API Error:', error);
    res.status(500).json({ error: 'Gagal mendapatkan jawaban', details: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
