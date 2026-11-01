import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Part } from '@google/genai';
import { Level, Prisma, PracticeType, Skill } from '@prisma/client';
import { hasPremium } from '../common/access';
import { AuthUser, PracticeQuestion } from '../common/types';
import { PREMIUM_REQUIRED } from '../content/content.service';
import { gradeQuestions, sanitizeQuestions } from '../content/grading';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminGenerateDto,
  AdminGenerateLessonDto,
  GenerateTestDto,
  SpeakingEvalDto,
  TutorChatDto,
  WritingEvalDto,
} from './ai.dto';
import { GeminiService } from './gemini.service';
import { amharicNote, IELTS_SPEAKING_RUBRIC, IELTS_WRITING_RUBRIC, TUTOR_PERSONA } from './prompts';
import { QuotaService } from './quota.service';

const json = (v: unknown) => v as Prisma.InputJsonValue;
const roundHalf = (n: number) => Math.round(n * 2) / 2;

interface Criterion {
  name: string;
  band: number;
  feedback: string;
}

export interface WritingFeedback {
  overallBand: number;
  wordCount: number;
  criteria: Criterion[];
  strengths: string[];
  improvements: string[];
  mistakes: { original: string; correction: string; explanation: string }[];
  improvedVersion: string;
  amharicSummary: string | null;
}

export interface SpeakingFeedback {
  transcript: string;
  overallBand: number;
  criteria: Criterion[];
  pronunciation: { word: string; issue: string; tip: string }[];
  grammarFixes: { original: string; correction: string; explanation: string }[];
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
  amharicSummary: string | null;
}

interface GeneratedSet {
  title: string;
  description?: string;
  instructions?: string;
  passage?: string | null;
  prompt?: string | null;
  questions: PracticeQuestion[];
}

const SCENARIOS: Record<string, string> = {
  free: 'Have a natural, friendly conversation about anything the student wants. Keep it flowing with follow-up questions.',
  ielts_part1:
    'Act as an IELTS Speaking examiner running Part 1 (introduction & interview on familiar topics: home town, work/studies, hobbies, food, daily routine). Ask one question at a time.',
  ielts_part2:
    'Act as an IELTS Speaking examiner running Part 2. Give a cue card (topic + 3-4 bullet points), tell the student they have 1 minute to prepare and should speak for 1–2 minutes, then ask one rounding-off question.',
  ielts_part3:
    'Act as an IELTS Speaking examiner running Part 3: abstract discussion questions that require opinions, comparisons and speculation. Ask one question at a time and push for extended answers.',
  job_interview: 'Role-play a job interview at an Addis Ababa company (e.g. a bank, NGO or tech start-up). You are the interviewer.',
  travel: 'Role-play travel situations: at Bole International Airport, a hotel check-in, asking for directions, ordering at a café.',
  university: 'Role-play university life: talking to a professor, a study group, presenting a project, applying for a scholarship abroad.',
};

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly quota: QuotaService,
  ) {}

  // ---------------------------------------------------------------- Writing
  async evaluateWriting(user: AuthUser, dto: WritingEvalDto) {
    let prompt = dto.prompt;
    let practiceId: string | undefined;
    let title = 'Writing evaluation';
    if (dto.practiceId) {
      const p = await this.loadPractice(dto.practiceId, user, PracticeType.WRITING);
      prompt = p.prompt ?? prompt;
      practiceId = p.id;
      title = p.title;
    }
    await this.quota.ensure(user);
    const wordCount = dto.essay.trim().split(/\s+/).filter(Boolean).length;
    const taskType = dto.taskType ?? 'TASK_2';

    const result = await this.gemini.json<WritingFeedback>({
      system: `${TUTOR_PERSONA}\n\n${IELTS_WRITING_RUBRIC}`,
      temperature: 0.2,
      parts: [
        {
          text: `Evaluate this IELTS ${taskType.replace('_', ' ')} response like a strict but kind certified examiner.

TASK PROMPT:
${prompt || '(No prompt supplied — evaluate as a general academic essay.)'}

STUDENT RESPONSE (${wordCount} words):
"""
${dto.essay}
"""

Return ONLY JSON with this exact shape:
{
  "overallBand": number,
  "wordCount": ${wordCount},
  "criteria": [
    {"name": "${taskType === 'TASK_1' ? 'Task Achievement' : 'Task Response'}", "band": number, "feedback": string},
    {"name": "Coherence & Cohesion", "band": number, "feedback": string},
    {"name": "Lexical Resource", "band": number, "feedback": string},
    {"name": "Grammatical Range & Accuracy", "band": number, "feedback": string}
  ],
  "strengths": string[2-4],
  "improvements": string[3-5]  (concrete, actionable next steps),
  "mistakes": [{"original": exact phrase from the essay, "correction": string, "explanation": short reason}] (up to 10 most important),
  "improvedVersion": a rewritten version of the response at roughly one band higher, keeping the student's ideas,
  "amharicSummary": string | null
}
${amharicNote(dto.explainInAmharic)}`,
        },
      ],
    });
    await this.quota.record(user, 'writing');
    result.wordCount = wordCount;
    result.overallBand = this.overall(result.criteria, result.overallBand);

    const attempt = await this.prisma.attempt.create({
      data: {
        userId: user.id,
        practiceId,
        kind: 'WRITING',
        skill: Skill.WRITING,
        title,
        band: result.overallBand,
        score: Math.round((result.overallBand / 9) * 100),
        answers: json({ essay: dto.essay, prompt, taskType }),
        feedback: json(result),
      },
    });
    return { attemptId: attempt.id, ...result };
  }

  // ---------------------------------------------------------------- Speaking
  async evaluateSpeaking(user: AuthUser, dto: SpeakingEvalDto) {
    let prompt = dto.prompt;
    let practiceId: string | undefined;
    let title = 'Speaking evaluation';
    if (dto.practiceId) {
      const p = await this.loadPractice(dto.practiceId, user, PracticeType.SPEAKING);
      prompt = p.prompt ?? prompt;
      practiceId = p.id;
      title = p.title;
    }
    await this.quota.ensure(user);

    const result = await this.gemini.json<SpeakingFeedback>({
      system: `${TUTOR_PERSONA}\n\n${IELTS_SPEAKING_RUBRIC}`,
      temperature: 0.2,
      parts: [
        GeminiService.audioPart(dto.audio, dto.mimeType),
        {
          text: `The attached audio is an Ethiopian student answering an IELTS Speaking ${(dto.part ?? 'FREE').replace('_', ' ')} question.
QUESTION / CUE CARD: ${prompt || '(free speaking)'}

1. Transcribe exactly what the student said (keep their grammar mistakes, mark long pauses with "…").
2. Assess using the four IELTS speaking criteria, listening carefully to pronunciation, stress and fluency.
If the audio is silent or not English, give band 0 and explain kindly in "improvements".

Return ONLY JSON:
{
  "transcript": string,
  "overallBand": number,
  "criteria": [
    {"name": "Fluency & Coherence", "band": number, "feedback": string},
    {"name": "Lexical Resource", "band": number, "feedback": string},
    {"name": "Grammatical Range & Accuracy", "band": number, "feedback": string},
    {"name": "Pronunciation", "band": number, "feedback": string}
  ],
  "pronunciation": [{"word": string, "issue": what you heard vs target (use simple respelling, e.g. "BEEP-ul" not "PEEP-ul"), "tip": how to fix it}] (up to 6),
  "grammarFixes": [{"original": string, "correction": string, "explanation": string}] (up to 6),
  "strengths": string[],
  "improvements": string[],
  "modelAnswer": a natural Band 8 answer to the same question (80-150 words),
  "amharicSummary": string | null
}
${amharicNote(dto.explainInAmharic)}`,
        },
      ],
    });
    await this.quota.record(user, 'speaking');
    result.overallBand = this.overall(result.criteria, result.overallBand);

    const attempt = await this.prisma.attempt.create({
      data: {
        userId: user.id,
        practiceId,
        kind: 'SPEAKING',
        skill: Skill.SPEAKING,
        title,
        band: result.overallBand,
        score: Math.round((result.overallBand / 9) * 100),
        answers: json({ prompt, part: dto.part, transcript: result.transcript }),
        feedback: json(result),
      },
    });
    return { attemptId: attempt.id, ...result };
  }

  // ---------------------------------------------------------------- Voice tutor chat
  async tutorChat(user: AuthUser, dto: TutorChatDto) {
    if (!dto.message && !dto.audio) throw new BadRequestException('Say or type something first');
    await this.quota.ensure(user);
    const scenario = SCENARIOS[dto.scenario ?? 'free'] ?? SCENARIOS.free;
    const me = await this.prisma.user.findUnique({ where: { id: user.id }, include: { level: true } });
    const levelText = me?.level ? `${me.level.name} (IELTS ~${me.level.band}, CEFR ${me.level.cefr})` : 'unknown';

    const parts: Part[] = [];
    if (dto.audio) parts.push(GeminiService.audioPart(dto.audio, dto.mimeType ?? 'audio/webm'));
    parts.push({
      text: dto.audio
        ? `(The student replied by voice — the audio is attached.${dto.message ? ` Browser speech recognition heard: "${dto.message}".` : ''})`
        : dto.message!,
    });

    const out = await this.gemini.chatJson<{
      transcript: string;
      reply: string;
      corrections: { original: string; corrected: string; explanation: string }[];
      pronunciationTip: string | null;
      amharicHelp: string | null;
    }>({
      system: `${TUTOR_PERSONA}

You are now in a live VOICE conversation lesson. Your replies are read aloud by text-to-speech, so:
- keep each reply short (1–3 sentences, max ~60 words), natural and spoken in style, no markdown, no emojis, no lists;
- always end with a question or prompt that keeps the student talking;
- adapt vocabulary to the student's level: ${levelText}. Student's name: ${user.name.split(' ')[0]}.
SCENARIO: ${scenario}

After each student turn, gently note up to 2 of the most important mistakes (grammar, word choice, or — if audio was provided — pronunciation).
Do NOT put corrections inside "reply"; put them in "corrections".

Return ONLY JSON:
{
  "transcript": exactly what the student said (transcribe the audio if provided, else repeat their text),
  "reply": your spoken reply,
  "corrections": [{"original": string, "corrected": string, "explanation": string}],
  "pronunciationTip": string | null,
  "amharicHelp": ${dto.explainInAmharic ? 'a short Amharic (Ge\'ez script) explanation of the correction or your question, to help a beginner' : 'null'}
}`,
      history: dto.history,
      lastParts: parts,
      temperature: 0.7,
    });
    await this.quota.record(user, 'chat');
    return out;
  }

  // ---------------------------------------------------------------- AI generated tests
  async generateTest(user: AuthUser, dto: GenerateTestDto) {
    const mode = dto.mode ?? 'SKILL';
    if (mode === 'SKILL' && (dto.skill === Skill.WRITING || dto.skill === Skill.SPEAKING)) {
      throw new BadRequestException('Use the Writing or Speaking studio for productive skills');
    }
    const levels = await this.prisma.level.findMany({ orderBy: { order: 'asc' } });
    const level =
      levels.find((l) => l.code === dto.levelCode) ??
      levels.find((l) => l.id === user.levelId) ??
      levels[0];
    const count = dto.count ?? (mode === 'LEVEL_CHECK' ? 15 : 10);
    await this.quota.ensure(user);

    const set = await this.generateSet({
      skill: mode === 'LEVEL_CHECK' ? Skill.GRAMMAR : dto.skill,
      type: dto.skill === Skill.LISTENING ? PracticeType.LISTENING : dto.skill === Skill.READING ? PracticeType.READING : PracticeType.MULTIPLE_CHOICE,
      level,
      count,
      topic: dto.topic,
      levelCheck: mode === 'LEVEL_CHECK' ? levels : undefined,
    });

    await this.quota.record(user, 'test');
    const attempt = await this.prisma.attempt.create({
      data: {
        userId: user.id,
        kind: 'AI_TEST',
        skill: mode === 'LEVEL_CHECK' ? Skill.GRAMMAR : dto.skill,
        title: mode === 'LEVEL_CHECK' ? 'AI Level Check' : set.title,
        completed: false,
        payload: json({ ...set, mode, levelId: level?.id }),
      },
    });
    return {
      attemptId: attempt.id,
      mode,
      skill: attempt.skill,
      title: attempt.title,
      instructions: set.instructions,
      passage: set.passage ?? null,
      level,
      questions: sanitizeQuestions(set.questions),
    };
  }

  async submitTest(user: AuthUser, attemptId: string, answers: Record<string, number | string>) {
    const attempt = await this.prisma.attempt.findFirst({ where: { id: attemptId, userId: user.id, kind: 'AI_TEST' } });
    if (!attempt) throw new NotFoundException('Test not found');
    if (attempt.completed) throw new BadRequestException('This test has already been submitted');
    const payload = attempt.payload as unknown as GeneratedSet & { mode: string };
    const graded = gradeQuestions(payload.questions, answers);

    let estimatedBand: number | null = null;
    let suggestedLevel: Level | null = null;
    if (payload.mode === 'LEVEL_CHECK') {
      estimatedBand = this.estimateBand(graded.results);
      const levels = await this.prisma.level.findMany({ orderBy: { band: 'asc' } });
      suggestedLevel = [...levels].reverse().find((l) => l.band <= estimatedBand!) ?? levels[0] ?? null;
    }

    await this.prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        completed: true,
        score: graded.score,
        band: estimatedBand ?? graded.band,
        answers: json(answers),
        feedback: json(graded.results),
      },
    });
    return { ...graded, passage: payload.passage ?? null, estimatedBand, suggestedLevel };
  }

  private estimateBand(results: { band?: number; correct: boolean }[]): number {
    const groups = new Map<number, { c: number; t: number }>();
    for (const r of results) {
      const b = r.band ?? 5;
      const g = groups.get(b) ?? { c: 0, t: 0 };
      g.t++;
      if (r.correct) g.c++;
      groups.set(b, g);
    }
    let est = 3.5;
    for (const b of [...groups.keys()].sort((a, z) => a - z)) {
      const g = groups.get(b)!;
      if (g.c / g.t >= 0.5) est = b;
      else break;
    }
    return est;
  }

  // ---------------------------------------------------------------- Admin content generation
  async adminGeneratePractice(user: AuthUser, dto: AdminGenerateDto) {
    const level = await this.prisma.level.findUnique({ where: { id: dto.levelId } });
    if (!level) throw new BadRequestException('Unknown level');
    const set = await this.generateSet({ skill: dto.skill, type: dto.type, level, count: dto.count ?? 8, topic: dto.topic });
    return { ...set, skill: dto.skill, type: dto.type, levelId: level.id };
  }

  async adminGenerateLesson(dto: AdminGenerateLessonDto) {
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId }, include: { level: true } });
    if (!course) throw new NotFoundException('Course not found');
    return this.gemini.json<{ title: string; summary: string; content: string; audioText: string | null; durationMin: number }>({
      system: TUTOR_PERSONA,
      temperature: 0.6,
      parts: [
        {
          text: `Write a complete, engaging ${course.skill.toLowerCase()} lesson for the course "${course.title}"
at level ${course.level.name} (IELTS ~${course.level.band}, CEFR ${course.level.cefr}). Lesson topic: "${dto.topic}".

The "content" field must be Markdown with: a short intro, clear explanation with ## headings, tables where helpful,
many example sentences set in Ethiopian contexts, a "Common mistakes for Ethiopian learners" section,
an "IELTS tip" callout (as a > blockquote), and a short "Quick check" with 3 questions (answers at the end).
${course.skill === 'LISTENING' ? 'Also write "audioText": a 150–250 word natural monologue or dialogue for the listening section.' : 'Set "audioText" to null.'}

Return ONLY JSON: {"title": string, "summary": string (1 sentence), "content": string (markdown), "audioText": string|null, "durationMin": number}`,
        },
      ],
    });
  }

  // ---------------------------------------------------------------- helpers
  private async generateSet(opts: {
    skill: Skill;
    type: PracticeType;
    level?: Level;
    count: number;
    topic?: string;
    levelCheck?: Level[];
  }): Promise<GeneratedSet> {
    const { skill, type, level, count, topic, levelCheck } = opts;
    const levelText = level ? `${level.name} (IELTS band ~${level.band}, CEFR ${level.cefr})` : 'intermediate';
    let spec: string;
    if (levelCheck) {
      const bands = levelCheck.map((l) => l.band).join(', ');
      spec = `Create a ${count}-question English placement test mixing grammar, vocabulary and short reading items.
Spread the questions evenly across these IELTS band levels: ${bands} (easiest first). Set each question's "band" to its target level.
All questions are multiple choice with 4 options.`;
    } else if (type === PracticeType.WRITING) {
      spec = `Create one IELTS-style writing task suitable for ${levelText}. Put the full task in "prompt"
(for Academic Task 1 describe the chart/data in words since no image is available). Return "questions": [].`;
    } else if (type === PracticeType.SPEAKING) {
      spec = `Create one IELTS-style speaking task suitable for ${levelText}: either a Part 2 cue card (topic + "You should say:" bullet points)
or a set of 3–4 Part 1/Part 3 questions. Put it in "prompt". Return "questions": [].`;
    } else if (type === PracticeType.LISTENING) {
      spec = `Create an IELTS-style listening exercise for ${levelText}. Write "passage": a natural ${level && level.band >= 6.5 ? '250–350' : '150–220'} word
script (a dialogue with speaker labels like "Speaker A:" or a monologue) that will be read aloud by text-to-speech.
Then ${count} questions answerable only by listening: mostly multiple choice (4 options), plus some short gap-fill (no options, answer max 3 words).`;
    } else if (type === PracticeType.READING) {
      spec = `Create an IELTS-style reading exercise for ${levelText}. Write "passage": an engaging ${level && level.band >= 6.5 ? '350–500' : '200–300'} word text.
Then ${count} questions: multiple choice (4 options) and some True/False/Not Given (options ["True","False","Not Given"]).`;
    } else if (type === PracticeType.FILL_BLANK) {
      spec = `Create ${count} ${skill.toLowerCase()} gap-fill questions for ${levelText}. Each "question" contains "____" for the gap.
No options. "answer" is the correct word(s); separate acceptable alternatives with "|".`;
    } else {
      spec = `Create ${count} ${skill.toLowerCase()} multiple-choice questions (4 options each) for ${levelText}, testing a range of points.`;
    }

    const set = await this.gemini.json<GeneratedSet>({
      system: TUTOR_PERSONA,
      temperature: 0.8,
      parts: [
        {
          text: `${spec}
${topic ? `Topic / focus: ${topic}.` : 'Choose a varied, interesting topic relevant to young Ethiopian adults.'}
Use clear, unambiguous items with exactly one correct answer. Explanations must be short and teach the rule.

Return ONLY JSON:
{
  "title": string,
  "description": string (one sentence),
  "instructions": string,
  "passage": string | null,
  "prompt": string | null,
  "questions": [{"id": "q1", "question": string, "options": string[] (omit for gap-fill), "answer": number (0-based option index) or string (gap-fill), "explanation": string, "band": number}]
}`,
        },
      ],
    });
    set.questions = (set.questions ?? []).map((q, i) => ({
      ...q,
      id: `q${i + 1}`,
      answer: Array.isArray(q.options) && q.options.length ? Number(q.answer) : String(q.answer),
    }));
    return set;
  }

  private overall(criteria: Criterion[], fallback: number): number {
    if (!Array.isArray(criteria) || criteria.length === 0) return roundHalf(Number(fallback) || 0);
    const avg = criteria.reduce((s, c) => s + (Number(c.band) || 0), 0) / criteria.length;
    // IELTS rounding: truncate to quarter band, then .25 -> .5 and .75 -> next whole band
    const quarter = Math.floor(avg * 4 + 1e-9) / 4;
    return Math.ceil(quarter * 2) / 2;
  }

  private async loadPractice(id: string, user: AuthUser, type: PracticeType) {
    const p = await this.prisma.practice.findUnique({ where: { id } });
    if (!p || !p.isPublished || p.type !== type) throw new NotFoundException('Practice not found');
    if (p.isPremium && !hasPremium(user)) throw new ForbiddenException(PREMIUM_REQUIRED);
    return p;
  }
}
