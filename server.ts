import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const TEXT_MODEL = "gemini-4-hydrogen";
const TRANSCRIBE_MODEL = "gemini-3.5-transcribe";

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add it in the Settings > Secrets panel."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getErrorStatusAndMessage(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("GEMINI_API_KEY is not configured")) {
    return { status: 500, message: raw };
  }
  if (raw.includes("API_KEY_INVALID") || raw.includes("PERMISSION_DENIED") || raw.includes("403")) {
    return {
      status: 403,
      message:
        "Gemini API key was rejected or lacks permission. Please verify your key in Settings > Secrets.",
    };
  }
  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("429")) {
    return {
      status: 429,
      message: "Gemini API rate limit reached. Please wait a moment and try again.",
    };
  }
  return {
    status: 502,
    message: raw || "Upstream AI request failed.",
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "30mb" }));

  // 1. Generate structured AI Training Lesson
  app.post("/api/training/lesson", async (req, res) => {
    try {
      const { skillName, category, difficulty, description, learningObjectives } = req.body ?? {};
      if (!skillName) {
        return res.status(400).json({ error: "skillName is required." });
      }

      const ai = getAIClient();
      const prompt = `Create a practical, deeply engaging Public Speaking training module for the skill "${skillName}" (Category: ${category}, Difficulty: ${difficulty}).
Skill description: ${description}
Learning objectives: ${(learningObjectives || []).join("; ")}

Requirements:
1. "summary": Explain the skill in clear, plain, jargon-free language (2-3 crisp paragraphs or concise overview).
2. "techniques": 3 to 4 actionable techniques. Each has "title", "explanation" (how and why it works), and "example" (concrete spoken before/after or real-world speaking example).
3. "exercises": 2 short, 2-minute practical solo drills the learner can do right away. Each has "title", "prompt" (what to say/do), and "tip" (what to notice).
4. "comprehensionQuestions": 3 multiple-choice comprehension questions testing real understanding (not trivia), each with 4 "options", "correctIndex" (0-3), and a clear "explanation".`;

      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            "You are an expert executive speaking coach and learning designer. Keep language clear, practical, and encouraging without fluff.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              techniques: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    example: { type: Type.STRING },
                  },
                  required: ["title", "explanation", "example"],
                },
              },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    prompt: { type: Type.STRING },
                    tip: { type: Type.STRING },
                  },
                  required: ["title", "prompt", "tip"],
                },
              },
              comprehensionQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ["question", "options", "correctIndex", "explanation"],
                },
              },
            },
            required: ["summary", "techniques", "exercises", "comprehensionQuestions"],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      return res.json(parsed);
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  // 2. Fetch Verified Internet Learning Resources using Google Search Grounding
  app.post("/api/training/resources", async (req, res) => {
    try {
      const { skillName, category } = req.body ?? {};
      if (!skillName) {
        return res.status(400).json({ error: "skillName is required." });
      }

      const ai = getAIClient();

      // Step 1: Perform live Google Search grounded query
      const searchResponse = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: `Find 4 reliable, high-quality educational resources on the Internet for learning the public speaking skill "${skillName}" (${category}). Prioritize reputable sources such as Harvard Business Review, TED, Toastmasters International, Stanford, MIT, university communication centers, or established communication coaches. Summarize each resource with its title, author/organization, type (Article, Video, Guide, Course, or Research), and a 1-2 sentence description of what the learner gains.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks =
        searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const verifiedChunks: Array<{ uri: string; title: string }> = [];
      const seenUris = new Set<string>();

      for (const chunk of chunks) {
        const uri = chunk.web?.uri?.trim();
        const title = chunk.web?.title?.trim() || "Verified Web Source";
        if (uri && (uri.startsWith("https://") || uri.startsWith("http://")) && !seenUris.has(uri)) {
          seenUris.add(uri);
          verifiedChunks.push({ uri, title });
        }
      }

      if (verifiedChunks.length === 0) {
        return res.json({
          resources: [
            {
              title: `${skillName} — Verified External Sources Unavailable`,
              authorOrOrg: "Search Verification",
              sourceUrl: "",
              resourceType: "Guide",
              shortDescription:
                "No verified external links were returned by search grounding for this query. Try refreshing or practicing directly in the AI Training Room.",
              verified: false,
            },
          ],
        });
      }

      // Step 2: Structure resources strictly anchored ONLY to verified grounding URLs
      const synthesisPrompt = `Given this search-grounded research summary:
---
${searchResponse.text ?? ""}
---
And this exact list of verified grounding URLs returned by Google Search:
${verifiedChunks.map((c, idx) => `${idx + 1}. Title: "${c.title}" | URL: ${c.uri}`).join("\n")}

Produce 3 to 4 structured learning resources for "${skillName}".
CRITICAL RULES:
- Every "sourceUrl" MUST be copied character-for-character from the verified URL list above.
- Never invent, guess, or modify a URL.
- If a resource cannot be matched to one of the exact verified URLs above, leave "sourceUrl" as "" and set "verified" to false.
- Set "resourceType" to one of: "Article", "Video", "Guide", "Course", "Research".`;

      const structuredResponse = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: synthesisPrompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    authorOrOrg: { type: Type.STRING },
                    sourceUrl: { type: Type.STRING },
                    resourceType: { type: Type.STRING },
                    shortDescription: { type: Type.STRING },
                    verified: { type: Type.BOOLEAN },
                  },
                  required: [
                    "title",
                    "authorOrOrg",
                    "sourceUrl",
                    "resourceType",
                    "shortDescription",
                    "verified",
                  ],
                },
              },
            },
            required: ["resources"],
          },
        },
      });

      const parsed = JSON.parse((structuredResponse.text ?? '{"resources":[]}').trim());
      const validTypes = new Set(["Article", "Video", "Guide", "Course", "Research"]);

      const sanitizedResources = (parsed.resources || []).map(
        (item: {
          title?: string;
          authorOrOrg?: string;
          sourceUrl?: string;
          resourceType?: string;
          shortDescription?: string;
        }) => {
          const candidateUrl = (item.sourceUrl || "").trim();
          const isVerified = Boolean(candidateUrl && seenUris.has(candidateUrl));
          return {
            title: item.title || "Learning Resource",
            authorOrOrg: item.authorOrOrg || "Verified Source",
            sourceUrl: isVerified ? candidateUrl : "",
            resourceType: validTypes.has(item.resourceType || "")
              ? item.resourceType
              : "Article",
            shortDescription:
              item.shortDescription || "Curated speaking guidance from search grounding.",
            verified: isVerified,
          };
        }
      );

      // Ensure at least verified chunks appear if the model filtered everything out
      if (
        sanitizedResources.every((r: { verified: boolean }) => !r.verified) &&
        verifiedChunks.length > 0
      ) {
        const fallbackVerified = verifiedChunks.slice(0, 3).map((c) => ({
          title: c.title,
          authorOrOrg: "Web Source",
          sourceUrl: c.uri,
          resourceType: "Article",
          shortDescription: `Verified web resource related to ${skillName}.`,
          verified: true,
        }));
        return res.json({ resources: fallbackVerified });
      }

      return res.json({ resources: sanitizedResources });
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  // 3. Generate Daily Practical Challenge for a Skill
  app.post("/api/training/challenge", async (req, res) => {
    try {
      const { skillName, category, difficulty, description, dateKey } = req.body ?? {};
      if (!skillName) {
        return res.status(400).json({ error: "skillName is required." });
      }

      const ai = getAIClient();
      const prompt = `Generate one focused, practical Daily Public Speaking Challenge for the skill "${skillName}" (${category}, ${difficulty}).
Description: ${description}
Date seed: ${dateKey || new Date().toISOString().slice(0, 10)}

Requirements:
- "title": Concrete, compelling challenge title (e.g., "The 90-Second Turning Point Story").
- "instructions": Specific step-by-step instructions the user can follow solo right now while recording audio.
- "timeLimitSeconds": Realistic speaking time limit in seconds (choose 60, 90, or 120).
- "evaluationCriteria": 3 to 4 crisp criteria the AI coach will evaluate in their recording.
- "xpReward": An integer between 120 and 200 scaled by difficulty.`;

      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              instructions: { type: Type.STRING },
              timeLimitSeconds: { type: Type.INTEGER },
              evaluationCriteria: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              xpReward: { type: Type.INTEGER },
            },
            required: [
              "title",
              "instructions",
              "timeLimitSeconds",
              "evaluationCriteria",
              "xpReward",
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      return res.json(parsed);
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  // 4. Contextual AI Coach Q&A inside Training Room
  app.post("/api/training/coach", async (req, res) => {
    try {
      const { skillName, question, history } = req.body ?? {};
      if (!skillName || !question) {
        return res.status(400).json({ error: "skillName and question are required." });
      }

      const ai = getAIClient();
      const historyText = Array.isArray(history)
        ? history
            .slice(-6)
            .map((m: { role: string; text: string }) => `${m.role}: ${m.text}`)
            .join("\n")
        : "";

      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: `${historyText ? `Prior conversation:\n${historyText}\n\n` : ""}Learner question about "${skillName}": ${question}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `You are a focused Public Speaking AI Coach helping a learner master "${skillName}". Give practical, direct, encouraging answers (under 180 words) with concrete spoken examples when helpful.`,
        },
      });

      return res.json({ reply: (response.text ?? "").trim() });
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  // 5. Speech-to-Text Transcription using gemini-3.5-transcribe
  app.post("/api/practice/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body ?? {};
      if (!audioBase64 || typeof audioBase64 !== "string") {
        return res.status(400).json({ error: "audioBase64 is required." });
      }

      const cleanBase64 = audioBase64.includes(",")
        ? audioBase64.split(",")[1]
        : audioBase64;
      const baseMime = (typeof mimeType === "string" ? mimeType : "audio/webm")
        .split(";")[0]
        .trim() || "audio/webm";

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: TRANSCRIBE_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: baseMime,
                data: cleanBase64,
              },
            },
            {
              text: "Transcribe this spoken public speaking practice recording verbatim. Preserve natural filler words (such as um, uh, like, you know, basically) and pauses accurately. Return only the spoken transcript.",
            },
          ],
        },
      });

      const transcript = (response.text ?? "").trim();
      return res.json({ transcript });
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  // 6. Evidence-Based AI Performance Feedback
  app.post("/api/practice/analyze", async (req, res) => {
    try {
      const {
        skillName,
        challengeTitle,
        challengeInstructions,
        evaluationCriteria,
        transcript,
        durationSeconds,
      } = req.body ?? {};

      if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
        return res.status(400).json({ error: "A non-empty transcript is required for analysis." });
      }

      const trimmedTranscript = transcript.trim();
      const words = trimmedTranscript.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const duration = typeof durationSeconds === "number" && durationSeconds >= 3 ? durationSeconds : 0;
      const measuredWpm = duration > 0 ? Math.round((wordCount / duration) * 60) : null;

      const ai = getAIClient();
      const prompt = `Analyze this public speaking practice transcript for the skill "${skillName || "Public Speaking"}".

Challenge: ${challengeTitle || "General Speaking Practice"}
Instructions: ${challengeInstructions || "Deliver a clear, structured spoken response."}
Evaluation Criteria: ${(evaluationCriteria || []).join("; ")}
Measured Word Count: ${wordCount} words
Measured Recording Duration: ${duration > 0 ? `${duration} seconds` : "Not recorded with live timer (text-only or unknown duration)"}
Measured Speaking Pace: ${measuredWpm !== null ? `${measuredWpm} words per minute` : "Unavailable (no duration timing supplied)"}

TRANSCRIPT:
"""
${trimmedTranscript}
"""

CRITICAL INTEGRITY RULES:
1. Do NOT invent unsupported metrics, percentages, or scores.
2. For every dimension, cite an exact verbatim "evidenceQuote" from the transcript (or state if absent) and explain the "reasoning" behind your assessment.
3. For "speakingPace": Set "measuredWpm" to ${measuredWpm !== null ? measuredWpm : "null"}. If duration was unavailable, explicitly state in "assessment" and "reasoning" that true WPM pace cannot be verified without audio timing, and comment only on sentence rhythm visible in the text.
4. For "fillerWords": Count ONLY filler words/hedges actually appearing in the transcript above, list them in "detectedWords", and set "count" accurately.
5. "rating" for every dimension MUST be one of: "Needs Focus", "Developing", "Strong", "Distinctive".
6. Provide 3 to 4 concrete, transcript-grounded "suggestedImprovements".`;

      const dimensionSchema = {
        type: Type.OBJECT,
        properties: {
          rating: { type: Type.STRING },
          assessment: { type: Type.STRING },
          evidenceQuote: { type: Type.STRING },
          reasoning: { type: Type.STRING },
        },
        required: ["rating", "assessment", "evidenceQuote", "reasoning"],
      };

      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            "You are an analytical, supportive Public Speaking Coach. Every claim must be strictly anchored in evidence from the transcript and measured timing.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clarity: dimensionSchema,
              speechStructure: dimensionSchema,
              speakingPace: {
                type: Type.OBJECT,
                properties: {
                  rating: { type: Type.STRING },
                  measuredWpm: { type: Type.INTEGER, nullable: true },
                  assessment: { type: Type.STRING },
                  reasoning: { type: Type.STRING },
                },
                required: ["rating", "assessment", "reasoning"],
              },
              fillerWords: {
                type: Type.OBJECT,
                properties: {
                  rating: { type: Type.STRING },
                  count: { type: Type.INTEGER },
                  detectedWords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  assessment: { type: Type.STRING },
                  reasoning: { type: Type.STRING },
                },
                required: ["rating", "count", "detectedWords", "assessment", "reasoning"],
              },
              storytelling: dimensionSchema,
              vocabulary: dimensionSchema,
              suggestedImprovements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              overallSummary: { type: Type.STRING },
            },
            required: [
              "clarity",
              "speechStructure",
              "speakingPace",
              "fillerWords",
              "storytelling",
              "vocabulary",
              "suggestedImprovements",
              "overallSummary",
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      // Enforce true measuredWpm so the model can never fabricate one
      if (parsed.speakingPace) {
        parsed.speakingPace.measuredWpm = measuredWpm;
      }

      return res.json(parsed);
    } catch (err) {
      const { status, message } = getErrorStatusAndMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  // Vite middleware in development; static dist serving in production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SkillGacha AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
