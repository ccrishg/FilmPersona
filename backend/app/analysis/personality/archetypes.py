"""The 16 film personality archetypes, one per 4-letter code.

Letters: M/A (Mainstream/Arthouse) · L/G (Local/Global) · F/E (Faithful/Explorer)
· H/C (Enthusiast/Critic).
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Archetype:
    code: str
    name: str
    tagline: str
    description: str


_ARCHETYPES = [
    Archetype(
        code="MLFH",
        name="The Blockbuster Believer",
        tagline="Opening night, front row, no regrets.",
        description=(
            "You love cinema at its biggest and brightest. Franchises, event movies and "
            "comfort rewatches — you show up for the spectacle and you enjoy it without irony."
        ),
    ),
    Archetype(
        code="MLFC",
        name="The Studio Skeptic",
        tagline="Watches everything Hollywood makes. Forgives none of it.",
        description=(
            "Your diet is mainstream but your standards are not. You keep going back to the "
            "multiplex and keep holding it to a higher bar than the crowd does."
        ),
    ),
    Archetype(
        code="MLEH",
        name="The Genre Hopper",
        tagline="Horror Monday, rom-com Tuesday, heist movie Friday.",
        description=(
            "You treat popular cinema as a buffet and take a bit of everything, rating "
            "generously along the way. Variety is the point; pretension is not."
        ),
    ),
    Archetype(
        code="MLEC",
        name="The Multiplex Critic",
        tagline="Big screens, sharp pen.",
        description=(
            "You roam widely across popular genres but judge like a professional. You know "
            "exactly what a good studio picture looks like — and you notice when it isn't."
        ),
    ),
    Archetype(
        code="MGFH",
        name="The Global Crowd-Pleaser",
        tagline="Every country's biggest hit, one watchlist.",
        description=(
            "From Seoul thrillers to Bollywood epics, you chase the films whole nations fell "
            "in love with — and you fall in love right along with them."
        ),
    ),
    Archetype(
        code="MGFC",
        name="The Award-Season Judge",
        tagline="Sees the nominees. Disputes the winners.",
        description=(
            "You follow the big international titles that dominate the conversation, then "
            "deliver your own verdict — which frequently disagrees with the jury's."
        ),
    ),
    Archetype(
        code="MGEH",
        name="The Popcorn Polyglot",
        tagline="Subtitles on, expectations off.",
        description=(
            "You'll watch anything fun from anywhere. Genre cinema in five languages, rated "
            "with the enthusiasm of someone who just enjoys movies enormously."
        ),
    ),
    Archetype(
        code="MGEC",
        name="The Festival Tourist",
        tagline="Grand tours through world cinema's greatest hits.",
        description=(
            "You sample the celebrated films of every national cinema, with wide-ranging "
            "taste and a discerning score card."
        ),
    ),
    Archetype(
        code="ALFH",
        name="The Cult Devotee",
        tagline="Knows every frame of a film you've never heard of.",
        description=(
            "You've found your corner of cinema — small, strange and yours — and you revisit "
            "it with the devotion of a true believer."
        ),
    ),
    Archetype(
        code="ALFC",
        name="The Indie Purist",
        tagline="Small films, exacting standards.",
        description=(
            "You stick to independent cinema and hold it to the same rigor others reserve "
            "for the classics. Loyal in taste, ruthless in rating."
        ),
    ),
    Archetype(
        code="ALEH",
        name="The Hidden-Gem Hunter",
        tagline="Delighted by films with two-digit view counts.",
        description=(
            "You dig through the overlooked and the underseen, and your ratings show real "
            "affection for the finds. Every obscurity deserves a chance."
        ),
    ),
    Archetype(
        code="ALEC",
        name="The Contrarian Curator",
        tagline="If everyone loves it, it can wait.",
        description=(
            "You roam the margins of cinema with a sharp critical eye, building a taste "
            "profile that owes nothing to any algorithm or consensus."
        ),
    ),
    Archetype(
        code="AGFH",
        name="The Auteur Loyalist",
        tagline="Ride or die for a shortlist of directors.",
        description=(
            "World cinema is your home and a handful of auteurs are your family. When a "
            "favorite director releases anything, you're there — and you'll love it."
        ),
    ),
    Archetype(
        code="AGFC",
        name="The Cinephile Scholar",
        tagline="Watches canon. Cites sources.",
        description=(
            "Deep, international and demanding: you work through world cinema's essential "
            "filmographies with the seriousness of someone writing a thesis about them."
        ),
    ),
    Archetype(
        code="AGEH",
        name="The Festival Nomad",
        tagline="Lives out of a metaphorical suitcase of screeners.",
        description=(
            "You wander world cinema without a map and love what you find. Iranian dramas, "
            "Argentine slow burns, Senegalese debuts — all welcome, all rated with warmth."
        ),
    ),
    Archetype(
        code="AGEC",
        name="The World-Cinema Critic",
        tagline="The full map, the highest bar.",
        description=(
            "Maximum range, maximum rigor. You explore every corner of international "
            "arthouse cinema and score it like it's your job. Honestly, it should be."
        ),
    ),
]

ARCHETYPES: dict[str, Archetype] = {a.code: a for a in _ARCHETYPES}


def get_archetype(code: str) -> Archetype:
    return ARCHETYPES[code]
