// circeLessons.js — Athena's lesson: the ten operations of the course's linked-list program, each one
// run EXACTLY as written (linkedListProgram.js) on the sty, line by line. Java runs the real C: the
// functions, malloc, free, printf. Each lesson: which functions it needs, the rope it starts on,
// Athena's lines that call it, what she says, the one thing to watch, and (some) the classic mistake.
import { FULL, STRUCT, FN, MAIN, program } from "../../learn/linkedListProgram.js";

const FIVE = [7, 12, 3, 19, 5];

export const LESSONS = [
  { id: "createNode", n: 1, name: "Create a node", fns: ["createNode"], chain: [],
    driver: `/* Athena: make one pig. p keeps its address. */\nstruct Node *p = createNode(42);\n`,
    say: "<code>malloc</code> asks memory for room for one node (16 bytes) and hands back its <b>address</b>. createNode writes the value into <code>data</code>, NULL into <code>next</code>, and returns the address. The pig is not on any rope yet: only <code>p</code> knows where it is.",
    how: ["malloc gives an address, like 0x1A0. That number is the node's name from now on.", "newNode->data = value: the number on the pig.", "newNode->next = NULL: its rope is loose.", "return newNode: the caller gets the address, not the pig."],
    watch: "If malloc returns NULL there is no memory left: the program prints a message and exits." },

  { id: "insertAtBeginning", n: 2, name: "Insert at the beginning", fns: ["createNode", "insertAtBeginning"], chain: FIVE,
    driver: `/* Athena: a new pig in front, and keep what comes back */\nhead = insertAtBeginning(head, 22);\n`,
    say: "The new pig's <code>next</code> takes the old head. The function returns the new pig, and <code>head = ...</code> makes it the first. Two moves and no walking: it costs the same for 5 pigs or 5 million.",
    how: ["createNode(22): a new pig, next = NULL.", "newNode->next = head: the new pig ropes to the old first pig.", "return newNode: the new first pig.", "head = ...: the caller keeps it."],
    watch: "Keep what it returns. Inside the function, head is only a COPY: changing it changes nothing outside.",
    mistake: { label: "Forget head = ...", driver: `/* the mistake: the answer is thrown away */\ninsertAtBeginning(head, 22);\n`,
      say: "The function did its job, but its answer was thrown away. head still points at 7, and the new pig is tied to the rope with nothing pointing at IT: unreachable, lost for good (a memory leak)." } },

  { id: "insertAtEnd", n: 3, name: "Insert at the end", fns: ["createNode", "insertAtEnd"], chain: FIVE,
    driver: `head = insertAtEnd(head, 22);\n`,
    say: "<code>temp</code> starts at head and walks while <code>temp->next != NULL</code>. It stops <b>on</b> the last pig, not after it, so it can tie the last pig's next to the new one.",
    how: ["Empty list? The new pig IS the list: return it.", "temp = head.", "while (temp->next != NULL) temp = temp->next: stop on the last pig.", "temp->next = newNode: tie the tail to the new pig.", "return head: the first pig did not change."],
    watch: "while (temp != NULL) would walk one step too far: temp would be NULL and temp->next would crash." },

  { id: "insertAtPosition", n: 4, name: "Insert at a position", fns: ["createNode", "insertAtBeginning", "insertAtPosition"], chain: FIVE,
    driver: `/* Athena: 22 becomes the 3rd pig */\nhead = insertAtPosition(head, 22, 3);\n`,
    say: "Position 3 means the new pig ends up <b>third</b>. <code>temp</code> walks to the pig <b>before</b> that spot (the 2nd). Then two ties, in this order: <code>newNode->next = temp->next</code>, then <code>temp->next = newNode</code>.",
    how: ["pos < 1: invalid. pos == 1: that's insertAtBeginning.", "for (i = 1; i < pos - 1 ...) temp = temp->next: temp stops on pig pos-1.", "temp == NULL: the position is past the end.", "newNode->next = temp->next: the new pig grabs the rest of the rope FIRST.", "temp->next = newNode: then the pig before it ties to the new one."],
    watch: "Swap those two ties and the rest of the rope is lost: nothing would point to it any more.",
    mistake: { label: "Swap the two ties", swap: ["insertAtPosition", "    newNode->next = temp->next;     /* first connect new node to the rest */", "    temp->next = newNode;           /* then connect previous node to new node */"],
      say: "temp->next = newNode ran first, so temp's old next (3, 19, 5) was overwritten before anyone saved it. Then newNode->next = temp->next made the new pig point at ITSELF. 3, 19 and 5 are unreachable, and the rope loops." } },

  { id: "deleteList", n: 5, name: "Delete the entire list", fns: ["deleteList"], chain: FIVE,
    driver: `head = deleteList(head);\n`,
    say: "<code>temp</code> holds the first pig, <code>head</code> steps to the next, then temp is freed. Again and again until head is NULL. Move first, free second.",
    how: ["temp = head: hold the first pig.", "head = head->next: step forward BEFORE freeing.", "free(temp): hand the pig back.", "Loop until head == NULL, then return NULL."],
    watch: "free first and head->next is read from a freed pig: there is no next step any more.",
    mistake: { label: "Free before moving", swap: ["deleteList", "        head = head->next;          /* move ahead BEFORE freeing */", "        free(temp);"],
      say: "free(temp) ran first, and temp IS head. Then head = head->next reads the next field of a pig that was already handed back. Real C may not even crash here; it just reads garbage. Aeaea stops you." } },

  { id: "deleteFirst", n: 6, name: "Delete the first node", fns: ["deleteFirst"], chain: FIVE,
    driver: `head = deleteFirst(head);\n`,
    say: "<code>temp</code> holds the first pig, <code>head</code> steps to the second, the first is freed. The caller keeps the new head.",
    how: ["Empty list: nothing to delete, return NULL.", "temp = head.", "head = head->next.", "free(temp).", "return head: the old second pig is now first."],
    watch: "Call it without head = ... and your head still points at the freed pig.",
    mistake: { label: "Forget head = ...", driver: `deleteFirst(head);   /* the answer is thrown away */\ndisplay(head);\n`, extra: ["display"],
      say: "head still holds the address of the pig that was freed. display(head) walks from it: it reads a pig that no longer exists (a dangling pointer)." } },

  { id: "deleteLast", n: 7, name: "Delete the last node", fns: ["deleteLast"], chain: FIVE,
    driver: `head = deleteLast(head);\n`,
    say: "To cut the tail you must stand on the pig <b>before</b> it. <code>temp</code> walks while <code>temp->next->next != NULL</code>, stopping on the second-last pig. Free its next, then set its next to NULL.",
    how: ["Empty list: return NULL.", "One pig: free it, return NULL.", "while (temp->next->next != NULL): stop on the second-last pig.", "free(temp->next): the last pig is handed back.", "temp->next = NULL: the rope ends here now."],
    watch: "With one pig, temp->next->next would follow NULL. That is why the one-node case is checked first." },

  { id: "deleteElement", n: 8, name: "Delete a specified element", fns: ["deleteElement"], chain: FIVE,
    driver: `/* Athena: cut 3 loose */\nhead = deleteElement(head, 3);\n`,
    say: "If the first pig has the value, it's just like deleteFirst. Otherwise <code>temp</code> walks while the <b>next</b> pig's data isn't the value, stopping on the pig <b>before</b> the target. Skip over it, then free it.",
    how: ["head->data == value: move head on, free the old first.", "while (temp->next != NULL && temp->next->data != value): stop before the target.", "temp->next == NULL: it's not on the rope.", "toDelete = temp->next: hold the target.", "temp->next = toDelete->next: the rope skips it.", "free(toDelete)."],
    watch: "Stop BEFORE the target: a pig only knows the next pig, never the one behind it." },

  { id: "display", n: 9, name: "Display the list", fns: ["display"], chain: FIVE,
    driver: `display(head);\n`,
    say: "<code>temp</code> walks from head to NULL, printing each <code>data</code> followed by <code>-></code>. Read-only: no rope changes, and head never moves.",
    how: ["Empty list: say so.", "temp = head.", "while (temp != NULL): print temp->data, then temp = temp->next.", "Print NULL at the end."],
    watch: "The test is temp != NULL, not temp->next != NULL: otherwise the last pig never gets printed." },

  { id: "search", n: 10, name: "Search for an element", fns: ["search"], chain: FIVE,
    driver: `int pos = search(head, 19);\nif (pos == -1) printf("19 not found\\n");\nelse printf("19 found at position %d\\n", pos);\n`,
    say: "The same walk as display, with a counter. Positions count from <b>1</b>. Found: return pos. Walked off the end: return <b>-1</b>.",
    how: ["temp = head, pos = 1.", "temp->data == key: return pos.", "Otherwise temp = temp->next, pos++.", "temp == NULL: return -1."],
    watch: "-1 means 'not here'. Check for it before you use pos." }
];

// the story around each lesson (the learning in the middle is untouched): a line before SHOW ME, Athena's
// one line when the key line of C runs (key: a piece of that line), and the takeaway after the run.
// A classic mistake gets its consequence instead of the takeaway.
const TALES = {
  createNode: { story: "Circe makes new guests all the time. Watch where they go.", key: ["newNode->next = NULL;", "It exists. Nobody can reach it yet."],
    take: "A new pig is nobody's until a pointer holds its address." },
  insertAtBeginning: { story: "A new arrival. Circe wants him at the front.", key: ["newNode->next = head;", "Tie him to the old first pig, then hand head the new address."],
    take: "The function returns the new head. Store it, or he's lost.",
    mtake: "The new pig was made and tied, but nobody kept his address. He's still on the island. You'll never find him." },
  insertAtEnd: { story: "The back of the line. You have to walk there.", key: ["while (temp->next != NULL)", "Follow the rope. Stop where next is NULL."],
    take: "To reach the end, start at head and walk. There are no shortcuts." },
  insertAtPosition: { story: "Third place. Two ropes have to change, and the order matters.", key: ["newNode->next = temp->next;", "Two ties. Get the order wrong, and the rest are gone."],
    take: "Tie the new pig to the rest first, then tie the rest to him.",
    mtake: "The rope behind him was overwritten before anyone held it. 3, 19 and 5 are cut off, and the new pig is tied to himself." },
  deleteList: { story: "Circe is clearing a pen. Odysseus does it his way: nobody gets lost first.", key: ["head = head->next;", "Hold the next address before you free this one."],
    take: "Save next, then free. Freed memory has no rope to follow.",
    mtake: "The pig was handed back first, then someone tried to read his rope. There is no rope on a freed pig. Move first, free second." },
  deleteFirst: { story: "The first pig is leaving. The gate has to know.", key: ["head = head->next;", "Move head first. Then let him go."],
    take: "Head moves before the old first pig is freed.",
    mtake: "head still holds the address of a pig who has gone. Anything that walks from it reads a pig that no longer exists." },
  deleteLast: { story: "The last pig. Someone else becomes the end of the line.", key: ["temp->next->next != NULL", "Stop one early. That pig becomes the end."],
    take: "The second-to-last pig's next becomes NULL." },
  deleteElement: { story: "Pig 3 is being moved. Close the gap behind him.", key: ["temp->next->data != value", "Stand on the pig before him. Reach past."],
    take: "Delete = find the one before, skip, free." },
  display: { story: "Roll call. Every name, in order.", key: ["while (temp != NULL)", "Start at head. Stop at NULL."],
    take: "Traversal: one pointer, one step at a time, until NULL." },
  search: { story: "Odysseus is looking for one man.", key: ["temp->data == key", "Look, step, count. Stop when you find him, or at NULL."],
    take: "Search is traversal that can stop early." },
};
// optional predictions, for the lesson's own rope (7 12 3 19 5): a question, the choices, the answer
const PREDICT = {
  insertAtBeginning: ["After head = …, which pig is first?", ["22", "7"], "22"],
  insertAtEnd: ["Where will temp stop?", ["19", "5", "NULL"], "5"],
  insertAtPosition: ["Which tie comes first?", ["newNode->next = temp->next", "temp->next = newNode"], "newNode->next = temp->next"],
  deleteFirst: ["After head = head->next, where does head point?", ["7", "12", "NULL"], "12"],
  deleteLast: ["Where will temp stop?", ["19", "5"], "19"],
  deleteElement: ["Whose next changes?", ["12", "3", "19"], "12"],
  search: ["Will it stop before NULL?", ["Yes", "No"], "Yes"],
};
for (const l of LESSONS) Object.assign(l, TALES[l.id], PREDICT[l.id] ? { predict: { q: PREDICT[l.id][0], options: PREDICT[l.id][1], answer: PREDICT[l.id][2] } } : {});

// the code a lesson runs: the right code, or its classic mistake
export function lessonCode(l, mistake = false) {
  const m = mistake && l.mistake;
  const fns = [...l.fns, ...((m && m.extra) || [])];
  let code = program(fns, m && m.driver ? m.driver : l.driver);
  if (m && m.swap) {
    const [, a, b] = m.swap;
    if (!code.includes(a) || !code.includes(b)) throw new Error("lesson swap lines not found: " + l.id);
    code = code.replace(a, "\u0000A").replace(b, a).replace("\u0000A", b);
  }
  return code;
}

// Athena's Codex for this chapter: the very same file, cut into the same parts as the lesson
export const CIRCE_CODEX = {
  title: "linked_list.c · the course program",
  intro: "This is the <b>whole program</b>, exactly as written for the course: the node, the ten operations, and the menu in main(). Tap a part to read why it works, then run it on the sty.",
  parts: [
    { id: "node", name: "The node", code: `#include <stdio.h>\n#include <stdlib.h>\n\n${STRUCT}`,
      why: "A linked list is not one block of memory like an array. Each node is its own little box somewhere in memory, and the only thing joining them is that each box remembers the <b>address</b> of the next one: the <code>next</code> field.",
      how: ["<code>data</code>: the number on the pig.", "<code>next</code>: the address of the pig after this one (the rope). NULL means none.", "A <code>struct Node *p</code> is NOT a node: it is a banner holding an address. Only malloc makes a pig."],
      warn: "Node (the pig) versus pointer to a node (the banner): mixing them up is the most common mistake." },
    ...LESSONS.map(l => ({ id: l.id, name: `${l.n} · ${l.name}`, code: FN[l.id], why: l.say, how: l.how, warn: l.watch, lesson: l })),
    { id: "main", name: "main · the menu", code: MAIN,
      why: "main() keeps a menu running: read a choice, call the matching function, and always store what it returns back into <code>head</code>. On choice 0 it frees the whole list before leaving.",
      how: ["head starts as NULL: an empty list.", "Every function that can change the first node returns the new head: head = insertAtBeginning(head, value).", "Display and search don't change the list, so their answer isn't stored in head."],
      note: "main reads the keyboard with scanf, so it runs on your computer, not on the sty. Athena's lesson calls the same functions with fixed values instead." }
  ],
  full: FULL
};
