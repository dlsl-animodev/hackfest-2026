type SeedSourceRecord = {
  id: string;
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  doi: string | null;
  url: string;
  journal: string;
  citationCount: number;
  affiliations: string[];
  countryCodes: string[];
  retracted?: boolean;
  predatory?: boolean;
  localReason?: string;
};

export type SeedQueryPack = {
  query: string;
  teaser: string;
  sources: SeedSourceRecord[];
};

export const PHILIPPINE_INSTITUTION_KEYWORDS = [
  "ateneo",
  "admu",
  "university of the philippines",
  "up diliman",
  "de la salle",
  "dlsu",
  "ust",
  "mindanao state university",
  "deped",
  "dost",
  "ched",
  "philippine",
  "feu",
];

export const PHILIPPINE_JOURNAL_KEYWORDS = [
  "philippine journal",
  "asia-pacific social science review",
  "the normal lights",
  "education quarterly",
  "ph",
];

export const PREDATORY_VENUE_KEYWORDS = [
  "global frontier",
  "international open research review",
  "world academy of advanced studies",
];

export const SHOWCASE_QUERIES: SeedQueryPack[] = [
  {
    query: "effects of social media on mental health of Filipino adolescents",
    teaser: "Prototype fallback pack for social media and adolescent wellbeing.",
    sources: [
      {
        id: "ph-social-1",
        title:
          "Social Media Intensity, Sleep Debt, and Anxiety Among Metro Manila Senior High Learners",
        authors: ["Mara P. Esteban", "Luis R. Ong"],
        year: 2024,
        abstract:
          "A cross-sectional study of 612 Metro Manila learners found that heavy nightly social media use was associated with shorter sleep duration and elevated anxiety scores, with stronger effects among students already reporting academic stress.",
        doi: "10.1111/vs.2024.001",
        url: "https://example.org/ph-social-1",
        journal: "Philippine Journal of Youth and Learning",
        citationCount: 19,
        affiliations: [
          "Ateneo de Manila University",
          "Department of Education Philippines",
        ],
        countryCodes: ["PH"],
        localReason: "Philippine institution affiliation and local journal match.",
      },
      {
        id: "ph-social-2",
        title:
          "Digital Belonging and Peer Support in Filipino Adolescents Using Short-Form Video Platforms",
        authors: ["Arianne Co", "Jiro F. Manansala"],
        year: 2023,
        abstract:
          "Interview and survey findings suggest that short-form video platforms can increase belonging and peer validation when use is structured around school communities, though the benefits decrease when late-night use becomes habitual.",
        doi: "10.1111/vs.2023.002",
        url: "https://example.org/ph-social-2",
        journal: "Asia-Pacific Social Science Review",
        citationCount: 24,
        affiliations: ["De La Salle University", "Far Eastern University"],
        countryCodes: ["PH"],
        localReason: "Multiple Philippine university affiliations.",
      },
      {
        id: "global-social-1",
        title:
          "Adolescent Social Media Use and Emotional Distress: A Twelve-Country Panel Analysis",
        authors: ["Emily Hsu", "David L. Moran", "Ibrahim Salim"],
        year: 2022,
        abstract:
          "Panel data across twelve countries shows that intensive passive consumption predicts modest increases in emotional distress, while active peer interaction has a weaker and more context-dependent relationship.",
        doi: "10.1111/vs.2022.003",
        url: "https://example.org/global-social-1",
        journal: "Journal of Adolescent Health Systems",
        citationCount: 118,
        affiliations: ["University of Melbourne", "King's College London"],
        countryCodes: ["AU", "GB"],
      },
      {
        id: "global-social-2",
        title:
          "When Connection Protects: Social Support Pathways in Teen Social Networking",
        authors: ["Priya Menon", "Celia Barnes"],
        year: 2021,
        abstract:
          "A meta-analysis reports that socially supportive interactions can buffer loneliness and depressive symptoms, especially in moderated school communities and among students with strong offline support.",
        doi: "10.1111/vs.2021.004",
        url: "https://example.org/global-social-2",
        journal: "Computers in Human Development",
        citationCount: 203,
        affiliations: ["University of Toronto"],
        countryCodes: ["CA"],
      },
      {
        id: "global-social-3",
        title:
          "Problematic Media Use and Self-Harm Ideation in Adolescents: A Clinical Review",
        authors: ["Julian Kerr", "Nadia Hassan"],
        year: 2019,
        abstract:
          "Clinical evidence links problematic media use with self-harm ideation through disrupted sleep, cybervictimization, and low self-regulation, while noting wide variability by setting and pre-existing conditions.",
        doi: "10.1111/vs.2019.005",
        url: "https://example.org/global-social-3",
        journal: "Child Psychiatry Review",
        citationCount: 340,
        affiliations: ["University of Edinburgh"],
        countryCodes: ["GB"],
      },
      {
        id: "flagged-social-4",
        title:
          "Universal Mood Enhancement From Unlimited Social Media Exposure in Teens",
        authors: ["R. T. Noble"],
        year: 2018,
        abstract:
          "This paper claims unlimited exposure to social media universally improves mood in teens, but provides a limited sample description and weak methodological grounding.",
        doi: "10.1111/vs.2018.006",
        url: "https://example.org/flagged-social-4",
        journal: "Global Frontier Learning Review",
        citationCount: 8,
        affiliations: ["World Academy of Advanced Studies"],
        countryCodes: ["US"],
        predatory: true,
      },
    ],
  },
  {
    query: "ai assisted learning outcomes among college students in the philippines",
    teaser: "Prototype fallback pack for AI-assisted learning outcomes.",
    sources: [
      {
        id: "ph-ai-1",
        title:
          "Generative AI as a Drafting Scaffold for Filipino College Writers",
        authors: ["Isabelle Santos", "Carlo Buenaventura"],
        year: 2024,
        abstract:
          "Students using generative AI as a drafting scaffold improved outline quality and idea coverage, but still needed instructor feedback to avoid shallow citations and unsupported claims.",
        doi: "10.1111/vs.2024.101",
        url: "https://example.org/ph-ai-1",
        journal: "Philippine Journal of Higher Education Innovation",
        citationCount: 13,
        affiliations: ["University of the Philippines Diliman"],
        countryCodes: ["PH"],
        localReason: "Philippine university affiliation and local venue match.",
      },
      {
        id: "ph-ai-2",
        title: "Faculty Guardrails for AI-Augmented Research Writing in Manila",
        authors: ["Patricia D. Flores", "Miguel Valdez"],
        year: 2023,
        abstract:
          "Faculty in Metro Manila described AI as useful for early ideation and translation support, but emphasized the need for source verification, citation checking, and transparent disclosure practices.",
        doi: "10.1111/vs.2023.102",
        url: "https://example.org/ph-ai-2",
        journal: "The Normal Lights",
        citationCount: 29,
        affiliations: ["Ateneo de Manila University", "University of Santo Tomas"],
        countryCodes: ["PH"],
        localReason: "Philippine institutions in author affiliations.",
      },
      {
        id: "global-ai-1",
        title: "Large Language Models and Student Writing Performance: A Meta-Review",
        authors: ["Hannah Chu", "Sandeep Bhatia"],
        year: 2024,
        abstract:
          "Across recent experimental studies, writing fluency improves consistently, while evidence on critical thinking gains remains mixed and highly dependent on prompt design and instructor framing.",
        doi: "10.1111/vs.2024.103",
        url: "https://example.org/global-ai-1",
        journal: "Learning Sciences Quarterly",
        citationCount: 66,
        affiliations: ["University of British Columbia"],
        countryCodes: ["CA"],
      },
      {
        id: "global-ai-2",
        title: "Automation Bias in AI-Supported Academic Search Behaviors",
        authors: ["Elena Moretti", "Jae Kim"],
        year: 2022,
        abstract:
          "Students often over-trust fluent AI summaries and miss unsupported claims unless the interface surfaces provenance, confidence, and contradictory evidence.",
        doi: "10.1111/vs.2022.104",
        url: "https://example.org/global-ai-2",
        journal: "Educational Technology & Society",
        citationCount: 141,
        affiliations: ["Seoul National University", "Bocconi University"],
        countryCodes: ["KR", "IT"],
      },
      {
        id: "flagged-ai-3",
        title: "Perfect Essay Outcomes With Zero Teacher Oversight",
        authors: ["A. R. Falcon"],
        year: 2020,
        abstract:
          "The article claims AI writing tools eliminate the need for instruction altogether, but offers vague sampling and no peer-review details.",
        doi: "10.1111/vs.2020.105",
        url: "https://example.org/flagged-ai-3",
        journal: "International Open Research Review",
        citationCount: 5,
        affiliations: ["Open Knowledge Forum"],
        countryCodes: ["US"],
        predatory: true,
      },
    ],
  },
  {
    query: "disaster preparedness and student resilience in the philippines",
    teaser: "Prototype fallback pack for resilience and disaster readiness.",
    sources: [
      {
        id: "ph-disaster-1",
        title:
          "School Preparedness Drills and Student Recovery Confidence After Typhoon Events",
        authors: ["Rafael T. Cruz", "Maria Lenor Reyes"],
        year: 2024,
        abstract:
          "Students exposed to regular community-based drills reported stronger recovery confidence and clearer evacuation routines, particularly in public schools with active LGU coordination.",
        doi: "10.1111/vs.2024.201",
        url: "https://example.org/ph-disaster-1",
        journal: "Philippine Journal of Community Resilience",
        citationCount: 17,
        affiliations: ["Mindanao State University", "Department of Science and Technology"],
        countryCodes: ["PH"],
        localReason: "Philippine public institution and agency affiliation.",
      },
      {
        id: "global-disaster-1",
        title: "Youth Resilience After Climate Disruptions: What School Systems Can Do",
        authors: ["Sofia Alvarado", "Kieran Moss"],
        year: 2021,
        abstract:
          "The review highlights social connectedness, teacher preparedness, and local adaptation planning as strong predictors of student resilience after climate shocks.",
        doi: "10.1111/vs.2021.202",
        url: "https://example.org/global-disaster-1",
        journal: "International Journal of Disaster Education",
        citationCount: 88,
        affiliations: ["University of Auckland"],
        countryCodes: ["NZ"],
      },
      {
        id: "global-disaster-2",
        title:
          "Preparedness Without Participation: Why Information Campaigns Alone Often Fail",
        authors: ["Leena Patel", "Marcus Grant"],
        year: 2019,
        abstract:
          "Information-heavy preparedness campaigns underperform when students are not involved in drills, scenario planning, or peer-led recovery routines.",
        doi: "10.1111/vs.2019.203",
        url: "https://example.org/global-disaster-2",
        journal: "Resilience Policy Review",
        citationCount: 154,
        affiliations: ["University of Cape Town"],
        countryCodes: ["ZA"],
      },
      {
        id: "flagged-disaster-3",
        title: "One Poster Campaign Solves Student Disaster Panic",
        authors: ["J. Keene"],
        year: 2017,
        abstract:
          "This article argues a single poster campaign can eliminate panic behavior during disasters, but provides no comparative data and lacks peer-reviewed sourcing.",
        doi: "10.1111/vs.2017.204",
        url: "https://example.org/flagged-disaster-3",
        journal: "World Academy of Advanced Studies Review",
        citationCount: 3,
        affiliations: ["World Academy of Advanced Studies"],
        countryCodes: ["US"],
        predatory: true,
      },
    ],
  },
];
