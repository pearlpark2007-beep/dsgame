// icons.js — the game's one icon set: simple line icons, one stroke weight (1.8 on a 20-unit grid),
// drawn in currentColor so they take the colour of the button they sit in. No emoji anywhere.
//   icon("play")  -> an <svg> string
const P = {
  play: '<path d="M6 4.5v11l9-5.5z"/>',
  film: '<rect x="3" y="4" width="14" height="12" rx="1.5"/><path d="M7 4v12M13 4v12M3 8h4M3 12h4M13 8h4M13 12h4"/>',
  book: '<path d="M3 4.5c2.5-1 4.8-1 7 .8 2.2-1.8 4.5-1.8 7-.8V16c-2.5-1-4.8-1-7 .8-2.2-1.8-4.5-1.8-7-.8z"/><path d="M10 5.3v11.5"/>',
  scroll: '<path d="M5 3.5h9a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2H6"/><path d="M5 3.5a2 2 0 0 0-2 2V7h3V5.5a2 2 0 0 0-1-2zM6 17a2 2 0 0 1-2-2v-1h3v1a2 2 0 0 1-1 2zM8.5 7.5h5M8.5 10.5h5M8.5 13.5h3"/>',
  sun: '<circle cx="10" cy="10" r="3.2"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"/>',
  flask: '<path d="M8 3h4M8.5 3v5L4 15.5A1.2 1.2 0 0 0 5 17.3h10a1.2 1.2 0 0 0 1-1.8L11.5 8V3"/><path d="M6.2 12.5h7.6"/>',
  lock: '<rect x="4.5" y="9" width="11" height="8" rx="1.2"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>',
  check: '<path d="M4.5 10.5l3.5 3.5 7.5-8"/>',
  map: '<path d="M3 5.5l4.5-2 5 2 4.5-2v11l-4.5 2-5-2-4.5 2z"/><path d="M7.5 3.5v11M12.5 5.5v11"/>',
  sound: '<path d="M3.5 8v4h3l4 3.5v-11l-4 3.5z"/><path d="M13.5 7.2a4 4 0 0 1 0 5.6M15.6 5a7 7 0 0 1 0 10"/>',
  mute: '<path d="M3.5 8v4h3l4 3.5v-11l-4 3.5z"/><path d="M13.5 7.5l4 5M17.5 7.5l-4 5"/>',
  arrow: '<path d="M4 10h11M11 5.5l4.5 4.5-4.5 4.5"/>',
  shuffle: '<path d="M3 6h3.5l7 8H17M3 14h3.5l2-2.3M11.5 8.3l2-2.3H17M15 4l2 2-2 2M15 12l2 2-2 2"/>'
};
export function icon(name, { size = 16, cls = "odx-ic" } = {}) {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;
}
