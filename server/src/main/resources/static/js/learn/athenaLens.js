// athenaLens.js — Athena's guide to the code, for the Circe lessons.
// Instead of the whole program in an editor, it shows ONLY the function that is running (or Athena's
// calling line), and under every line of C its meaning in plain English. The line running now is lit
// and its meaning is printed large. The whole program is still in Athena's Codex tab.
//
// Why: learners following a visualizer lose the thread when the whole program is in front of them,
// and they need the meaning of a line, not just where the highlight is (see Saraiya et al. 2004,
// Guo 2013, CrossCode 2023 in the project notes).

// what each line of the course's program means (comments are stripped before the lookup)
const SAY = {
  "struct Node *newNode = (struct Node*)malloc(sizeof(struct Node));": "Ask for memory for one new pig. newNode holds its address.",
  "if (newNode == NULL) {": "Did the memory request fail? (it never does here)",
  "printf(\"Memory allocation failed\\n\");": "Report the failure.",
  "exit(1);": "Stop the program.",
  "newNode->data = value;": "Write the value into the new pig's data box.",
  "newNode->next = NULL;": "Its next rope goes nowhere yet: NULL.",
  "return newNode;": "Hand the new pig's address back to whoever asked.",
  "struct Node *newNode = createNode(value);": "Make a new pig holding value (createNode runs now).",
  "newNode->next = head;": "Tie the new pig's rope to the old first pig.",
  "if (head == NULL) return newNode;": "Empty rope? Then the new pig is the whole rope.",
  "struct Node *temp = head;": "temp starts at the first pig (it points where head points).",
  "while (temp->next != NULL)": "Keep going while the pig after temp exists...",
  "temp = temp->next;": "Step temp forward to the next pig.",
  "temp->next = newNode;": "Tie temp's rope to the new pig.",
  "return head;": "Hand the (maybe new) first pig back to the caller.",
  "if (pos < 1) {": "Is the position impossible (below 1)?",
  "printf(\"Invalid position\\n\");": "Say so.",
  "if (pos == 1) return insertAtBeginning(head, value);": "Position 1 is the front: insert at the beginning instead.",
  "for (int i = 1; i < pos - 1 && temp != NULL; i++)": "Walk temp forward until it stands on the pig BEFORE the spot.",
  "if (temp == NULL) {": "Did temp walk off the end of the rope?",
  "printf(\"Position out of range\\n\");": "Then the position is past the end: say so.",
  "newNode->next = temp->next;": "First: the new pig's rope goes to the pig after temp.",
  "struct Node *temp;": "Make a pointer called temp (it points nowhere yet).",
  "while (head != NULL) {": "Keep going while head is still on a pig...",
  "temp = head;": "temp holds on to the first pig.",
  "head = head->next;": "head moves on to the second pig.",
  "free(temp);": "The pig temp holds is freed: its memory goes back.",
  "printf(\"Entire list deleted\\n\");": "Report that the rope is gone.",
  "return NULL;": "Hand back NULL: there is no first pig any more.",
  "if (head == NULL) {": "Is the rope empty?",
  "printf(\"List is empty\\n\");": "Then say so.",
  "if (head->next == NULL) {": "Is there only one pig?",
  "free(head);": "Free that only pig.",
  "while (temp->next->next != NULL)": "Walk until temp is on the second-to-last pig...",
  "free(temp->next);": "Free the last pig.",
  "temp->next = NULL;": "temp is the last pig now: its rope ends (NULL).",
  "if (head->data == value) {": "Is the value in the very first pig?",
  "while (temp->next != NULL && temp->next->data != value)": "Walk until the NEXT pig holds the value (or the rope ends)...",
  "if (temp->next == NULL) {": "Reached the end without finding it?",
  "printf(\"Element %d not found\\n\", value);": "Then the value isn't on the rope: say so.",
  "struct Node *toDelete = temp->next;": "toDelete points at the pig to remove (the one after temp).",
  "temp->next = toDelete->next;": "temp's rope skips over it, to the pig after.",
  "free(toDelete);": "Free the removed pig.",
  "return;": "Done: go back.",
  "while (temp != NULL) {": "Keep going while temp is on a pig...",
  "printf(\"%d -> \", temp->data);": "Print this pig's number and an arrow.",
  "printf(\"NULL\\n\");": "Print NULL at the end of the rope.",
  "int pos = 1;": "pos counts which pig we're on, starting at 1.",
  "if (temp->data == key) return pos;": "Found the key? Hand back its position.",
  "pos++;": "Count one more pig.",
  "return -1;": "Not on the rope: hand back -1.",
  // Athena's calling lines
  "struct Node *p = createNode(42);": "Athena calls createNode(42). p keeps the new pig's address.",
  "head = insertAtBeginning(head, 22);": "Athena calls it with 22, and stores the answer back in head.",
  "insertAtBeginning(head, 22);": "Athena calls it, but throws the answer away: head is never updated.",
  "head = insertAtEnd(head, 22);": "Athena calls it with 22, and stores the answer in head.",
  "head = insertAtPosition(head, 22, 3);": "Athena calls it: put 22 at position 3; store the answer in head.",
  "head = deleteList(head);": "Athena calls it, and stores the answer (NULL) in head.",
  "head = deleteFirst(head);": "Athena calls it, and stores the new first pig in head.",
  "deleteFirst(head);": "Athena calls it, but throws the answer away: head still points at the freed pig.",
  "display(head);": "Athena calls display: print the whole rope.",
  "head = deleteLast(head);": "Athena calls it, and stores the answer in head.",
  "head = deleteElement(head, 3);": "Athena calls it: remove the pig holding 3; store the answer in head.",
  "int pos = search(head, 19);": "Athena calls search for 19. pos gets the answer.",
  "if (pos == -1) printf(\"19 not found\\n\");": "-1 means not found: say so.",
  "else printf(\"19 found at position %d\\n\", pos);": "Otherwise print where it was found.",
};
const strip = l => l.replace(/\/\*.*?\*\//g, "").trim();
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function meaning(line) {
  const s = strip(line);
  if (SAY[s]) return SAY[s];
  // a function's first line: name what it takes
  const sig = s.match(/^(?:struct Node\s*\*|int|void)\s*(\w+)\s*\(([^)]*)\)\s*\{$/);
  if (sig) return `${sig[1]}() starts. It is given: ${sig[2].replace(/struct Node \*/g, "").trim() || "nothing"}.`;
  return "";
}

const NULLV = 0;
const hexv = a => (a === NULLV || a == null ? "NULL" : "0x" + Number(a).toString(16).toUpperCase());
// a line of C with every known name wrapped in its colour and a bubble holding its value
export function liveTokens(line, frame, colorOf) {
  const src = strip(line);
  const vals = { ...(frame ? frame.vars : {}), ...(frame ? Object.fromEntries(Object.entries(frame.ptrs).map(([k, v]) => [k, hexv(v)])) : {}) };
  return src.split(/(\b[A-Za-z_]\w*\b)/).map((t, i) => {
    if (i % 2 === 0) return esc(t);
    if (t in vals && !/^(int|struct|return|if|while|for|NULL|free|printf|malloc|sizeof|exit|void|else)$/.test(t)) {
      const c = colorOf ? colorOf(t) : "#f2c230";
      return `<span class="am-tk" style="--c:${c}">${esc(t)}<i>${esc(vals[t])}</i></span>`;
    }
    return /^(int|struct|return|if|while|for|void|else)$/.test(t) ? `<b class="am-kw">${t}</b>` : esc(t);
  }).join("");
}


// split a lesson's program into blocks: each function (with its comment line), and Athena's calling lines
function blocks(code) {
  const L = code.split("\n"), out = [];
  let i = 0, lastEnd = -1;
  while (i < L.length) {
    const s = L[i];
    const isSig = /^\S.*\)\s*\{\s*$/.test(s);
    if (isSig) {
      const start = i > 0 && /^\/\*/.test(L[i - 1]) ? i - 1 : i;
      let j = i + 1; while (j < L.length && L[j] !== "}") j++;
      const name = (s.match(/(\w+)\s*\(/) || [])[1] || "";
      out.push({ name, from: start + 1, to: Math.min(j, L.length - 1) + 1 });
      lastEnd = j; i = j + 1; continue;
    }
    i++;
  }
  const driverFrom = lastEnd + 2;
  if (driverFrom <= L.length) out.push({ name: "", driver: true, from: driverFrom, to: L.length });
  return { L, out };
}

const CSS = `
#trial-panel .lens { display: none; flex: 0 1 auto; min-height: 170px; max-height: clamp(220px, 46vh, 520px); overflow-y: auto; border: 1px solid #2f2116; background: #0a0705; border-radius: 3px; padding: 8px 0 10px; }
#trial-panel.lensing .lens { display: block; }
#trial-panel.lensing .editor { display: none; }
#trial-panel .lens .lh { position: sticky; top: -8px; z-index: 1; background: #0a0705; padding: 8px 14px 8px; font: 700 11px 'Courier Prime', monospace; letter-spacing: 2px; color: #c9a227; text-transform: uppercase; border-bottom: 1px solid #2f2116; margin-bottom: 4px; }
#trial-panel .lens .lh b { color: #f2c230; font-size: 14px; letter-spacing: 1px; text-transform: none; }
#trial-panel .lens .lh .from { display: block; margin-top: 4px; color: #8a7a5a; letter-spacing: 0; text-transform: none; font-weight: 400; font-size: 12px; }
#trial-panel .lens .ln { display: grid; grid-template-columns: 30px 1fr; padding: 3px 14px 3px 0; border-left: 4px solid transparent; }
#trial-panel .lens .ln .n { color: #4d4030; font: 12px 'Courier Prime', monospace; text-align: right; padding-right: 8px; padding-top: 1px; }
#trial-panel .lens .ln code { color: #d8ccb4; font: 14px/1.35 'Courier Prime', monospace; white-space: pre-wrap; }
#trial-panel .lens .ln .m { grid-column: 2; color: #9a8a6a; font: italic 12.5px/1.35 'Courier Prime', monospace; margin-top: 1px; }
#trial-panel .lens .ln.cm code { color: #7a6a4a; font-style: italic; }
#trial-panel .lens .ln.now { background: #2a1f0c; border-left-color: #f2c230; }
#trial-panel .lens .ln.now code { color: #fff6dc; font-weight: 700; }
#trial-panel .lens .ln.now .m { color: #f2c230; font-size: 15px; font-style: normal; font-weight: 700; }
#trial-panel .lens .ln.done code { color: #a89878; }
#trial-panel .lens .ln.err { background: #3a0c08; border-left-color: #e0442a; }
#trial-panel .lens .chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; text-transform: none; letter-spacing: 0; }
#trial-panel .lens .chip { background: #1a130a; border: 2px solid var(--c); color: var(--c); padding: 1px 7px; border-radius: 10px; font: 700 12px 'Courier Prime', monospace; }
#trial-panel .lens .chip b { color: #fff6dc; }
#trial-panel .lens .chip.hot { background: var(--c); color: #120c06; animation: lens-pulse .6s ease 2; }
#trial-panel .lens .chip.hot b { color: #120c06; }
#trial-panel .lens .ln.now { animation: lens-glow 1.4s ease-in-out infinite; }
#trial-panel .lens .ln.now code { padding-top: 12px; }
#trial-panel .lens .am-tk i { font-size: 10px; }
@keyframes lens-pulse { 50% { transform: scale(1.15); } }
@keyframes lens-glow { 50% { background: #3a2a0e; box-shadow: inset 0 0 18px rgba(242,194,48,.25); } }
`;
export class AthenaLens {
  constructor(panel) {
    if (!document.getElementById("athena-lens-css")) { const s = document.createElement("style"); s.id = "athena-lens-css"; s.textContent = CSS; document.head.appendChild(s); }
    this.panel = panel;
    this.el = document.createElement("div"); this.el.className = "lens"; this.el.setAttribute("aria-live", "polite");
    panel.querySelector(".editor").after(this.el);
    this.code = ""; this.lesson = null; this.cur = null; this.frame = null; this.colorOf = null;
  }
  lineText(n) { return this.parsed ? this.parsed.L[n - 1] || "" : ""; }
  live(frame, colorOf) { this.frame = frame; this.colorOf = colorOf; }
  on(yes) { this.panel.classList.toggle("lensing", !!yes); }
  load(code, lesson) { this.code = code; this.lesson = lesson; this.cur = null; this.parsed = blocks(code); this.show(0); }
  // show the block holding `line` (0: the lesson's own function, before anything runs)
  show(line, err = false) {
    if (!this.parsed) return;
    const { L, out } = this.parsed;
    let b = line ? out.find(x => line >= x.from && line <= x.to) : null;
    if (!b) b = out.find(x => this.lesson && x.name === this.lesson.id) || out[out.length - 1];
    if (!b) return;
    const driver = out.find(x => x.driver);
    const call = driver ? L.slice(driver.from - 1, driver.to).map(strip).filter(Boolean).join("  ") : "";
    const head = b.driver
      ? `ATHENA'S LINES <span class="from">the call that starts it all</span>`
      : `NOW RUNNING <b>${esc(b.name)}()</b>${call ? `<span class="from">called by: ${esc(call)}</span>` : ""}`;
    let chips = "";
    if (this.frame && line) {
      const f = this.frame, all = [...Object.entries(f.ptrs).map(([k, v]) => [k, hexv(v)]), ...Object.entries(f.vars || {})];
      chips = `<div class="chips">` + all.map(([k, v]) => `<span class="chip${f.changed === k ? " hot" : ""}" style="--c:${this.colorOf ? this.colorOf(k) : "#f2c230"}">${esc(k)} <b>${esc(v)}</b></span>`).join("") + `</div>`;
    }
    let html = `<div class="lh">${head}${chips}</div>`;
    for (let n = b.from; n <= b.to; n++) {
      const raw = L[n - 1] ?? "", s = raw.trim();
      if (!s) continue;
      const isComment = /^\/\*.*\*\/$/.test(s), m = isComment ? "" : meaning(raw);
      const cls = ["ln", isComment ? "cm" : "", n === line ? (err ? "err now" : "now") : ""].join(" ");
      const indent = (raw.match(/^\s*/) || [""])[0].replace(/ {4}/g, "  ");
      const body = n === line && this.frame ? indent + liveTokens(raw, this.frame, this.colorOf) : esc(raw.replace(/^ {4}/, "  "));
      html += `<div class="${cls}" data-n="${n}"><span class="n">${n}</span><code>${body}</code>${m ? `<span class="m">${esc(m)}</span>` : ""}</div>`;
    }
    this.el.innerHTML = html;
    const now = this.el.querySelector(".now");
    if (now) { const lh = this.el.querySelector(".lh"), top = now.offsetTop - (lh ? lh.offsetHeight : 0) - 12; this.el.scrollTop = Math.max(0, top); }   // the running line sits right under the header
    else this.el.scrollTop = 0;
  }
}
