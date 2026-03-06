const BASE_URL = "https://us14.abilityai.dev";
const CHAT_URL = `${BASE_URL}/api/agents/intel-marketplace-2/chat`;
const AUTH_HEADERS = {
  "Content-Type": "application/json",
  Authorization:
    "Bearer trinity_mcp_sa-ZnRklsQGjN4LZyO6ylxIts9p5ODH82CQwcRREFdo",
};

async function trinityPost(message: string): Promise<string> {
  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.response ?? json.text ?? JSON.stringify(json);
}

function tryParseJson<T>(text: string): T | null {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/) ??
                  text.match(/([\[\{][\s\S]*[\]\}])/);
    if (match) return JSON.parse(match[1]!);
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export interface Seller {
  url: string;
  name: string;
  description: string;
  skills: string[];
  credits: number;
  cost_description: string;
}

export interface LogEntry {
  timestamp: string;
  component: string;
  action: string;
  message: string;
}

export interface ChatMessage {
  role: "user" | "agent";
  text: string;
  toolUse?: string;
}

export async function fetchSellers(): Promise<Seller[]> {
  try {
    const text = await trinityPost(
      "List all available intel sellers in the marketplace. Return as a JSON array.",
    );
    return tryParseJson<Seller[]>(text) ?? [];
  } catch {
    return [];
  }
}

export async function fetchBalance(): Promise<{
  balance: Record<string, unknown>;
  budget: Record<string, unknown>;
} | null> {
  try {
    const text = await trinityPost(
      "What is my current Nevermined balance and plan status? Return as JSON.",
    );
    return tryParseJson(text);
  } catch {
    return null;
  }
}

export interface StreamCallbacks {
  onToken: (text: string) => void;
  onToolUse: (name: string) => void;
  onDone: (fullText: string) => void;
  onError: (message: string) => void;
}

export async function streamChat(
  message: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  try {
    const response = await trinityPost(message);
    callbacks.onDone(response);
  } catch (e: unknown) {
    callbacks.onError(e instanceof Error ? e.message : String(e));
  }
}

export function connectLogStream(
  _onLog: (entry: LogEntry) => void,
): () => void {
  // Stub — Trinity agent does not expose a log stream
  return () => {};
}
