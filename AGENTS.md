# Señor Rosa Agent Instructions

## Product

Señor Rosa is an interactive digital-first Webtoon that teaches Spanish through story-driven exploration.

The comic is the primary interface. Vocabulary words act as keys that unlock interactions and story progression.

## Core design rules

1. Adventure first. Language second.
2. Wrong answers create short side stories, not punishment.
3. Every learned word must matter to the current story.
4. Interactions should eventually exist inside the comic artwork.
5. The HUD should remain visually secondary.
6. Story content belongs in JSON, not hard-coded JavaScript.
7. The engine must remain reusable across chapters.

## Current technology

- HTML
- CSS
- Vanilla JavaScript
- JSON
- GitHub
- No framework
- No backend

## Working rules

- Make small, reviewable changes.
- Do not replace the current architecture without explaining why.
- Do not add dependencies unless explicitly approved.
- Keep code readable for a beginner developer.
- Before editing, explain the proposed change.
- After editing, summarize every file changed.
- Test the existing landing screen, hotspot, vocabulary challenge, key count, and journal.
- Never commit or push without explicit approval.

## Current milestone

Build one polished interactive Webtoon scene containing:

- one comic sequence
- one interactive hotspot
- one vocabulary reward
- one wrong-answer side quest
- return to the main story