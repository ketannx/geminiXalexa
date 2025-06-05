const express = require("express");
const bodyParser = require("body-parser");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();
const { Speech } = require("ssml-builder"); // 👈 add this line
const cron = require('./utils/cron');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
cron.start();

const app = express();
app.use(bodyParser.json());

const preprompt = `You are a helpful Alexa-like voice assistant. 
Answer briefly, clearly, and add a light funny tone or a friendly touch.
Keep the answer short, maximum 2-4 lines.`

function removeEmojis(text) {
  return text
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2011-\u26FF]|[\uD83C-\uDBFF][\uDC00-\uDFFF])/g, '')
    .replace(/[^\x00-\x7F]/g, '');
}

app.post("/alexa", async (req, res) => {
  try {
    const query = req.body.request?.intent?.slots?.query?.value;

    if (!query) {
      return res.json({
        version: "1.0",
        response: {
          outputSpeech: {
            type: "PlainText",
            text: "I didn't catch that. Can you say it again?",
          },
          shouldEndSession: false,
        },
      });
    }

    const prompt = `${preprompt}\nQuestion: ${query}\nAnswer:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const replyRaw = response.candidates?.[0]?.content?.parts?.[0]?.text || 
      "Sorry, I couldn't find an answer.";

    const reply = removeEmojis(replyRaw).trim();

    // ✅ Create SSML using ssml-builder
    const speech = new Speech();
    speech.say("Here's what I found:")
          .pause('0.5s')
          .say(reply)
          .pause('0.7s')
          .say(`By the way, your lucky number is ${Math.floor(Math.random() * 100)}!`)
          .pause('0.5s')
          .say("See you again!");

    const ssmlOutput = speech.ssml(true); // includes <speak> tags

    return res.json({
      version: "1.0",
      response: {
        outputSpeech: {
          type: "SSML",
          ssml: ssmlOutput
        },
        shouldEndSession: true,
      },
    });

  } catch (error) {
    console.error(error);
    return res.json({
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "Something went wrong while processing your request.",
        },
        shouldEndSession: true,
      },
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Alexa Gemini server running on port ${PORT}`);
});
