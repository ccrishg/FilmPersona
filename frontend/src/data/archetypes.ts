// Mirror of the 16 codes in backend/app/analysis/personality/archetypes.py
// (code + name + tagline only — full descriptions stay in the real profile).

export interface ArchetypeSummary {
  code: string;
  name: string;
  tagline: string;
}

export const ARCHETYPES: ArchetypeSummary[] = [
  {
    code: "MLFH",
    name: "The Blockbuster Believer",
    tagline: "Opening night, front row, no regrets.",
  },
  {
    code: "MLFC",
    name: "The Studio Skeptic",
    tagline: "Watches everything Hollywood makes. Forgives none of it.",
  },
  {
    code: "MLEH",
    name: "The Genre Hopper",
    tagline: "Horror Monday, rom-com Tuesday, heist movie Friday.",
  },
  {
    code: "MLEC",
    name: "The Multiplex Critic",
    tagline: "Big screens, sharp pen.",
  },
  {
    code: "MGFH",
    name: "The Global Crowd-Pleaser",
    tagline: "Every country's biggest hit, one watchlist.",
  },
  {
    code: "MGFC",
    name: "The Award-Season Judge",
    tagline: "Sees the nominees. Disputes the winners.",
  },
  {
    code: "MGEH",
    name: "The Popcorn Polyglot",
    tagline: "Subtitles on, expectations off.",
  },
  {
    code: "MGEC",
    name: "The Festival Tourist",
    tagline: "Grand tours through world cinema's greatest hits.",
  },
  {
    code: "ALFH",
    name: "The Cult Devotee",
    tagline: "Knows every frame of a film you've never heard of.",
  },
  {
    code: "ALFC",
    name: "The Indie Purist",
    tagline: "Small films, exacting standards.",
  },
  {
    code: "ALEH",
    name: "The Hidden-Gem Hunter",
    tagline: "Delighted by films with two-digit view counts.",
  },
  {
    code: "ALEC",
    name: "The Contrarian Curator",
    tagline: "If everyone loves it, it can wait.",
  },
  {
    code: "AGFH",
    name: "The Auteur Loyalist",
    tagline: "Ride or die for a shortlist of directors.",
  },
  {
    code: "AGFC",
    name: "The Cinephile Scholar",
    tagline: "Watches canon. Cites sources.",
  },
  {
    code: "AGEH",
    name: "The Festival Nomad",
    tagline: "Lives out of a metaphorical suitcase of screeners.",
  },
  {
    code: "AGEC",
    name: "The World-Cinema Critic",
    tagline: "The full map, the highest bar.",
  },
];
