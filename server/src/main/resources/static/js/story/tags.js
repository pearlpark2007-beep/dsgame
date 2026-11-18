// tags.js — Odysseus's freeze-frame name card. It opens and closes every chapter.
// The card is how the player sees him change: every challenge he overcomes is added to it,
// so the card at the end of a chapter carries one more line than the card at its start.
export const TITLES = ["King of Ithaca.", "Sacker of Troy."];

// what he did, chapter by chapter, in the order he does it
// (only the chapters that exist: future chapters are chosen structure first, so none is named here yet)
export const CHAPTERS = ["harbour", "cyclops", "circe", "underworld"];
export const DEEDS = {
  harbour:    "Got one ship out of Telepylos.",
  cyclops:    "Told the Cyclops his name was Nobody.",
  circe:      "Walked into Circe's house. Walked out with his men.",
  underworld: "Went down to the dead and came back."
};

// the card for a chapter: his titles plus every deed before it (and this chapter's, once it is done)
export function nameCard(chapter, { done = false } = {}) {
  const i = CHAPTERS.indexOf(chapter);
  const deeds = CHAPTERS.slice(0, done ? i + 1 : i).map(c => DEEDS[c]);
  return { name: "ODYSSEUS", sub: [TITLES.join(" "), ...deeds].join("<br>") };
}

// kept for pages written before nameCard: the card at the start of each chapter
export const TAGS = Object.fromEntries(CHAPTERS.map(c => [c, nameCard(c)]));
