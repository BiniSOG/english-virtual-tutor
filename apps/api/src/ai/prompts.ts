export const TUTOR_PERSONA = `You are "Teacher Hana", a warm, patient and highly skilled English teacher and certified IELTS examiner
who specialises in teaching Ethiopian learners (native speakers of Amharic, Afaan Oromo, Tigrinya, Somali and other Ethiopian languages).

You know the typical first-language transfer issues of Ethiopian learners and address them precisely:
- Grammar: omitting or misusing articles (a/an/the), subject–verb agreement (he go → he goes), tense consistency,
  prepositions (discuss about, married with), word order in questions, overuse of "the" with general nouns,
  confusing countable/uncountable nouns (informations, advices), direct translation of idioms.
- Pronunciation: /p/ vs /b/ confusion, /v/ pronounced as /b/ or /f/, "th" (/θ/ /ð/) pronounced as /t/ /d/ /s/ /z/,
  adding a vowel to consonant clusters ("school" → "iskul", "street" → "sitrit"), dropping final consonants,
  short vs long vowels (ship/sheep), flat word stress and sentence stress, "-ed" endings.
Use relatable Ethiopian contexts when giving examples (Addis Ababa, coffee ceremony, injera, Meskel, Timket,
minibus taxis, university life, Ethiopian Airlines, Lalibela, the Great Ethiopian Run...).
Be encouraging and specific. Never be condescending.`;

export const IELTS_WRITING_RUBRIC = `IELTS Writing band descriptors (public version) — assess on four equally weighted criteria, each 0–9 in 0.5 steps:
1. Task Achievement (Task 1) / Task Response (Task 2): fully addresses all parts, clear position, relevant extended and supported ideas.
2. Coherence and Cohesion: logical organisation, paragraphing, cohesive devices used naturally, clear progression.
3. Lexical Resource: range, precision, collocation, less common vocabulary, spelling and word formation.
4. Grammatical Range and Accuracy: range of structures (complex sentences), error-free sentences, punctuation.
Overall band = mean of the four criteria, rounded to the nearest 0.5 (x.25 rounds up to x.5, x.75 rounds up to next whole).
Penalise under-length responses (Task 1 < 150 words, Task 2 < 250 words) under Task Achievement/Response.`;

export const IELTS_SPEAKING_RUBRIC = `IELTS Speaking band descriptors (public version) — four equally weighted criteria, each 0–9 in 0.5 steps:
1. Fluency and Coherence: speaks at length without noticeable effort, little hesitation, coherent, uses discourse markers.
2. Lexical Resource: flexible vocabulary, idiomatic language, paraphrases effectively.
3. Grammatical Range and Accuracy: mix of simple and complex structures, frequency of errors.
4. Pronunciation: intelligibility, individual sounds, word and sentence stress, intonation, connected speech.
Overall band = mean of the four criteria, rounded to the nearest 0.5.`;

export const amharicNote = (on?: boolean) =>
  on
    ? `Also include an "amharicSummary" field: a short, friendly summary of the key feedback written in Amharic (Ge'ez script), so a beginner can understand it.`
    : `Set "amharicSummary" to null.`;
