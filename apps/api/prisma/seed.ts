/* eslint-disable no-console */
import { PracticeType, PrismaClient, Skill } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type Q = { id: string; question: string; options?: string[]; answer: number | string; explanation?: string };
const q = (i: number, question: string, options: string[] | null, answer: number | string, explanation: string): Q => ({
  id: `q${i}`,
  question,
  ...(options ? { options } : {}),
  answer,
  explanation,
});

const LEVELS = [
  { code: 'FOUNDATION', name: 'Foundation', band: 4, cefr: 'A2', color: '#f59e0b', order: 1,
    description: 'Build the basics: everyday vocabulary, simple sentences, present and past tenses, clear pronunciation.' },
  { code: 'PRE_INTERMEDIATE', name: 'Pre-Intermediate', band: 5, cefr: 'B1', color: '#10b981', order: 2,
    description: 'Communicate in familiar situations, understand the main points of clear speech and write simple connected text.' },
  { code: 'INTERMEDIATE', name: 'Intermediate', band: 6, cefr: 'B2', color: '#3b82f6', order: 3,
    description: 'The typical university-entry target. Handle IELTS question types, express opinions and organise essays.' },
  { code: 'UPPER_INTERMEDIATE', name: 'Upper-Intermediate', band: 7, cefr: 'C1', color: '#8b5cf6', order: 4,
    description: 'Scholarship and professional level. Flexible vocabulary, complex grammar, fluent extended speech.' },
  { code: 'ADVANCED', name: 'Advanced', band: 8, cefr: 'C2', color: '#ef4444', order: 5,
    description: 'Near-native precision: nuance, idiom, sophisticated argument and flawless accuracy.' },
];

const PLANS = [
  { slug: 'monthly', name: 'Monthly', priceEtb: 299, durationDays: 30, order: 1, isPopular: false,
    description: 'Perfect to get started',
    features: ['All premium courses & lessons', 'Unlimited AI speaking & writing feedback', 'AI-generated IELTS tests', 'Progress tracking & band estimates'] },
  { slug: 'quarterly', name: '3 Months', priceEtb: 749, durationDays: 90, order: 2, isPopular: true,
    description: 'Most popular — ideal for an IELTS preparation cycle',
    features: ['Everything in Monthly', 'Save 16%', 'Full IELTS mock tests', 'Amharic explanations from the AI tutor'] },
  { slug: 'yearly', name: 'Yearly', priceEtb: 2490, durationDays: 365, order: 3, isPopular: false,
    description: 'Best value for long-term learners',
    features: ['Everything in 3 Months', 'Save 30%', 'Priority access to new courses', 'Certificate of completion'] },
];

interface LessonSeed { id: string; title: string; summary: string; content: string; audioText?: string; isFree?: boolean; durationMin?: number }
interface CourseSeed { slug: string; title: string; subtitle: string; description: string; skill: Skill; level: string; isPremium: boolean; order: number; lessons: LessonSeed[] }

const COURSES: CourseSeed[] = [
  {
    slug: 'grammar-foundations', title: 'Grammar Foundations', subtitle: 'Articles, present simple and nouns — the right way',
    description: 'Fix the three grammar areas Ethiopian learners struggle with most. Clear rules, local examples and instant practice.',
    skill: 'GRAMMAR', level: 'FOUNDATION', isPremium: false, order: 1,
    lessons: [
      { id: 'seed-lesson-articles', title: 'A, an, the — the Ethiopian learner\'s guide', summary: 'Why articles are tricky for Amharic speakers and three rules that fix 90% of mistakes.', durationMin: 12,
        content: `# A, an, the

Amharic, Afaan Oromo and Tigrinya do not use a separate word like **a/an**, and "the" is often shown with an ending (e.g. *bet → betu*, "the house"). That is why many Ethiopian learners **drop articles** in English.

## Rule 1 — a / an for one thing, mentioned for the first time
| Sound at the start | Article | Examples |
|---|---|---|
| consonant **sound** | **a** | a teacher, a university (/juː/), a minibus |
| vowel **sound** | **an** | an engineer, an hour (h is silent), an orange |

- ❌ *My sister is doctor.* → ✅ My sister is **a** doctor.
- ❌ *I live in a apartment in Bole.* → ✅ I live in **an** apartment in Bole.

## Rule 2 — the for something specific or already known
- I bought **a** book. **The** book is about Emperor Menelik II.
- **The** sun, **the** Blue Nile, **the** Red Sea (unique things / rivers / seas)

## Rule 3 — no article for general ideas
- ❌ *The coffee is important in Ethiopia.* → ✅ **Coffee** is important in Ethiopia.
- ✅ **Education** opens doors. ✅ I love **music**.

## Common mistakes for Ethiopian learners
1. Leaving out *a/an* before jobs: *He is ~~ ~~ driver* → He is **a** driver.
2. Adding *the* to general plurals: *~~The~~ students need practice.*
3. *the* with country names: Ethiopia, Kenya ✅ — but **the** United States, **the** UK.

> **IELTS tip:** Article errors are counted under *Grammatical Range & Accuracy*. Reducing them alone can lift your writing by half a band.

## Quick check
1. She wants to be ___ engineer.
2. ___ Abay (Blue Nile) starts at Lake Tana.
3. I drink ___ tea every morning.

*Answers: 1. an 2. The 3. (no article)*` },
      { id: 'seed-lesson-present-simple', title: 'Present simple & subject–verb agreement', summary: 'He go or he goes? Master the -s ending for good.', durationMin: 10,
        content: `# Present simple

We use the present simple for **habits, routines and facts**.

| Subject | Verb |
|---|---|
| I / you / we / they | **work**, **go**, **have** |
| he / she / it / my brother / Addis Ababa | **works**, **goes**, **has** |

- My father **works** at Ethiopian Airlines.
- Abebe **doesn't** drink coffee in the evening.
- **Does** your sister **study** at AAU?

## Spelling of -s
- most verbs: + **s** → plays, speaks
- -ch, -sh, -s, -x, -o: + **es** → watches, goes, does
- consonant + y: **-ies** → studies, carries

## Common mistakes for Ethiopian learners
- ❌ *She go to church every Sunday.* → ✅ She **goes**…
- ❌ *Does he likes injera?* → ✅ Does he **like** injera? (only one -s!)
- ❌ *People in Addis is friendly.* → ✅ People **are** friendly (*people* is plural).

> **IELTS tip:** In Speaking Part 1 you talk about routines — this tense appears in almost every answer. Slow down and check your **-s**.

## Quick check
1. My mother (cook) ___ shiro every Friday.
2. They (not / live) ___ in Hawassa.
3. ___ he (speak) ___ Afaan Oromo?

*Answers: 1. cooks 2. don't live 3. Does … speak*` },
      { id: 'seed-lesson-countable', title: 'Countable & uncountable nouns', summary: 'Informations? Advices? Learn which nouns never take -s.', durationMin: 8,
        content: `# Countable and uncountable nouns

**Countable** nouns can be counted: *one student, two students*.
**Uncountable** nouns cannot: *water, money, information*.

## Uncountable nouns that Ethiopian learners often pluralise
| ❌ Wrong | ✅ Right |
|---|---|
| informations | information / pieces of information |
| advices | advice / some advice / a piece of advice |
| equipments | equipment |
| furnitures | furniture |
| homeworks | homework |
| knowledges | knowledge |

## Quantifiers
- **many** + countable: *many universities*
- **much** + uncountable: *much traffic*
- **a lot of** works with both.

> **IELTS tip:** "Informations" and "advices" are classic examiner red flags. Avoid them!

## Quick check
1. Can you give me some ___ (advice)?
2. There is too ___ traffic in Mexico Square.

*Answers: 1. advice 2. much*` },
    ],
  },
  {
    slug: 'everyday-english-addis', title: 'Everyday English in Addis', subtitle: 'Vocabulary for daily life, work and travel',
    description: 'Learn the high-frequency words and phrases you need every day — greetings, food, transport, shopping and work.',
    skill: 'VOCABULARY', level: 'FOUNDATION', isPremium: false, order: 2,
    lessons: [
      { id: 'seed-lesson-greetings', title: 'Greetings & introductions', summary: 'Go beyond "I am fine, thank you".', durationMin: 8, isFree: true,
        content: `# Greetings & introductions

Many learners always answer *"I am fine, thank you, and you?"*. Native speakers use many natural alternatives.

## Saying hello
| Formal | Informal |
|---|---|
| Good morning / afternoon | Hi! / Hey! |
| How do you do? | How's it going? |
| It's a pleasure to meet you. | Nice to meet you. |

## Answering "How are you?"
- Pretty good, thanks. How about you?
- Not bad at all.
- A bit tired, actually — long day at work!

## Introducing yourself
> Hi, I'm **Selam**. I'm from **Bahir Dar**, but I live in **Addis** now. I'm **studying** economics at **Addis Ababa University**.

## Useful phrases
- *Where are you from originally?*
- *What do you do?* (= What is your job?)
- *Let me introduce you to my colleague, Dawit.*

> **IELTS tip:** In Speaking Part 1 the examiner starts with *"Can you tell me your full name?"* Answer naturally and add one extra detail.` },
      { id: 'seed-lesson-food', title: 'Food & the coffee ceremony', summary: 'Describe Ethiopian food and traditions confidently in English.', durationMin: 10,
        content: `# Food & the coffee ceremony

## Key vocabulary
| Word | Meaning |
|---|---|
| **flatbread** | thin bread — *Injera is a sour, spongy flatbread.* |
| **stew** | food cooked slowly in liquid — *doro wat is a spicy chicken stew* |
| **to roast** | to cook with dry heat — *We roast the coffee beans.* |
| **aroma** | a pleasant smell |
| **hospitality** | being friendly and generous to guests |

## Describing the coffee ceremony
> In Ethiopia, the coffee ceremony is a symbol of **hospitality**. The host first **roasts** green coffee beans, then **grinds** them by hand and **brews** the coffee in a clay pot called a *jebena*. It is usually served in **three rounds**: *abol*, *tona* and *baraka*.

## Collocations
- **have** breakfast / lunch / dinner (not *eat breakfast* in formal writing)
- **strong** coffee (not *powerful coffee*)
- **spicy** food, **a balanced** diet

> **IELTS tip:** Part 2 often asks you to describe *a traditional celebration* or *a meal you enjoyed*. Prepare this topic!` },
    ],
  },
  {
    slug: 'clear-pronunciation', title: 'Clear Pronunciation for Ethiopian Speakers', subtitle: 'P/B, V, TH and consonant clusters',
    description: 'Targeted pronunciation lessons designed for speakers of Amharic, Afaan Oromo and Tigrinya — with AI voice feedback.',
    skill: 'SPEAKING', level: 'PRE_INTERMEDIATE', isPremium: false, order: 3,
    lessons: [
      { id: 'seed-lesson-pb', title: 'P vs B and the V sound', summary: 'People, not "beople". Very, not "bery".', durationMin: 10,
        content: `# P vs B and the V sound

## /p/ vs /b/
English **/p/** is a puff of air with **no voice**. **/b/** uses your voice.

Hold a piece of paper in front of your mouth: it should move for **p**, not for **b**.

| /p/ | /b/ |
|---|---|
| **p**ark | **b**ark |
| **p**ig | **b**ig |
| **p**eople | **b**ible |

## /v/
Put your **top teeth on your bottom lip** and use your voice: *very, video, university, seven*.
- ❌ *bery* → ✅ **v**ery  ❌ *unibersity* → ✅ uni**v**ersity

## Practice sentences
1. **P**lease **p**ut the **p**a**p**ers in the **b**lue **b**ag.
2. **V**ery **v**aluable **v**isitors **v**isited Lali**b**ela.

> Use the **Speaking Studio** to record these sentences — the AI tutor will tell you exactly which sounds to fix.` },
      { id: 'seed-lesson-th', title: 'The TH sounds', summary: 'Think, this, three — without "s", "d" or "t".', durationMin: 10,
        content: `# The TH sounds /θ/ and /ð/

Many Ethiopian languages do not have these sounds, so learners replace them with **t, d, s or z**.

## How to make them
Put the **tip of your tongue between your teeth** and blow air.
- **/θ/** (no voice): **th**ink, **th**ree, ba**th**, Ethiopia (e-**th**i-o-pia)
- **/ð/** (voice): **th**is, **th**ey, mo**th**er, **th**e

## Minimal pairs
| | |
|---|---|
| **t**ree / **th**ree | **s**ink / **th**ink |
| **d**ay / **th**ey | **z**en / **th**en |

## Practice
> **Th**irty-**th**ree **th**ousand people **th**ink **th**at **th**is is **th**e best.` },
      { id: 'seed-lesson-clusters', title: 'Consonant clusters without extra vowels', summary: '"School", not "iskul". "Street", not "sitrit".', durationMin: 8,
        content: `# Consonant clusters

Ethiopian languages rarely put consonants together, so learners often add a vowel: *school → iskul*, *street → sitrit*, *program → pirogram*.

## Tip: glide, don't separate
- **sch**ool → /skuːl/ — one syllable!
- **str**eet → /striːt/
- **spr**ing, **pl**ease, **pr**ogram, **gr**eat

## Word endings
Don't drop the final consonants: as**ked** /æskt/, te**xts** /teksts/, mon**ths** /mʌnθs/.

## Practice
1. **Str**ong **st**udents **st**udy **sc**ience **sp**ecially.
2. **Pl**ease **pr**int the **pr**ogram **pr**operly.` },
    ],
  },
  {
    slug: 'ielts-listening-strategies', title: 'IELTS Listening Strategies', subtitle: 'Predict, follow and catch the answer',
    description: 'Learn the strategies for all four sections of the IELTS Listening test, with audio you can replay at different speeds.',
    skill: 'LISTENING', level: 'PRE_INTERMEDIATE', isPremium: true, order: 4,
    lessons: [
      { id: 'seed-lesson-listening-intro', title: 'How the IELTS Listening test works', summary: 'Four sections, 40 questions and what each part sounds like.', durationMin: 10, isFree: true,
        audioText: 'Good morning, and welcome to the city library. My name is Sara and I will explain how to become a member. Membership is free for students. You need to bring two things: your student identity card and a recent photograph. The library opens at eight thirty in the morning and closes at seven in the evening, Monday to Friday. On Saturdays we close earlier, at one o\'clock.',
        content: `# The IELTS Listening test

| Section | Situation | Example |
|---|---|---|
| 1 | Everyday conversation (2 people) | Booking a hotel, joining a library |
| 2 | Everyday monologue | A tour guide, a radio announcement |
| 3 | Academic conversation (2–4 people) | Students discussing an assignment |
| 4 | Academic lecture | A university lecture |

You hear each recording **once**. There are **40 questions**, about 30 minutes.

## Strategy 1 — Predict before you listen
Read the questions and guess the **type** of answer: a number, a name, a day, a noun?

## Strategy 2 — Listen for distractors
Speakers often **change their mind**: *"The class is on Tuesday… oh no, sorry, it was moved to Thursday."*

## Try it
Press **Play** on the audio panel and answer:
1. What two things do you need to bring?
2. What time does the library close on Saturdays?

*Answers: 1. a student ID card and a photograph 2. 1 o'clock*` },
      { id: 'seed-lesson-numbers', title: 'Numbers, spelling and dates', summary: 'The Section 1 skills that give you easy marks.', durationMin: 10,
        audioText: 'Okay, can I take your details? Yes, my name is Hanna Tesfaye. Could you spell your family name, please? Sure, it\'s T-E-S-F-A-Y-E. And your phone number? It\'s zero nine one one, four five, double seven, three two. Thank you. And when would you like to start the course? On the fifteenth of March, if possible.',
        content: `# Numbers, spelling and dates

## Letters that sound similar
**A / E / I**, **B / P / V**, **G / J**, **M / N** — practise the English alphabet names!

## Numbers
- **thirteen** /θɜːˈtiːn/ vs **thirty** /ˈθɜːti/ — listen for the **stress**.
- "double seven" = **77**; "oh" can mean **0**.

## Dates
You can write *15 March*, *March 15* or *15th March* — all are correct in IELTS.

## Listen
Play the audio and write: the family name, the phone number and the start date.

*Answers: TESFAYE, 0911 45 77 32, 15 March*` },
    ],
  },
  {
    slug: 'ielts-reading-mastery', title: 'IELTS Reading Mastery', subtitle: 'Skimming, scanning and True / False / Not Given',
    description: 'Finish the reading test on time with proven strategies for every question type.',
    skill: 'READING', level: 'INTERMEDIATE', isPremium: true, order: 5,
    lessons: [
      { id: 'seed-lesson-skim', title: 'Skimming and scanning', summary: 'Read 2,700 words in 60 minutes without panic.', durationMin: 12, isFree: true,
        content: `# Skimming and scanning

The Academic Reading test has **3 passages, 40 questions, 60 minutes** — no extra time to transfer answers.

## Skimming — for the main idea
Read the **title**, the **first sentence** of each paragraph and the **last paragraph**. Spend ~2 minutes.

## Scanning — for specific information
Look for **names, numbers, dates, capital letters** and **keywords** from the question. Move your eyes quickly; don't read every word.

## Paraphrase awareness
The question rarely uses the same words as the text:
| Question | Passage |
|---|---|
| *the number of visitors rose* | *tourism grew* |
| *ancient* | *dating back over 800 years* |

> **IELTS tip:** Spend no more than **20 minutes per passage**. If you're stuck, guess and move on — there is no negative marking.` },
      { id: 'seed-lesson-tfng', title: 'True / False / Not Given', summary: 'The most feared question type, finally explained.', durationMin: 12,
        content: `# True / False / Not Given

- **True** — the passage says the same thing (in different words).
- **False** — the passage says the **opposite**.
- **Not Given** — the passage does **not say** anything about it.

## Example
*Passage:* "Lalibela's rock-hewn churches were carved in the 12th and 13th centuries and are still used for worship today."

1. The churches are over 800 years old. → **True**
2. The churches are no longer used. → **False**
3. Lalibela receives more tourists than Axum. → **Not Given**

> **IELTS tip:** Don't use your own knowledge! Only the passage counts.` },
    ],
  },
  {
    slug: 'ielts-writing-task-2', title: 'IELTS Writing Task 2 Masterclass', subtitle: 'From band 5.5 to band 7+',
    description: 'Plan, structure and write high-scoring essays — then get instant band scores from the AI examiner.',
    skill: 'WRITING', level: 'INTERMEDIATE', isPremium: true, order: 6,
    lessons: [
      { id: 'seed-lesson-t2-types', title: 'The 5 Task 2 question types', summary: 'Opinion, discussion, problem–solution, advantages–disadvantages and two-part questions.', durationMin: 12, isFree: true,
        content: `# The 5 Task 2 question types

| Type | Key words | Your job |
|---|---|---|
| Opinion | *To what extent do you agree?* | Give a clear position throughout |
| Discussion | *Discuss both views and give your opinion* | Both sides + your view |
| Problem–solution | *What are the problems? How can they be solved?* | Answer both parts |
| Advantages–disadvantages | *Do the advantages outweigh…?* | Weigh and decide |
| Two-part | Two direct questions | Answer each one fully |

## Structure (4 paragraphs, 260–290 words)
1. **Introduction** — paraphrase + thesis (your answer)
2. **Body 1** — main idea + explanation + example
3. **Body 2** — main idea + explanation + example
4. **Conclusion** — restate your position

## Example thesis
> *Some people believe universities should focus on job skills. I partly agree: while employability matters, especially in a fast-growing economy like Ethiopia's, universities must also develop critical thinking.*

> **IELTS tip:** Write at least **250 words**. Under-length essays lose marks in Task Response.` },
      { id: 'seed-lesson-t2-paragraph', title: 'Building a band-7 paragraph', summary: 'PEEL: Point, Explain, Example, Link.', durationMin: 12,
        content: `# Building a band-7 body paragraph

Use **PEEL**:
1. **P**oint — a clear topic sentence
2. **E**xplain — why/how
3. **E**xample — specific, realistic
4. **L**ink — back to the question

## Model paragraph
> **The main advantage of online learning is accessibility.** Students in rural areas, who may live hours away from the nearest university, can attend courses without relocating to a city. **For instance,** a farmer's daughter in a village near Jimma could complete a diploma in accounting through her mobile phone. **Therefore,** online education can significantly reduce the gap between urban and rural opportunities.

## Cohesive devices (use naturally, not mechanically)
- Adding: *Furthermore, In addition, Moreover*
- Contrast: *However, Nevertheless, On the other hand*
- Result: *Consequently, As a result, Therefore*

Now open **Writing Studio** and try the practice task!` },
    ],
  },
  {
    slug: 'ielts-speaking-complete', title: 'IELTS Speaking: Parts 1, 2 & 3', subtitle: 'Fluent, natural answers with the AI examiner',
    description: 'Master every part of the speaking test and practise with a realistic AI examiner that listens and scores you.',
    skill: 'SPEAKING', level: 'UPPER_INTERMEDIATE', isPremium: true, order: 7,
    lessons: [
      { id: 'seed-lesson-sp-parts', title: 'Inside the speaking test', summary: 'What the examiner wants in each part.', durationMin: 10, isFree: true,
        content: `# Inside the IELTS Speaking test (11–14 minutes)

| Part | Time | What happens |
|---|---|---|
| 1 | 4–5 min | Questions about you: home, work, studies, hobbies |
| 2 | 3–4 min | Cue card: 1 min preparation, speak for up to 2 min |
| 3 | 4–5 min | Abstract discussion linked to Part 2 |

## Part 1 — extend with A-R-E
**A**nswer → **R**eason → **E**xample
> *Do you like your hometown?* — "Yes, I really do. **Dire Dawa** has a relaxed pace of life and the people are very warm. For example, neighbours often share food during holidays."

## Part 2 — use your minute well
Write **keywords** for each bullet point, not full sentences.

## Part 3 — speculate and compare
*"It's likely that…", "Compared to my parents' generation…", "One possible reason is…"*` },
      { id: 'seed-lesson-sp-fluency', title: 'Fluency without fillers', summary: 'Replace "eh… eh…" with natural thinking phrases.', durationMin: 8,
        content: `# Fluency without fillers

Pausing is natural — **silence and "eh… eh…"** are not.

## Thinking phrases
- *That's an interesting question…*
- *I've never really thought about that, but…*
- *Let me see…*
- *Off the top of my head, I'd say…*

## Linking ideas in speech
- *The thing is…*, *What I mean is…*, *On top of that…*, *Having said that…*

> Practise with the **AI Voice Tutor** in IELTS Part 3 mode — aim to speak for 30–45 seconds per answer.` },
    ],
  },
  {
    slug: 'advanced-grammar-band-8', title: 'Advanced Grammar for Band 8', subtitle: 'Inversion, mixed conditionals and nominalisation',
    description: 'The complex structures that separate band 7 from band 8 — used accurately and naturally.',
    skill: 'GRAMMAR', level: 'ADVANCED', isPremium: true, order: 8,
    lessons: [
      { id: 'seed-lesson-inversion', title: 'Inversion for emphasis', summary: 'Not only… but also, Rarely have I…, Had I known…', durationMin: 12, isFree: true,
        content: `# Inversion for emphasis

After certain negative or limiting adverbials at the start of a sentence, we **invert** the subject and auxiliary.

| Normal | Inverted |
|---|---|
| I have rarely seen such growth. | **Rarely have I seen** such growth. |
| The project not only reduced costs but also… | **Not only did the project reduce** costs, but it also… |
| If I had known, I would have applied. | **Had I known**, I would have applied. |

> **IELTS tip:** One or two well-placed inversions in an essay show range — overusing them sounds unnatural.` },
      { id: 'seed-lesson-mixed', title: 'Mixed conditionals', summary: 'Connect past causes with present results.', durationMin: 10,
        content: `# Mixed conditionals

**Past condition → present result**
> If the government **had invested** in rail earlier, Addis **would have** less traffic **now**.

**Present condition → past result**
> If I **were** more organised, I **would have finished** the report yesterday.` },
    ],
  },
];

interface PracticeSeed {
  id: string; title: string; description: string; instructions?: string; skill: Skill; type: PracticeType; level: string;
  isPremium?: boolean; passage?: string; prompt?: string; questions?: Q[]; timeLimitMin?: number; minWords?: number; lessonId?: string;
}

const PRACTICES: PracticeSeed[] = [
  {
    id: 'seed-practice-articles', title: 'Articles: a, an, the or nothing?', description: 'Eight quick questions on the most common article mistakes.',
    skill: 'GRAMMAR', type: 'MULTIPLE_CHOICE', level: 'FOUNDATION', lessonId: 'seed-lesson-articles',
    instructions: 'Choose the correct option to complete each sentence.',
    questions: [
      q(1, 'My brother is ___ engineer at Ethio Telecom.', ['a', 'an', 'the', '— (no article)'], 1, '"Engineer" starts with a vowel sound, so we use "an".'),
      q(2, '___ Abay River is also called the Blue Nile.', ['A', 'An', 'The', '— (no article)'], 2, 'Rivers take "the".'),
      q(3, 'I usually drink ___ coffee after lunch.', ['a', 'an', 'the', '— (no article)'], 3, 'Coffee in general is uncountable, so no article.'),
      q(4, 'She is studying at ___ university in Mekelle.', ['a', 'an', 'the', '— (no article)'], 0, '"University" starts with a /j/ sound (you-), so we use "a".'),
      q(5, 'We waited for ___ hour at the bus station.', ['a', 'an', 'the', '— (no article)'], 1, 'The "h" in "hour" is silent — vowel sound → "an".'),
      q(6, 'I bought a dress and a scarf. ___ dress was blue.', ['A', 'An', 'The', '— (no article)'], 2, 'Second mention of a specific thing → "the".'),
      q(7, '___ education is the key to development.', ['A', 'An', 'The', '— (no article)'], 3, 'General abstract idea → no article.'),
      q(8, 'He wants to travel to ___ United Kingdom.', ['a', 'an', 'the', '— (no article)'], 2, 'Country names with "Kingdom", "States" or "Republic" take "the".'),
    ],
  },
  {
    id: 'seed-practice-present-simple', title: 'Present simple gap-fill', description: 'Write the correct form of the verb in brackets.',
    skill: 'GRAMMAR', type: 'FILL_BLANK', level: 'FOUNDATION', lessonId: 'seed-lesson-present-simple',
    instructions: 'Type the correct present simple form of the verb in brackets.',
    questions: [
      q(1, 'My mother ____ (cook) doro wat for every holiday.', null, 'cooks', 'Third person singular → add -s.'),
      q(2, 'Tigist ____ (study) medicine at Gondar University.', null, 'studies', 'Consonant + y → -ies.'),
      q(3, 'They ____ (not / live) in Adama any more.', null, "don't live|do not live", 'Negative with they → don\'t + base verb.'),
      q(4, 'The minibus ____ (go) to Piassa every ten minutes.', null, 'goes', 'Verbs ending in -o take -es.'),
      q(5, 'People in my village ____ (be) very friendly.', null, 'are', '"People" is plural.'),
      q(6, 'Dawit ____ (watch) football every weekend.', null, 'watches', 'Verbs ending in -ch take -es.'),
    ],
  },
  {
    id: 'seed-practice-everyday-vocab', title: 'Everyday vocabulary check', description: 'Food, greetings and daily life vocabulary.',
    skill: 'VOCABULARY', type: 'MULTIPLE_CHOICE', level: 'FOUNDATION', lessonId: 'seed-lesson-food',
    instructions: 'Choose the best word or phrase.',
    questions: [
      q(1, 'Injera is a sour, spongy ___.', ['flatbread', 'cake', 'soup', 'sauce'], 0, 'Injera is a type of flatbread.'),
      q(2, 'I prefer ___ coffee in the morning — it wakes me up.', ['powerful', 'strong', 'heavy', 'hard'], 1, 'The natural collocation is "strong coffee".'),
      q(3, '"How\'s it going?" — "___"', ['I am going to work.', 'Pretty good, thanks!', 'It goes.', 'Yes, it is.'], 1, '"How\'s it going?" means "How are you?".'),
      q(4, 'Ethiopians are famous for their ___ — they always welcome guests warmly.', ['hospitality', 'hospital', 'hostility', 'hostage'], 0, 'Hospitality = friendly treatment of guests.'),
      q(5, 'Could you give me some ___ about the exam?', ['advices', 'informations', 'advice', 'an advice'], 2, '"Advice" is uncountable.'),
    ],
  },
  {
    id: 'seed-practice-listening-bole', title: 'Listening: At Bole International Airport', description: 'A Section 1 style conversation at the check-in desk.',
    skill: 'LISTENING', type: 'LISTENING', level: 'PRE_INTERMEDIATE', timeLimitMin: 10,
    instructions: 'Press play and listen to the conversation. You may replay it, but try to answer after one listening — like the real test.',
    passage: `Agent: Good evening. Welcome to Ethiopian Airlines. Where are you flying to today?
Passenger: Hello. I'm going to Nairobi, flight E T three zero eight.
Agent: Can I see your passport, please? Thank you, Mr Bekele. How many bags are you checking in?
Passenger: Just one suitcase. And I have a small backpack as hand luggage.
Agent: Fine. Your suitcase weighs twenty-three kilos, so that's within the limit. Would you like a window or an aisle seat?
Passenger: A window seat, please.
Agent: Here's your boarding pass. Your seat is fourteen A. Boarding starts at nine fifteen from gate seven. Please be at the gate thirty minutes before departure.
Passenger: Thank you. Is there a café after security?
Agent: Yes, there are several cafés near gate five. Have a pleasant flight!`,
    questions: [
      q(1, 'Where is the passenger flying to?', ['Nairobi', 'Nairobi via Djibouti', 'Lagos', 'Dubai'], 0, 'He says "I\'m going to Nairobi".'),
      q(2, 'How many bags does he check in?', ['None', 'One', 'Two', 'Three'], 1, '"Just one suitcase."'),
      q(3, 'How much does the suitcase weigh? (kilos, write a number)', null, '23|twenty-three|twenty three', 'The agent says twenty-three kilos.'),
      q(4, 'What is his seat number?', ['4A', '14A', '40A', '14E'], 1, '"Your seat is fourteen A."'),
      q(5, 'Which gate does boarding start from? (write a number)', null, '7|seven', 'Gate seven. Gate five is where the cafés are — a distractor!'),
    ],
  },
  {
    id: 'seed-practice-listening-orientation', title: 'Listening: University orientation talk', description: 'A Section 2 style monologue for new students.',
    skill: 'LISTENING', type: 'LISTENING', level: 'INTERMEDIATE', isPremium: true, timeLimitMin: 12,
    instructions: 'Listen to the talk and answer the questions.',
    passage: `Good morning everyone, and welcome to your first week at the university. I'm Dr Alemu, the student services coordinator, and I'd like to give you some practical information. First, the library. The main library is in the building opposite the science faculty, not the old library next to the cafeteria, which is now used only for postgraduate research. It is open from eight a.m. until ten p.m. on weekdays, and during the exam period it stays open until midnight. Second, the computer labs. You will need your student ID card to log in, and each student has a printing allowance of one hundred pages per semester. After that, printing costs fifty cents per page. Finally, if you are feeling stressed or homesick, our counselling service is free and confidential. You can book an appointment online or simply visit room two hundred and twelve on the second floor of the administration building.`,
    questions: [
      q(1, 'Where is the main library?', ['Next to the cafeteria', 'Opposite the science faculty', 'In the administration building', 'Next to the computer labs'], 1, 'The old library next to the cafeteria is the distractor.'),
      q(2, 'Until what time is the library open during exams?', ['8 p.m.', '10 p.m.', 'Midnight', '24 hours'], 2, '"During the exam period it stays open until midnight."'),
      q(3, 'How many free printed pages does each student get per semester? (number)', null, '100|one hundred', 'One hundred pages per semester.'),
      q(4, 'The counselling room number is ____.', null, '212|two hundred and twelve', 'Room two hundred and twelve.'),
      q(5, 'The counselling service is…', ['expensive', 'only for postgraduates', 'free and confidential', 'online only'], 2, '"Our counselling service is free and confidential."'),
    ],
  },
  {
    id: 'seed-practice-reading-coffee', title: 'Reading: The story of Ethiopian coffee', description: 'Academic reading with True / False / Not Given questions.',
    skill: 'READING', type: 'READING', level: 'INTERMEDIATE', timeLimitMin: 15, lessonId: 'seed-lesson-tfng',
    instructions: 'Read the passage and answer the questions.',
    passage: `## The story of Ethiopian coffee

According to a popular legend, coffee was discovered in the forests of Kaffa, in south-western Ethiopia, by a goat herder named Kaldi. Kaldi noticed that his goats became unusually energetic after eating the red berries of a certain shrub. Curious, he tried the berries himself and felt the same effect. While historians cannot confirm the legend, botanists agree that *Coffea arabica* originated in the highlands of Ethiopia.

From Ethiopia, coffee spread across the Red Sea to Yemen in the fifteenth century, where it was cultivated on a larger scale and traded through the port of Mocha. By the seventeenth century, coffee houses had become popular meeting places in cities such as Istanbul, Venice and London.

Today, Ethiopia is Africa's largest coffee producer, and coffee accounts for roughly a third of the country's export earnings. More than fifteen million Ethiopians depend on coffee for their livelihood, most of them smallholder farmers who grow coffee in their gardens alongside other crops. Unlike in many producing countries, a large share of the harvest — around half — is consumed domestically, reflecting the central role of the coffee ceremony in Ethiopian social life.`,
    questions: [
      q(1, 'Historians have proved that Kaldi discovered coffee.', ['True', 'False', 'Not Given'], 1, 'The passage says historians "cannot confirm the legend".'),
      q(2, 'Coffea arabica first grew in the Ethiopian highlands.', ['True', 'False', 'Not Given'], 0, '"Botanists agree that Coffea arabica originated in the highlands of Ethiopia."'),
      q(3, 'Coffee reached Yemen before it reached Europe.', ['True', 'False', 'Not Given'], 0, 'Yemen in the 15th century; Europe by the 17th.'),
      q(4, 'Kaldi sold coffee to traders from Mocha.', ['True', 'False', 'Not Given'], 2, 'The passage doesn\'t say this.'),
      q(5, 'Most Ethiopian coffee farmers work on large plantations.', ['True', 'False', 'Not Given'], 1, 'Most are "smallholder farmers".'),
      q(6, 'Approximately what fraction of Ethiopia\'s coffee is consumed in the country?', ['A quarter', 'A third', 'Half', 'Most of it'], 2, '"Around half".'),
    ],
  },
  {
    id: 'seed-practice-reading-gerd', title: 'Reading: Africa\'s renewable energy future', description: 'Upper-intermediate academic passage with inference questions.',
    skill: 'READING', type: 'READING', level: 'UPPER_INTERMEDIATE', isPremium: true, timeLimitMin: 18,
    instructions: 'Read the passage and choose the best answer.',
    passage: `## Powering a continent

Sub-Saharan Africa possesses some of the world's richest renewable energy resources, yet hundreds of millions of people still lack reliable electricity. Hydropower has historically dominated the region's clean-energy mix; Ethiopia's Grand Ethiopian Renaissance Dam (GERD), with a planned capacity of more than five gigawatts, is the largest such project on the continent.

Critics of large dams point to their environmental footprint and to the political tensions they can create over shared rivers. Moreover, as droughts become more frequent, reliance on a single source carries risks. Consequently, many energy planners now favour a diversified approach, combining hydropower with solar, wind and geothermal energy. The Great Rift Valley, which runs through Ethiopia and Kenya, is particularly promising for geothermal development, and Kenya already generates nearly half of its electricity this way.

Nevertheless, generation is only half the challenge. Without investment in transmission lines and regional grids, surplus electricity cannot reach the households and industries that need it. Analysts argue that cross-border power trade, such as Ethiopia's exports to Djibouti and Kenya, could make the entire region more resilient.`,
    questions: [
      q(1, 'What is the main idea of the passage?', ['Dams should be banned in Africa', 'Africa needs diverse renewable sources and better grids', 'Kenya produces more energy than Ethiopia', 'Solar power is the cheapest option'], 1, 'The passage argues for diversification plus transmission investment.'),
      q(2, 'According to the passage, why is depending only on hydropower risky?', ['It is too expensive', 'Droughts are becoming more common', 'It produces pollution', 'It requires foreign engineers'], 1, '"As droughts become more frequent, reliance on a single source carries risks."'),
      q(3, 'The word "diversified" in paragraph 2 is closest in meaning to…', ['varied', 'reduced', 'expensive', 'traditional'], 0, 'Diversified = varied / mixed.'),
      q(4, 'Kenya generates nearly half its electricity from geothermal energy.', ['True', 'False', 'Not Given'], 0, 'Stated directly.'),
      q(5, 'The writer believes cross-border power trade is a bad idea.', ['True', 'False', 'Not Given'], 1, 'Analysts say it "could make the region more resilient".'),
    ],
  },
  {
    id: 'seed-practice-writing-tech', title: 'Writing Task 2: Technology in education', description: 'An opinion essay — get an instant band score from the AI examiner.',
    skill: 'WRITING', type: 'WRITING', level: 'INTERMEDIATE', timeLimitMin: 40, minWords: 250, lessonId: 'seed-lesson-t2-types',
    instructions: 'Write at least 250 words. You should spend about 40 minutes on this task.',
    prompt: 'Some people believe that students learn more effectively through online courses than in traditional classrooms. Others argue that face-to-face teaching is still essential.\n\nDiscuss both views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.',
  },
  {
    id: 'seed-practice-writing-cities', title: 'Writing Task 2: Rural to urban migration', description: 'A problem–solution essay on a highly relevant Ethiopian topic.',
    skill: 'WRITING', type: 'WRITING', level: 'UPPER_INTERMEDIATE', isPremium: true, timeLimitMin: 40, minWords: 250,
    instructions: 'Write at least 250 words.',
    prompt: 'In many developing countries, large numbers of young people are moving from rural areas to cities.\n\nWhat problems does this cause? What measures could be taken to solve these problems?',
  },
  {
    id: 'seed-practice-writing-task1', title: 'Writing Task 1: Mobile money users', description: 'Describe data trends in an academic report.',
    skill: 'WRITING', type: 'WRITING', level: 'UPPER_INTERMEDIATE', isPremium: true, timeLimitMin: 20, minWords: 150,
    instructions: 'Write at least 150 words. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    prompt: 'The table below shows the number of registered mobile money users (in millions) in three East African countries in 2018, 2020, 2022 and 2024.\n\n| Country | 2018 | 2020 | 2022 | 2024 |\n|---|---|---|---|---|\n| Ethiopia | 1.2 | 6.5 | 22.0 | 48.0 |\n| Kenya | 31.6 | 36.0 | 38.5 | 41.2 |\n| Tanzania | 22.8 | 27.6 | 32.4 | 36.9 |',
  },
  {
    id: 'seed-practice-speaking-p1', title: 'Speaking Part 1: Your hometown', description: 'Answer familiar questions about where you live.',
    skill: 'SPEAKING', type: 'SPEAKING', level: 'PRE_INTERMEDIATE', timeLimitMin: 2,
    instructions: 'Press record and answer all the questions in one recording (about 1–2 minutes). Use Answer + Reason + Example.',
    prompt: 'Where is your hometown? What do you like most about it? Has it changed much since you were a child? Would you like to live there in the future?',
  },
  {
    id: 'seed-practice-speaking-p2', title: 'Speaking Part 2: A festival you enjoy', description: 'A classic cue card — perfect for Meskel, Timket or Irreecha.',
    skill: 'SPEAKING', type: 'SPEAKING', level: 'INTERMEDIATE', timeLimitMin: 3,
    instructions: 'You have 1 minute to prepare. Then speak for 1–2 minutes.',
    prompt: 'Describe a traditional festival that is important in your country.\n\nYou should say:\n• what the festival is\n• when it takes place\n• what people do during it\nand explain why it is important to you.',
  },
  {
    id: 'seed-practice-speaking-p3', title: 'Speaking Part 3: Technology and society', description: 'Abstract discussion questions for band 7+.',
    skill: 'SPEAKING', type: 'SPEAKING', level: 'UPPER_INTERMEDIATE', isPremium: true, timeLimitMin: 3,
    instructions: 'Answer the questions with extended, well-supported opinions (about 2 minutes).',
    prompt: 'How has the mobile phone changed the way people in your country communicate? Do you think older and younger generations use technology differently? What might be the negative effects of relying too much on technology?',
  },
  {
    id: 'seed-practice-advanced-grammar', title: 'Advanced structures: inversion & conditionals', description: 'Band 8 grammar under pressure.',
    skill: 'GRAMMAR', type: 'MULTIPLE_CHOICE', level: 'ADVANCED', isPremium: true, lessonId: 'seed-lesson-inversion',
    instructions: 'Choose the grammatically correct option.',
    questions: [
      q(1, '___ the scale of the problem, the ministry would have acted sooner.', ['If it realised', 'Had it realised', 'Did it realise', 'Were it realised'], 1, 'Inverted third conditional: Had + subject + past participle.'),
      q(2, 'Not only ___ the cost, but it also improved safety.', ['the new road reduced', 'reduced the new road', 'did the new road reduce', 'the new road did reduce'], 2, 'After "Not only" at the start: auxiliary + subject + verb.'),
      q(3, 'If she had accepted the scholarship, she ___ in Canada now.', ['would live', 'would be living', 'would have lived', 'will live'], 1, 'Mixed conditional: past condition → present result.'),
      q(4, 'Rarely ___ such a rapid rise in urban population.', ['we have seen', 'have we seen', 'we saw', 'saw we'], 1, 'Negative adverbial "Rarely" → inversion.'),
      q(5, 'The ___ of the new policy was delayed by budget issues.', ['implement', 'implementing', 'implementation', 'implemented'], 2, 'Nominalisation: verb → noun ("implementation").'),
    ],
  },
  {
    id: 'seed-practice-collocations', title: 'IELTS collocations', description: 'Natural word partnerships for band 7+ writing and speaking.',
    skill: 'VOCABULARY', type: 'MULTIPLE_CHOICE', level: 'UPPER_INTERMEDIATE', isPremium: true,
    instructions: 'Choose the word that forms a natural collocation.',
    questions: [
      q(1, 'The government should ___ measures to reduce unemployment.', ['do', 'make', 'take', 'put'], 2, '"Take measures" is the correct collocation.'),
      q(2, 'There has been a ___ increase in the use of mobile money.', ['strong', 'dramatic', 'big-sized', 'heavy'], 1, '"A dramatic increase" is a typical Task 1 collocation.'),
      q(3, 'Online learning can ___ the gap between urban and rural students.', ['close', 'shut', 'end', 'stop'], 0, '"Close/bridge the gap".'),
      q(4, 'Many young people ___ a strong interest in technology.', ['make', 'show', 'do', 'give'], 1, '"Show an interest".'),
      q(5, 'Tourism plays a ___ role in the economy of Lalibela.', ['heavy', 'vital', 'large', 'tall'], 1, '"Play a vital/key role".'),
    ],
  },
];

async function main() {
  console.log('🌱 Seeding Lisan database…');

  const levelIds: Record<string, string> = {};
  for (const l of LEVELS) {
    const level = await prisma.level.upsert({ where: { code: l.code }, update: {}, create: l });
    levelIds[l.code] = level.id;
  }

  for (const p of PLANS) {
    await prisma.plan.upsert({ where: { slug: p.slug }, update: {}, create: p });
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@lisan.et').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: {
      email: adminEmail,
      name: 'Lisan Admin',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(adminPassword, 10),
      levelId: levelIds.INTERMEDIATE,
    },
  });

  await prisma.user.upsert({
    where: { email: 'student@lisan.et' },
    update: {},
    create: {
      email: 'student@lisan.et',
      name: 'Selam Tesfaye',
      passwordHash: await bcrypt.hash('Student123!', 10),
      levelId: levelIds.PRE_INTERMEDIATE,
      city: 'Addis Ababa',
      targetBand: 6.5,
    },
  });

  for (const c of COURSES) {
    const { lessons, level, ...data } = c;
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...data, levelId: levelIds[level] },
    });
    for (const [i, l] of lessons.entries()) {
      await prisma.lesson.upsert({
        where: { id: l.id },
        update: {},
        create: { ...l, courseId: course.id, order: i + 1, isFree: l.isFree ?? false, durationMin: l.durationMin ?? 10 },
      });
    }
  }

  for (const p of PRACTICES) {
    const { level, questions, ...data } = p;
    await prisma.practice.upsert({
      where: { id: p.id },
      update: {},
      create: { ...data, isPremium: p.isPremium ?? false, levelId: levelIds[level], questions: (questions ?? []) as object[] },
    });
  }

  console.log(`✅ Seed complete. Admin: ${adminEmail} — demo student: student@lisan.et / Student123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
