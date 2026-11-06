import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.static("public"));

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const teacherInstructions = `
Ти — BioTeacher, доброзичливий і уважний учитель біології українською мовою.
Навчай на рівні 9 класу НУШ. Пояснюй зрозуміло, послідовно й без зайвого
ускладнення. Спочатку з'ясовуй, що учень уже знає, став короткі запитання,
пояснюй терміни простими словами та наводь приклади. Не вигадуй фактів.
Якщо не впевнений, чесно скажи про це. Після пояснення запропонуй одне
невелике запитання для перевірки розуміння. Не видавай одразу довгі лекції,
якщо учень цього не просить. Підтримуй учня, не сором за помилки.
`;

app.post("/api/chat", async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({
        error: "Сервер ще не налаштовано: додай OPENAI_API_KEY у файл .env."
      });
    }

    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const safeMessages = messages.slice(-16).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 4000)
    })).filter((m) => m.content.trim());

    if (!safeMessages.length) {
      return res.status(400).json({ error: "Напиши або продиктуй запитання." });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-astra",
      instructions: teacherInstructions,
      input: safeMessages
    });

    res.json({ reply: response.output_text || "Не вдалося сформувати відповідь. Спробуй ще раз." });
  } catch (error) {
    console.error("Chat API error:", error?.message || error);
    res.status(500).json({ error: "Сталася помилка під час відповіді ШІ. Перевір налаштування сервера й повтори спробу." });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`BioTeacher AI запущено: http://localhost:${port}`);
});