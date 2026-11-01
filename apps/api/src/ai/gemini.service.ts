import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Part } from '@google/genai';
import { parseJsonLoose } from '../common/json';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

type Content = { role: 'user' | 'model'; parts: Part[] };

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private ai?: GoogleGenAI;

  constructor(private readonly config: ConfigService) {}

  get model(): string {
    return this.config.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
  }

  private client(): GoogleGenAI {
    if (this.ai) return this.ai;
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new ServiceUnavailableException('AI tutor is not configured (missing GEMINI_API_KEY)');
    const baseUrl = this.config.get<string>('GEMINI_BASE_URL'); // optional: proxy / local mock for testing
    this.ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 55_000, ...(baseUrl ? { baseUrl } : {}) } });
    return this.ai;
  }

  /** Single-turn request that must return JSON. `parts` may contain text and inline audio. */
  async json<T>(opts: { system: string; parts: Part[]; temperature?: number; fast?: boolean }): Promise<T> {
    return this.chatJson<T>({ ...opts, history: [], lastParts: opts.parts });
  }

  /**
   * Multi-turn request; the final user turn is `lastParts` (text and/or audio).
   * Gemini requires the conversation to start with a user turn and to alternate roles,
   * so history is normalised before sending.
   */
  async chatJson<T>(opts: { system: string; history: ChatTurn[]; lastParts: Part[]; temperature?: number; fast?: boolean }): Promise<T> {
    const contents: Content[] = [];
    for (const t of opts.history) {
      if (!t.text?.trim()) continue;
      const last = contents[contents.length - 1];
      if (last && last.role === t.role) last.parts.push({ text: t.text });
      else contents.push({ role: t.role, parts: [{ text: t.text }] });
    }
    if (contents[0]?.role === 'model') contents.unshift({ role: 'user', parts: [{ text: '(The lesson begins.)' }] });
    const last = contents[contents.length - 1];
    if (last?.role === 'user') last.parts.push(...opts.lastParts);
    else contents.push({ role: 'user', parts: opts.lastParts });

    // Gemini 2.5 Flash models "think" by default; turn that off for snappy live conversation.
    const thinking = opts.fast && /2\.5-flash/.test(this.model) ? { thinkingConfig: { thinkingBudget: 0 } } : {};

    let text: string | undefined;
    try {
      const res = await this.client().models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: opts.system,
          responseMimeType: 'application/json',
          temperature: opts.temperature ?? 0.4,
          ...thinking,
        },
      });
      text = res.text;
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`Gemini request failed: ${(err as Error).message}`);
      throw new BadGatewayException('The AI tutor is busy right now. Please try again in a moment.');
    }
    if (!text) throw new BadGatewayException('The AI tutor returned an empty response. Please try again.');
    try {
      return parseJsonLoose<T>(text);
    } catch {
      this.logger.warn(`Unparseable Gemini output: ${text.slice(0, 300)}`);
      throw new BadGatewayException('The AI tutor response could not be read. Please try again.');
    }
  }

  static audioPart(base64: string, mimeType: string): Part {
    const clean = base64.includes(',') ? base64.split(',').pop()! : base64;
    return { inlineData: { data: clean, mimeType: mimeType.split(';')[0] || 'audio/webm' } };
  }
}
