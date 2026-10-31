import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface Persona {
  role: string;
  verdict: "SHIP" | "KILL";
  roast: string;
  fix: string;
}

export interface CrossfireDebate {
  speaker: string;
  line: string;
}

export interface RoastResponse {
  overallScore: number;
  singlePointOfFailure: string;
  flawedMermaid: string;
  healedMermaid: string;
  personas: Persona[];
  crossfireDebate: CrossfireDebate[];
  survivalChecklist: string[];
  inferenceMs?: number;
  modelUsed?: string;
}

const FALLBACK_FLAWED_MERMAID = `graph TD
  Client[Web Client] --> Gateway[API Gateway]
  Gateway --> App[Single App Server]
  App --> DB[Unindexed Database - SPOF]
  App --> ExtAPI[Direct Third-Party API]
  style DB fill:#e11d48,stroke:#fda4af,stroke-width:2px,color:#fff`;

const FALLBACK_HEALED_MERMAID = `graph TD
  Client[Web Client] --> CDN[Edge CDN / Cache]
  CDN --> Gateway[Rate-Limited Gateway]
  Gateway --> Queue[Idempotent Event Queue]
  Queue --> Workers[Stateless Worker Cluster]
  Workers --> ReplicaDB[(Replica DB Pool)]
  Workers --> FallbackAI[Cached AI Gateway with Circuit Breaker]
  style Queue fill:#059669,stroke:#6ee7b7,stroke-width:2px,color:#fff
  style FallbackAI fill:#0284c7,stroke:#7dd3fc,stroke-width:2px,color:#fff`;

const FALLBACK_ROAST: RoastResponse = {
  overallScore: 38,
  singlePointOfFailure:
    "Zero moat: It is a fragile thin wrapper around third-party APIs that any incumbent can replicate in an afternoon update.",
  flawedMermaid: FALLBACK_FLAWED_MERMAID,
  healedMermaid: FALLBACK_HEALED_MERMAID,
  personas: [
    {
      role: "The Cynical Staff Engineer",
      verdict: "KILL",
      roast:
        "Your stack looks like an accidental distributed monolith held together by optimism and unhandled promise rejections. One upstream rate limit spike will trigger a cascading thundering herd that takes down your entire session state.",
      fix: "Decouple the real-time pipeline, implement idempotent request queues with backoff, and kill the premature microservices.",
    },
    {
      role: "The Ruthless VC",
      verdict: "KILL",
      roast:
        "Your customer acquisition cost will eat your margins before you even hit double-digit weekly active users. You're pitching a cute weekend side project as an enterprise platform with zero demonstrable pricing power.",
      fix: "Pivot to an urgent B2B workflow with a verifiable ROI metric or you will burn through your runway in under three months.",
    },
    {
      role: "The Distracted First-Time User",
      verdict: "SHIP",
      roast:
        "I clicked around for six seconds, hit two modal popups, and forgot what problem you were trying to solve for me. The dark mode gradient looks cool, but I would abandon this tab the moment my Slack dinged.",
      fix: "Strip out the introductory jargon and give me one single primary CTA that delivers tangible value in under five seconds.",
    },
  ],
  crossfireDebate: [
    {
      speaker: "The Cynical Staff Engineer",
      line: "We can't ship this into production; the websocket connections will leak memory until the pod crashes every 40 minutes.",
    },
    {
      speaker: "The Ruthless VC",
      line: "Who cares if the backend is held together by duct tape? If you can't prove someone is willing to swipe a corporate credit card for it, optimal architecture is completely irrelevant.",
    },
    {
      speaker: "The Distracted First-Time User",
      line: "Wait, you two are arguing about database pods and cap tables while I still can't figure out which button actually starts the product.",
    },
  ],
  survivalChecklist: [
    "Eliminate all onboarding barriers so users reach the core 'aha!' moment within 10 seconds of landing.",
    "Add fallback graceful degradation and rate-limit buffering for all third-party AI endpoints.",
    "Clearly define a single high-pain B2B use case before building any additional vanity features.",
  ],
  inferenceMs: 120,
  modelUsed: "gemma4:e4b (Offline Fallback)",
};

const SYSTEM_PROMPT = `You are "EchoChamber", an unforgiving, hyper-critical 3-persona adversarial review board evaluating a hackathon project / startup pitch.
Your board consists of exactly three personas:
1. "The Cynical Staff Engineer" - obsessed with scalability traps, tech debt, security risks, premature optimization, and distributed systems flaws.
2. "The Ruthless VC" - obsessed with unit economics, lack of moat/defensibility, tiny TAM, weak CAC/LTV, and imminent zero-runway death.
3. "The Distracted First-Time User" - obsessed with confusing UX, cognitive overload, obscure jargon, annoying friction, and wandering attention.

Keep your evaluation razor-sharp, punchy, and concise. Be brutally direct. Keep all strings short (1-2 sentences maximum).

You MUST respond with valid JSON ONLY conforming strictly to this exact schema, with no markdown code fences, commentary, or text outside the JSON object:
{
  "overallScore": <integer between 0 and 100>,
  "singlePointOfFailure": "<string describing single fatal flaw in 1 concise sentence>",
  "flawedMermaid": "<valid Mermaid graph TD string with 4-5 nodes and alphanumeric node labels with no special characters, styling SPOF with red fill>",
  "healedMermaid": "<valid Mermaid graph TD string with 4-5 nodes showing resilient architecture>",
  "personas": [
    {
      "role": "The Cynical Staff Engineer",
      "verdict": "SHIP" or "KILL",
      "roast": "<exactly 1-2 sharp, punchy sentences>",
      "fix": "<1 concrete high-leverage technical action>"
    },
    {
      "role": "The Ruthless VC",
      "verdict": "SHIP" or "KILL",
      "roast": "<exactly 1-2 sharp, punchy sentences>",
      "fix": "<1 concrete high-leverage business action>"
    },
    {
      "role": "The Distracted First-Time User",
      "verdict": "SHIP" or "KILL",
      "roast": "<exactly 1-2 sharp, punchy sentences>",
      "fix": "<1 concrete high-leverage UX action>"
    }
  ],
  "crossfireDebate": [
    {
      "speaker": "The Cynical Staff Engineer",
      "line": "<1 short adversarial debate remark>"
    },
    {
      "speaker": "The Ruthless VC",
      "line": "<1 short counter-punch debate remark>"
    },
    {
      "speaker": "The Distracted First-Time User",
      "line": "<1 short user perspective reality check>"
    }
  ],
  "survivalChecklist": [
    "<actionable item 1>",
    "<actionable item 2>",
    "<actionable item 3>"
  ]
}`;

function stripBase64Prefix(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const clean = trimmed.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
  return clean.length > 0 ? clean : null;
}

// Safely extracts clean JSON text:
// 1. Removes <think>...</think> tags
// 2. Strips markdown fences
// 3. Isolates substring between first '{' and last '}'
function cleanJsonOutput(raw: string): string {
  if (!raw) return "";
  let text = raw.trim();
  // Strip <think>...</think> tags if any
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, "");
  text = text.replace(/\s*```$/i, "");
  // Extract substring between first '{' and last '}'
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.substring(start, end + 1).trim();
  }
  return text.trim();
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const MODEL_LABEL = "gemma4:e4b (Local Inference)";
  const FALLBACK_MODEL_LABEL = "gemma4:e4b (Offline Fallback)";

  try {
    const body = await req.json().catch(() => ({}));
    const { pitchText, imageBase64 } = body as {
      pitchText?: string;
      imageBase64?: string;
    };

    const cleanBase64 = stripBase64Prefix(imageBase64);

    const userMessage: {
      role: "user";
      content: string;
      images?: string[];
    } = {
      role: "user",
      content:
        pitchText && pitchText.trim()
          ? pitchText.trim()
          : "Review and roast my project pitch and screenshot.",
    };

    if (cleanBase64) {
      userMessage.images = [cleanBase64];
    }

    const payload = {
      model: "gemma4:e4b",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        userMessage,
      ],
      format: "json",
      stream: false,
      think: false,
      options: {
        temperature: 0.2,
        num_ctx: 2048,
        num_predict: 500,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const res = await fetch("http://127.0.0.1:11434/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const inferenceMs = Date.now() - startTime;

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        console.error(`Ollama responded with status: ${res.status}: ${errorText}`);
        return NextResponse.json(
          {
            error: `Ollama error (HTTP ${res.status}): ${errorText || "Failed to generate response"}`,
            inferenceMs,
          },
          { status: 502 }
        );
      }

      const data = await res.json();
      console.log("RAW OLLAMA:", data);

      const rawContent = data?.message?.content || data?.response || "";
      console.log("RAW OLLAMA CONTENT:", rawContent);

      if (!rawContent || typeof rawContent !== "string") {
        return NextResponse.json(
          {
            error: "Gemma 4 returned an empty message content.",
            inferenceMs,
          },
          { status: 502 }
        );
      }

      const cleanedContent = cleanJsonOutput(rawContent);
      let parsed: RoastResponse;
      try {
        parsed = JSON.parse(cleanedContent);
      } catch (parseErr: any) {
        console.error("JSON.parse failed on cleaned content:", parseErr, cleanedContent);
        return NextResponse.json(
          {
            error: `Failed to parse Gemma 4 response as JSON: ${parseErr?.message || parseErr}. Raw output: ${cleanedContent.slice(0, 300)}...`,
            rawContent,
            inferenceMs,
          },
          { status: 502 }
        );
      }

      // Validate required schema properties
      if (
        typeof parsed?.overallScore === "number" &&
        typeof parsed?.singlePointOfFailure === "string" &&
        Array.isArray(parsed?.personas) &&
        parsed.personas.length >= 3 &&
        Array.isArray(parsed?.crossfireDebate) &&
        Array.isArray(parsed?.survivalChecklist)
      ) {
        if (typeof parsed.flawedMermaid !== "string" || !parsed.flawedMermaid.trim()) {
          parsed.flawedMermaid = FALLBACK_FLAWED_MERMAID;
        }
        if (typeof parsed.healedMermaid !== "string" || !parsed.healedMermaid.trim()) {
          parsed.healedMermaid = FALLBACK_HEALED_MERMAID;
        }

        parsed.inferenceMs = inferenceMs;
        parsed.modelUsed = MODEL_LABEL;

        return NextResponse.json(parsed, { status: 200 });
      }

      return NextResponse.json(
        {
          error: "Gemma 4 response did not conform to the expected review schema.",
          rawContent,
          inferenceMs,
        },
        { status: 502 }
      );
    } catch (ollamaErr: any) {
      clearTimeout(timeoutId);
      const isTimeout = ollamaErr?.name === "AbortError";
      const isConnectionRefused =
        ollamaErr?.code === "ECONNREFUSED" ||
        ollamaErr?.cause?.code === "ECONNREFUSED" ||
        String(ollamaErr?.message).includes("fetch failed");

      console.error("Ollama request failed:", ollamaErr);

      if (isConnectionRefused) {
        return NextResponse.json(
          {
            error:
              "Local Ollama daemon is not running on http://127.0.0.1:11434. Please start it in your terminal with: ollama serve",
            code: "OLLAMA_OFFLINE",
          },
          { status: 503 }
        );
      }

      if (isTimeout) {
        return NextResponse.json(
          {
            error:
              "Gemma 4 inference timed out after 90 seconds. Please ensure Ollama is running and has sufficient CPU/RAM resources.",
            code: "INFERENCE_TIMEOUT",
          },
          { status: 504 }
        );
      }

      return NextResponse.json(
        {
          error: `Error communicating with local Gemma 4: ${ollamaErr?.message || "Unknown error"}`,
          inferenceMs: Date.now() - startTime,
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("Error processing /api/roast request:", err);
    return NextResponse.json(
      {
        error: `Server error: ${err?.message || "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
