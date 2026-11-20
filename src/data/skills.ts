import { Skill } from '../types';

export const GACHA_CREST_IMAGE = '/src/assets/images/gacha_capsule_crest_1795170322073.jpg';

export const SKILL_CATEGORIES = [
  'Narrative Craft',
  'Vocal Presence',
  'Stage Poise',
  'Dynamic Dialogue',
] as const;

export const PUBLIC_SPEAKING_SKILLS: Skill[] = [
  {
    id: 'storytelling',
    name: 'Storytelling',
    category: 'Narrative Craft',
    description:
      'Transform abstract points into memorable personal or customer narratives with tension, sensory detail, and a clear takeaway.',
    learningObjectives: [
      'Open a story in media res without lengthy preamble',
      'Build tension using a clear turning point and resolution',
      'Anchor every narrative to one explicit audience insight',
    ],
    difficulty: 'Intermediate',
    rarity: 'Rare',
    estimatedMinutes: 15,
    imageUrl: '/src/assets/images/art_narrative_craft_1795170323482.jpg',
    starterPrompt: 'Tell a meaningful personal story in 90 seconds.',
  },
  {
    id: 'voice-control',
    name: 'Voice Control',
    category: 'Vocal Presence',
    description:
      'Command pitch variation, vocal projection, strategic pausing, and breath support so every sentence lands with authority.',
    learningObjectives: [
      'Use downward inflection to end key claims decisively',
      'Place deliberate 1.5-second pauses before and after core points',
      'Vary pace and volume to contrast evidence with emotion',
    ],
    difficulty: 'Beginner',
    rarity: 'Common',
    estimatedMinutes: 12,
    imageUrl: '/src/assets/images/art_vocal_presence_1795170324060.jpg',
    starterPrompt: 'Deliver a 60-second pitch emphasizing deliberate pauses and vocal contrast.',
  },
  {
    id: 'speech-structure',
    name: 'Speech Structure',
    category: 'Dynamic Dialogue',
    description:
      'Organize ideas into crisp, scannable frameworks (Hook–Bridge–Three Pillars–Call to Action) that listeners can recall effortlessly.',
    learningObjectives: [
      'Craft an opening hook that states the audience stakes in 15 seconds',
      'Group supporting evidence into at most three distinct pillars',
      'Close with a callback to your opening line and a clear action step',
    ],
    difficulty: 'Beginner',
    rarity: 'Common',
    estimatedMinutes: 15,
    imageUrl: '/src/assets/images/art_dynamic_dialogue_1795170324325.jpg',
    starterPrompt: 'Present a 90-second talk using a three-pillar structure.',
  },
  {
    id: 'eye-contact',
    name: 'Eye Contact',
    category: 'Stage Poise',
    description:
      'Build genuine one-to-one connection across small meetings or auditoriums by holding steady, unhurried sightlines per thought.',
    learningObjectives: [
      'Hold eye contact with one listener per complete sentence or thought',
      'Sweep all room quadrants systematically without scanning nervously',
      'Anchor camera-lens focus naturally during remote presentations',
    ],
    difficulty: 'Beginner',
    rarity: 'Common',
    estimatedMinutes: 10,
    imageUrl: '/src/assets/images/art_stage_poise_1795170323364.jpg',
    starterPrompt: 'Deliver a 60-second introduction maintaining steady focal discipline.',
  },
  {
    id: 'body-language',
    name: 'Body Language',
    category: 'Stage Poise',
    description:
      'Align grounded posture, purposeful hand gestures, and stage movement with your spoken message to project calm confidence.',
    learningObjectives: [
      'Adopt a balanced neutral stance without swaying or pacing',
      'Use open-palm gestures inside the chest-to-waist power zone',
      'Move across the stage only during major topic transitions',
    ],
    difficulty: 'Intermediate',
    rarity: 'Rare',
    estimatedMinutes: 15,
    imageUrl: '/src/assets/images/art_stage_poise_1795170323364.jpg',
    starterPrompt: 'Explain a three-step concept in 90 seconds using deliberate spatial transitions.',
  },
  {
    id: 'impromptu-speaking',
    name: 'Impromptu Speaking',
    category: 'Dynamic Dialogue',
    description:
      'Think clearly on your feet under pressure using rapid mental templates like PREP (Point, Reason, Example, Point) with zero panic.',
    learningObjectives: [
      'Buy 2 seconds of poised silence before answering unexpected prompts',
      'Structure spontaneous responses with the PREP or Past–Present–Future frame',
      'Deliver a concise conclusion instead of trailing off',
    ],
    difficulty: 'Advanced',
    rarity: 'Epic',
    estimatedMinutes: 20,
    imageUrl: '/src/assets/images/art_dynamic_dialogue_1795170324325.jpg',
    starterPrompt: 'Respond to an unexpected prompt in 60 seconds using PREP.',
  },
  {
    id: 'audience-engagement',
    name: 'Audience Engagement',
    category: 'Dynamic Dialogue',
    description:
      'Turn passive listeners into active participants through calibrated rhetorical questions, audience polls, and relatable framing.',
    learningObjectives: [
      'Replace generic openers with curiosity-provoking audience prompts',
      'Read room energy and adjust pacing when attention dips',
      'Weave audience examples into your core argument smoothly',
    ],
    difficulty: 'Intermediate',
    rarity: 'Rare',
    estimatedMinutes: 15,
    imageUrl: '/src/assets/images/art_dynamic_dialogue_1795170324325.jpg',
    starterPrompt: 'Open a 90-second presentation designed to spark immediate listener curiosity.',
  },
  {
    id: 'handling-qa',
    name: 'Handling Q&A',
    category: 'Dynamic Dialogue',
    description:
      'Navigate skeptical, complex, or off-topic questions gracefully by bridging back to core themes without becoming defensive.',
    learningObjectives: [
      'Validate and reframe tough questions in one calm sentence',
      'Answer directly first before offering supporting context',
      'Bridge gracefully when a question falls outside scope',
    ],
    difficulty: 'Advanced',
    rarity: 'Epic',
    estimatedMinutes: 20,
    imageUrl: '/src/assets/images/art_dynamic_dialogue_1795170324325.jpg',
    starterPrompt: 'Address two challenging stakeholder questions concisely in 90 seconds.',
  },
  {
    id: 'persuasive-speaking',
    name: 'Persuasive Speaking',
    category: 'Narrative Craft',
    description:
      'Move an audience from passive agreement to decisive action by uniting credibility (ethos), logic (logos), and stakes (pathos).',
    learningObjectives: [
      'Frame the cost of inaction before proposing your solution',
      'Preempt the strongest counterargument with intellectual honesty',
      'Deliver a specific, low-friction call to action',
    ],
    difficulty: 'Advanced',
    rarity: 'Legendary',
    estimatedMinutes: 25,
    imageUrl: '/src/assets/images/art_narrative_craft_1795170323482.jpg',
    starterPrompt: 'Make a 2-minute persuasive case for adopting a new habit or initiative.',
  },
  {
    id: 'clear-communication',
    name: 'Clear Communication',
    category: 'Vocal Presence',
    description:
      'Distill complex ideas into crisp, jargon-free language using concrete analogies and short, high-impact sentences.',
    learningObjectives: [
      'Eliminate filler clauses and hedging qualifiers ("kind of", "sort of")',
      'Translate technical concepts into everyday analogies',
      'Lead with the bottom line before diving into supporting details',
    ],
    difficulty: 'Beginner',
    rarity: 'Common',
    estimatedMinutes: 12,
    imageUrl: '/src/assets/images/art_vocal_presence_1795170324060.jpg',
    starterPrompt: 'Explain a complex topic you know well in 60 seconds without jargon.',
  },
];
