// underworldLessons.js — Athena's lesson in Hades' waiting hall: queues in C, in the order the course
// teaches them. Every lesson runs its program's functions EXACTLY as written below; Java runs the C.
//   linear   : the array queue every course starts with (front = rear = -1, rear++, front++)
//   circular : the same with % MAX, which fixes the linear queue's fake FULL
//   deque    : both ends (insertFront / insertRear / deleteFront / deleteRear)
//   pq       : a priority queue (the lowest ticket number is served first, wherever it stands)
// The hall draws the linear queue as a bench row, the circular queue and the deque as the carousel.
const HEAD = `#include <stdio.h>\n\n#define MAX 5\n`;

const LINEAR = {
  isEmpty: `/* IS EMPTY: nobody joined yet, or front has passed rear */
int isEmpty() {
    return front == -1 || front > rear;
}
`,
  isFull: `/* IS FULL: rear has reached the last place */
int isFull() {
    return rear == MAX - 1;
}
`,
  enqueue: `/* ENQUEUE: join at the rear */
void enqueue(int value) {
    if (isFull()) {
        printf("Queue is full\\n");
        return;
    }
    if (front == -1)
        front = 0;
    rear++;
    queue[rear] = value;
}
`,
  dequeue: `/* DEQUEUE: leave from the front */
int dequeue() {
    if (isEmpty()) {
        printf("Queue is empty\\n");
        return -1;
    }
    int value = queue[front];
    front++;
    return value;
}
`,
  peek: `/* PEEK: who is at the front (nobody leaves) */
int peek() {
    if (isEmpty()) {
        printf("Queue is empty\\n");
        return -1;
    }
    return queue[front];
}
`,
  display: `/* DISPLAY: front to rear */
void display() {
    if (isEmpty()) {
        printf("Queue is empty\\n");
        return;
    }
    for (int i = front; i <= rear; i++)
        printf("%d ", queue[i]);
    printf("\\n");
}
`
};

const CIRCULAR = {
  isEmpty: `/* IS EMPTY: front == -1 means nobody is waiting */
int isEmpty() {
    return front == -1;
}
`,
  isFull: `/* IS FULL: the place after rear is front (the circle is closed) */
int isFull() {
    return (rear + 1) % MAX == front;
}
`,
  enqueue: `/* ENQUEUE: join at the rear, wrapping round */
void enqueue(int value) {
    if (isFull()) {
        printf("Queue is full\\n");
        return;
    }
    if (front == -1)
        front = 0;
    rear = (rear + 1) % MAX;    /* after the last place comes place 0 */
    queue[rear] = value;
}
`,
  dequeue: `/* DEQUEUE: leave from the front, wrapping round */
int dequeue() {
    if (isEmpty()) {
        printf("Queue is empty\\n");
        return -1;
    }
    int value = queue[front];
    if (front == rear) {        /* the last one left: empty again */
        front = -1;
        rear = -1;
    } else {
        front = (front + 1) % MAX;
    }
    return value;
}
`,
  display: `/* DISPLAY: front to rear, round the circle */
void display() {
    if (isEmpty()) {
        printf("Queue is empty\\n");
        return;
    }
    int i = front;
    while (1) {
        printf("%d ", queue[i]);
        if (i == rear) break;
        i = (i + 1) % MAX;
    }
    printf("\\n");
}
`
};

const DEQUE = {
  insertFront: `/* INSERT AT THE FRONT: front steps back (round the circle) */
void insertFront(int value) {
    if ((front == 0 && rear == MAX - 1) || front == rear + 1) {
        printf("Deque is full\\n");
        return;
    }
    if (front == -1) {
        front = 0;
        rear = 0;
    } else if (front == 0) {
        front = MAX - 1;
    } else {
        front = front - 1;
    }
    deque[front] = value;
}
`,
  insertRear: `/* INSERT AT THE REAR: rear steps on (round the circle) */
void insertRear(int value) {
    if ((front == 0 && rear == MAX - 1) || front == rear + 1) {
        printf("Deque is full\\n");
        return;
    }
    if (front == -1) {
        front = 0;
        rear = 0;
    } else if (rear == MAX - 1) {
        rear = 0;
    } else {
        rear = rear + 1;
    }
    deque[rear] = value;
}
`,
  deleteFront: `/* DELETE FROM THE FRONT */
int deleteFront() {
    if (front == -1) {
        printf("Deque is empty\\n");
        return -1;
    }
    int value = deque[front];
    if (front == rear) {
        front = -1;
        rear = -1;
    } else if (front == MAX - 1) {
        front = 0;
    } else {
        front = front + 1;
    }
    return value;
}
`,
  deleteRear: `/* DELETE FROM THE REAR */
int deleteRear() {
    if (front == -1) {
        printf("Deque is empty\\n");
        return -1;
    }
    int value = deque[rear];
    if (front == rear) {
        front = -1;
        rear = -1;
    } else if (rear == 0) {
        rear = MAX - 1;
    } else {
        rear = rear - 1;
    }
    return value;
}
`
};

const PQ = {
  insert: `/* INSERT: a new ticket goes in the next free place */
void insert(int value) {
    if (count == MAX) {
        printf("Queue is full\\n");
        return;
    }
    pq[count] = value;
    count++;
}
`,
  deleteMin: `/* DELETE THE HIGHEST PRIORITY: the lowest number is served first */
int deleteMin() {
    if (count == 0) {
        printf("Queue is empty\\n");
        return -1;
    }
    int min = 0;
    for (int i = 1; i < count; i++)
        if (pq[i] < pq[min])
            min = i;
    int value = pq[min];
    for (int i = min; i < count - 1; i++)   /* close the gap */
        pq[i] = pq[i + 1];
    count--;
    return value;
}
`
};

export const PROGRAMS = {
  linear:   { name: "queue.c · linear queue", arr: "queue", fns: LINEAR, order: ["isEmpty", "isFull", "enqueue", "dequeue", "peek", "display"], shape: "row",
              globals: s => s ? `int queue[MAX] = {${s.cells.join(", ")}};\nint front = ${s.front}, rear = ${s.rear};\n` : `int queue[MAX];\nint front = -1, rear = -1;\n` },
  circular: { name: "cqueue.c · circular queue", arr: "queue", fns: CIRCULAR, order: ["isEmpty", "isFull", "enqueue", "dequeue", "display"], shape: "ring",
              globals: s => s ? `int queue[MAX] = {${s.cells.join(", ")}};\nint front = ${s.front}, rear = ${s.rear};\n` : `int queue[MAX];\nint front = -1, rear = -1;\n` },
  deque:    { name: "deque.c · double-ended queue", arr: "deque", fns: DEQUE, order: ["insertFront", "insertRear", "deleteFront", "deleteRear"], shape: "ring",
              globals: s => `int deque[MAX] = {${s.cells.join(", ")}};\nint front = ${s.front}, rear = ${s.rear};\n` },
  pq:       { name: "pqueue.c · priority queue", arr: "pq", fns: PQ, order: ["insert", "deleteMin"], shape: "pq",
              globals: s => `int pq[MAX] = {${s.cells.join(", ")}};\nint count = ${s.count};\n` }
};

export function lessonCode(l, mistake = false) {
  const P = PROGRAMS[l.prog];
  const fns = P.order.filter(n => l.fns.includes(n)).map(n => {
    let code = P.fns[n];
    if (mistake && l.mistake && l.mistake.fn === n) code = code.replace(l.mistake.from, l.mistake.to);
    return code;
  });
  const g = l.start ? `/* Athena set the hall up for this lesson */\n${P.globals(l.start)}` : `/* the hall starts empty */\n${P.globals(null)}`;
  return HEAD + "\n" + g + "\n" + fns.join("\n") + "\n" + l.driver;
}
const S = (cells, front, rear) => ({ cells, front, rear });

export const LESSONS = [
  // ---- the linear queue (the bench row)
  { id: "enqueue", n: 1, prog: "linear", name: "Enqueue: join at the rear", fns: ["isFull", "enqueue"], start: S([7, 12, 30, 0, 0], 0, 2),
    driver: `/* Athena: Ajax takes a ticket */\nenqueue(41);\n`,
    say: "A queue has two ends with two jobs: you <b>join at the rear</b> and you're <b>served from the front</b>. enqueue checks there's a seat, moves <code>rear</code> one seat on, and writes the ticket there. <code>front</code> doesn't move.",
    how: ["isFull()? rear == MAX - 1: no seat left.", "First one in? front = 0.", "rear++: the next seat.", "queue[rear] = value."],
    watch: "Only rear moves. front stays on seat [0]." },
  { id: "dequeue", n: 2, prog: "linear", name: "Dequeue: served from the front", fns: ["isEmpty", "dequeue"], start: S([7, 12, 30, 0, 0], 0, 2),
    driver: `/* Athena: NOW SERVING the first ticket */\nint served = dequeue();\n`,
    say: "First in, first out: the one at the <b>front</b> is served. dequeue takes <code>queue[front]</code> and moves <code>front</code> one seat on. Nothing is rubbed out: seat [0] still says 7, but front has passed it, so 7 is not in the queue any more.",
    how: ["isEmpty()? front == -1 or front > rear.", "value = queue[front].", "front++.", "return value."],
    watch: "After it, seat [0] still shows 7, crossed out: in the array, not in the queue." },
  { id: "peek", n: 3, prog: "linear", name: "Peek and isEmpty", fns: ["isEmpty", "peek"], start: S([41, 23, 5, 0, 0], 0, 2),
    driver: `/* Athena: who's next, without calling him */\nint next = peek();\nint empty = isEmpty();\n`,
    say: "peek reads <code>queue[front]</code> and gives it back. Nobody is served and front doesn't move. isEmpty is true when <code>front == -1</code> (nobody ever joined) or <code>front &gt; rear</code> (everyone was served).",
    how: ["peek: return queue[front].", "isEmpty: front == -1 || front > rear."],
    watch: "Nothing changes in the hall." },
  { id: "display", n: 4, prog: "linear", name: "Display: front to rear", fns: ["isEmpty", "display"], start: S([7, 12, 30, 41, 0], 1, 3),
    driver: `/* Athena: read the queue out */\ndisplay();\n`,
    say: "display walks <code>i</code> from <code>front</code> to <code>rear</code> and prints each ticket. Seat [0] is skipped: 7 was already served.",
    how: ["for (i = front; i <= rear; i++).", "printf each queue[i]."],
    watch: "It prints 12 30 41, not 7: the queue starts at front, not at seat [0]." },
  { id: "drawback", n: 5, prog: "linear", name: "The drawback: a fake FULL", fns: ["isFull", "enqueue"], start: S([7, 12, 30, 41, 23], 3, 4),
    driver: `/* Athena: three were already served. Patroclus takes a ticket. */\nenqueue(5);\n`,
    say: "Three tickets were served, so seats [0] [1] [2] are free. But the linear queue only ever moves <b>forward</b>: rear is on the last seat, so isFull says <code>rear == MAX - 1</code>. Patroclus is turned away from an almost empty hall. That waste is the drawback of a linear queue, and the reason for the circular one.",
    how: ["rear = 4 = MAX - 1, so isFull() returns 1.", "enqueue prints \"Queue is full\".", "Seats [0] [1] [2] are never used again."],
    watch: "\"Queue is full\" with three empty seats. Then try lesson 6." },
  // ---- the circular queue (the carousel)
  { id: "wrap", n: 6, prog: "circular", name: "Circular: wrap round", fns: ["isFull", "enqueue"], start: S([7, 12, 30, 41, 23], 3, 4),
    driver: `/* Athena: the same hall, now a carousel. Patroclus takes a ticket. */\nenqueue(5);\n`,
    say: "The same moment as lesson 5, on the carousel. rear is on the last place, [4]. <code>(4 + 1) % 5 = 0</code>: rear goes round to place [0], where 7 used to sit. The free places are used again. That one <code>%</code> fixes the drawback.",
    how: ["isFull: (4 + 1) % 5 = 0, and front is 3: not full.", "rear = (rear + 1) % MAX = 0.", "queue[0] = 5: the old 7 is written over."],
    watch: "rear (0) ends up smaller than front (3). Normal in a circular queue.",
    mistake: { label: "Forget % MAX", fn: "enqueue", from: "rear = (rear + 1) % MAX;    /* after the last place comes place 0 */", to: "rear = rear + 1;            /* the mistake: no wrap round */",
      say: "Without % MAX, rear goes from 4 to 5. There is no place [5]: queue[5] is outside the array." } },
  { id: "lastOne", n: 7, prog: "circular", name: "Circular: the last one leaves", fns: ["isEmpty", "dequeue"], start: S([7, 12, 30, 41, 23], 4, 4),
    driver: `/* Athena: one soul left. NOW SERVING. */\nint served = dequeue();\n`,
    say: "When <code>front == rear</code> only one is waiting. After he's served the queue is empty, so both go back to <b>-1</b>. In a circular queue you can't tell empty by <code>front &gt; rear</code>: the circle makes that meaningless.",
    how: ["front == rear: the last one.", "front = rear = -1: empty again.", "Otherwise front = (front + 1) % MAX."],
    watch: "front and rear both go to -1.",
    mistake: { label: "Don't reset to -1", fn: "dequeue", from: "if (front == rear) {        /* the last one left: empty again */\n        front = -1;\n        rear = -1;\n    } else {\n        front = (front + 1) % MAX;\n    }", to: "front = (front + 1) % MAX;  /* the mistake: no reset when the last one leaves */",
      say: "front goes round to 0 while rear stays at 4. Now front to rear covers every place: the carousel looks FULL of old tickets that were already served." } },
  { id: "isFull", n: 8, prog: "circular", name: "Circular: is it full?", fns: ["isFull", "enqueue"], start: S([23, 5, 7, 12, 30], 2, 1),
    driver: `/* Athena: every place is taken. Heracles tries to join. */\nenqueue(66);\n`,
    say: "This queue starts at [2] and goes round past [4] to [0] and [1]. It's full when the place after rear is front: <code>(1 + 1) % 5 = 2</code>, which is front. The linear test, rear == MAX - 1, would say \"not full\" here, because rear is 1.",
    how: ["(rear + 1) % MAX == front: full.", "enqueue refuses: \"Queue is full\"."],
    watch: "\"Queue is full\" is printed, and nobody is overwritten.",
    mistake: { label: "Use the linear test", fn: "isFull", from: "return (rear + 1) % MAX == front;", to: "return rear == MAX - 1;     /* the mistake: the linear queue's test */",
      say: "rear is 1, not 4, so the linear test says \"not full\". Heracles is written onto place [2], over 7, who was at the FRONT of the queue. Someone waiting has vanished." } },
  { id: "cdisplay", n: 9, prog: "circular", name: "Circular: display", fns: ["isEmpty", "display"], start: S([23, 5, 7, 12, 30], 2, 1),
    driver: `/* Athena: read the carousel out */\ndisplay();\n`,
    say: "display starts at front and steps with <code>i = (i + 1) % MAX</code> until it has printed rear. This queue wraps, so it prints [2] [3] [4], then [0] [1].",
    how: ["i = front.", "print, stop after i == rear.", "i = (i + 1) % MAX."],
    watch: "It prints 7 12 30 23 5: queue order, not seat order." },
  // ---- deque and priority queue
  { id: "deque", n: 10, prog: "deque", name: "Deque: both ends", fns: ["insertFront", "deleteRear"], start: S([7, 12, 30, 0, 0], 0, 2),
    driver: `/* Athena: Tiresias is let in at the FRONT, and the last in line gives up */\ninsertFront(99);\nint gaveUp = deleteRear();\n`,
    say: "A deque (double-ended queue) can add and remove at <b>both</b> ends. insertFront moves front one place <b>back</b>: from [0] it goes round to [4]. deleteRear takes whoever is at rear and moves rear back by one.",
    how: ["insertFront: front 0 → MAX - 1, then deque[front] = value.", "deleteRear: value = deque[rear], rear--.", "Input-restricted: insert at one end only. Output-restricted: delete at one end only."],
    watch: "front goes BACKWARDS round the circle, from [0] to [4]." },
  { id: "priority", n: 11, prog: "pq", name: "Priority queue: lowest first", fns: ["deleteMin"], start: { cells: [30, 7, 41, 12, 0], count: 4 },
    driver: `/* Athena: the lowest ticket number is served first */\nint first = deleteMin();\n`,
    say: "In a priority queue the order of arrival doesn't decide. The <b>priority</b> does: here the lowest number. deleteMin searches for the smallest, serves it, and shifts everyone after it one seat left to close the gap.",
    how: ["Find min: compare every pq[i].", "value = pq[min].", "Shift pq[i] = pq[i + 1] after it.", "count--."],
    watch: "7 is served first, even though 30 came before him." }
];

export const MAIN = `int main() {
    enqueue(7);
    enqueue(12);
    enqueue(30);
    display();                         /* 7 12 30 */
    printf("served %d\\n", dequeue());  /* 7 */
    printf("next: %d\\n", peek());      /* 12 */
    return 0;
}
`;
export const FULL = HEAD + "\n" + PROGRAMS.linear.globals(null) + "\n" + PROGRAMS.linear.order.map(n => LINEAR[n]).join("\n") + "\n" + MAIN;

export const UNDERWORLD_CODEX = {
  title: "queues in C · four programs",
  intro: "The <b>whole programs</b> the lessons come from: the linear queue, the circular queue that fixes it, the deque and the priority queue. Tap a part, read why, then run its lesson in the hall.",
  parts: [
    { id: "globals", name: "Linear queue: the array, front, rear", code: HEAD + "\n" + PROGRAMS.linear.globals(null),
      why: "A queue in C is an array plus two numbers: <code>front</code> (who is served next) and <code>rear</code> (the last to join). Both start at -1: nobody is waiting.",
      how: ["MAX: how many seats.", "Join at the rear, leave from the front."],
      warn: "Old values stay in the array after a dequeue. The queue is only what lies from front to rear." },
    ...LESSONS.map(l => ({ id: l.id, name: `${l.n} · ${l.name}`, code: PROGRAMS[l.prog].fns[l.id === "wrap" || l.id === "drawback" ? "enqueue" : l.id === "lastOne" ? "dequeue" : l.id === "cdisplay" ? "display" : l.id === "deque" ? "insertFront" : l.id === "priority" ? "deleteMin" : l.id] || "",
      why: l.say, how: l.how, warn: l.watch, lesson: l })),
    { id: "linked", name: "Linked-list queue (read only)", code: `struct Node { int data; struct Node *next; };
struct Node *front = NULL, *rear = NULL;

void enqueue(int value) {
    struct Node *n = (struct Node*)malloc(sizeof(struct Node));
    n->data = value;
    n->next = NULL;
    if (rear == NULL) { front = rear = n; return; }
    rear->next = n;      /* tie the old rear to the new node */
    rear = n;
}

int dequeue() {
    if (front == NULL) { printf("Queue is empty\\n"); return -1; }
    struct Node *t = front;
    int value = t->data;
    front = front->next;
    if (front == NULL) rear = NULL;   /* the last one left */
    free(t);
    return value;
}`,
      why: "The same queue built from Chapter 3's nodes. Two pointers: <code>front</code> to serve from, <code>rear</code> to join at. There is no MAX, so it never fills up (until memory runs out).",
      how: ["enqueue: rear->next = n; rear = n.", "dequeue: front = front->next; free the old node.", "Last one out: rear = NULL too."],
      note: "You can run this in Circe's Lab: it uses the same pointers and nodes as Chapter 3." },
    { id: "main", name: "main", code: MAIN,
      why: "main() puts three tickets in the queue, prints it, serves the first and looks at who's next.",
      how: ["enqueue 7, 12, 30.", "display: 7 12 30.", "dequeue: 7. peek: 12."],
      note: "In the Lab you can run the whole linear program, main and all." }
  ],
  full: FULL
};
