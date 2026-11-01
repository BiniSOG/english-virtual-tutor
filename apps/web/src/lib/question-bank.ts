export const SPEAKING_BANK = {
  PART_1: [
    'Let’s talk about your hometown. Where is it? What do you like most about it? Has it changed in recent years?',
    'Do you work or are you a student? What do you enjoy about your work or studies? What would you like to change?',
    'Let’s talk about food. What is your favourite traditional dish? Do you prefer eating at home or in restaurants? Why?',
    'How do you usually spend your weekends? Did you spend weekends differently when you were a child?',
    'Let’s talk about music. What kind of music do you like? Do you prefer Ethiopian or international music? Have you ever learned an instrument?',
    'Do you use public transport? How do most people travel around your city? How could transport be improved?',
    'Let’s talk about coffee. How often do you drink coffee? Is the coffee ceremony still important for young people?',
  ],
  PART_2: [
    'Describe a traditional festival that is important in your country.\nYou should say:\n• what the festival is\n• when it takes place\n• what people do during it\nand explain why it is important to you.',
    'Describe a person who has inspired you.\nYou should say:\n• who this person is\n• how you know them\n• what they have done\nand explain why they inspire you.',
    'Describe a place in Ethiopia you would recommend to a tourist.\nYou should say:\n• where it is\n• how you know about it\n• what visitors can do there\nand explain why you would recommend it.',
    'Describe a skill you learned that was difficult at first.\nYou should say:\n• what the skill is\n• when and how you learned it\n• what problems you had\nand explain how you feel about it now.',
    'Describe a time you helped someone.\nYou should say:\n• who you helped\n• what the situation was\n• how you helped\nand explain how you felt afterwards.',
  ],
  PART_3: [
    'Why do you think traditional festivals remain popular in modern societies? Will globalisation make them less important in the future?',
    'How has technology changed the way young people in Ethiopia study? What are the advantages and disadvantages of learning online?',
    'Why do so many young people move from rural areas to big cities? What can governments do to make rural life more attractive?',
    'Do you think tourism always benefits local communities? How can a country protect its historical sites while welcoming visitors?',
    'Should university education be free for everyone? Who should pay for it — the government, families or students themselves?',
  ],
} as const;

export const WRITING_BANK = {
  TASK_2: [
    'Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. Others think that the true function of a university should be to give access to knowledge for its own sake.\n\nDiscuss both views and give your own opinion.',
    'In many countries, the number of people living in cities is growing rapidly. What problems does this cause, and what solutions can you suggest?',
    'Some people believe that learning English at a young age is essential for success in the modern world. To what extent do you agree or disagree?',
    'Many young people today spend a lot of time on social media. Do the advantages of this outweigh the disadvantages?',
    'Some people believe that protecting the environment should be the responsibility of governments, while others think individuals should take action. Discuss both views and give your opinion.',
  ],
  TASK_1: [
    'The table below shows the percentage of households with access to electricity in four regions of a country in 2005, 2015 and 2025.\n\n| Region | 2005 | 2015 | 2025 |\n|---|---|---|---|\n| Capital city | 78% | 92% | 99% |\n| North | 21% | 45% | 71% |\n| South | 18% | 39% | 66% |\n| East | 12% | 28% | 52% |\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    'The chart data below shows how students at a university travelled to campus in 2015 and 2025 (percentage of students).\n\n| Mode | 2015 | 2025 |\n|---|---|---|\n| Minibus taxi | 48% | 31% |\n| Walking | 22% | 18% |\n| Light rail | 5% | 21% |\n| Private car | 10% | 12% |\n| Bicycle / scooter | 15% | 18% |\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
  ],
  GENERAL: [
    'You recently bought a smartphone online, but it arrived damaged. Write a letter to the company. In your letter:\n• describe the problem\n• explain how it has affected you\n• say what you would like the company to do.\n\nWrite at least 150 words.',
    'A friend from abroad is planning to visit Ethiopia. Write a letter to your friend. In your letter:\n• suggest the best time to visit\n• recommend places to see\n• give advice about what to bring.\n\nWrite at least 150 words.',
  ],
} as const;

export const pick = <T,>(arr: readonly T[], not?: T): T => {
  const pool = arr.length > 1 && not !== undefined ? arr.filter((x) => x !== not) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
};
