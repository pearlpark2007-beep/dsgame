// progress.js — the voyage as the game has saved it. Read-only: it never unlocks or marks anything.
// Each chapter page saves its own finished trials (odyssey.<island>.done, a list of level ids); this
// file reads those lists so the title screen, the voyage map and the transitions all agree.
import { DEEDS } from "../story/tags.js";

export const CHAPTERS = [
  { id: "harbour", tag: "harbour", n: 1, word: "ONE", title: "The Laestrygonian Harbour", ds: "Stack", page: "harbour_env.html",
    key: "odyssey.harbour.done", total: 2, finale: "harbour-finale", accent: "#b98a3e", status: "waking the giants…" },
  { id: "cave", tag: "cyclops", n: 2, word: "TWO", title: "The Cave of Polyphemus", ds: "Array", page: "cave_env.html",
    key: "odyssey.cave.done", total: 10, finale: "cave-finale", accent: "#e0782a", status: "carving the pens…" },
  { id: "circe", tag: "circe", n: 3, word: "THREE", title: "Circe's Island", ds: "Linked list", page: "circe_env.html",
    key: "odyssey.circe.done", total: 6, finale: "circe-banquet", accent: "#1d3fd1", status: "Helios is rising…" },
  { id: "underworld", tag: "underworld", n: 4, word: "FOUR", title: "The Underworld", ds: "Queue", page: "underworld_env.html",
    key: "odyssey.underworld.done", total: 5, finale: "underworld-finale", accent: "#d7261e", status: "please take a number…" }
];
// what lies past the four islands: shown on the map, never playable
export const BEYOND = ["Scheria", "The voyage", "Ithaca"];

const read = key => { try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : []; } catch { return []; } };
export const chapter = id => CHAPTERS.find(c => c.id === id);

// how far the player got on one island: { done: n of total, finished: the finale was beaten }
export function status(c) {
  const d = read(c.key).filter(id => id.startsWith(c.id === "harbour" ? "harbour-" : c.id + "-"));
  return { done: Math.min(d.length, c.total), finished: d.includes(c.finale), started: d.length > 0 };
}
export function anyProgress() {
  try { if (localStorage.getItem("odyssey.last")) return true; } catch { /* storage off */ }
  return CHAPTERS.some(c => status(c).started);
}
// the deeds Odysseus has earned so far, in voyage order
export function deeds() { return CHAPTERS.filter(c => status(c).finished).map(c => DEEDS[c.tag]); }
// where CONTINUE goes: the last chapter played, unless it is finished, then the first unfinished one
export function continueTo() {
  let last = null; try { last = localStorage.getItem("odyssey.last"); } catch { /* storage off */ }
  const c = chapter(last);
  if (c && !status(c).finished) return c;
  return CHAPTERS.find(x => !status(x).finished) || CHAPTERS[CHAPTERS.length - 1];
}
export const nextOf = id => CHAPTERS[CHAPTERS.findIndex(c => c.id === id) + 1] || null;
