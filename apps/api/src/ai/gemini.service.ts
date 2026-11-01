import { Injectable, Logger, ServiceUnavailableException, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Part } from '@google/genai';
import { parseJsonLoose } from '../common/json';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

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
    this.ai = new GoogleGenAI({ apiKey });
    return this.ai;
  }

  /** Single-turn request that must return JSON. `parts` may contain text and inline audio. */
  async json<T>(opts: { system: string; parts: Part[]; temperature?: number }): Promise<T> {
    return this.chatJson<T>({ system: opts.system, history: [], lastParts: opts.parts, temperature: opts.temperature });
  }

  /** Multi-turn request; the final user turn is `lastParts` (text and/or audio). */
  async chatJson<T>(opts: { system: string; history: ChatTurn[]; lastParts: Part[]; temperature?: number }): Promise<T> {
    const contents = [
      ...opts.history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      { role: 'user', parts: opts.lastParts },
    ];
    let text: string | undefined;
    try {
      const res = await this.client().models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: opts.system,
          responseMimeType: 'application/json',
          temperature: opts.temperature ?? 0.4,
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
