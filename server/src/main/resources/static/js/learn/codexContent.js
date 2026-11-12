// codexContent.js — what Athena's Codex says, chapter by chapter: the complete C program, cut into
// parts, each with WHY, HOW, the classic mistake and a runnable version for the board.
// The "watch out" lines come from where students actually trip (see the project notes):
//   • mixing up a node that HOLDS a pointer with a pointer itself, and forgetting NULL
//     (Almadhoun & Parham-Mocello, VL/HCC 2021, singly linked lists in C),
//   • forgetting to attach a new node or to move head/tail (Zingaro, Webb et al., ICER 2018),
//   • the empty / one-node special cases and broken neighbour links (common-error lists in DS labs),
//   • losing the rest of the list when the order of pointer assignments is wrong.
// run: { code } is written in the game's C (the same thing, minus the malloc and printf plumbing).

export const CIRCE_CODEX = {
  title: "linked_list.c",
  intro: "The trials show you a few lines at a time. This is the <b>whole program</b> they come from: the node, making one with malloc, and every operation. Tap a part, read why, then run it and watch the pigs.",
  parts: [
    { id: "head", name: "#include + the node",
      code: `#include <stdio.h>
#include <stdlib.h>

// one node: a value, and the ADDRESS of the next node
struct Node {
    int data;
    struct Node* next;   // NULL means: no next node
};
typedef struct Node Node;   // so we can write Node instead of struct Node`,
      why: "A linked list is not one block of memory like an array. Each node is its own little box somewhere in memory, and the only thing joining them is that each box remembers where the next one is. That memory address is the <code>next</code> field.",
      how: ["<code>data</code> holds the value: the pig's tag.", "<code>next</code> holds an address: which pig comes after this one (the rope).", "A <code>Node*</code> variable (head, p, prev) is NOT a node. It is a name tag holding an address: the coloured banners over the pigs.", "The last node's next is <code>NULL</code> (address 0): the loose rope end."],
      warn: "The most common confusion: a <b>node</b> (the pig, data + next) versus a <b>pointer</b> to a node (the banner). <code>Node* p</code> makes a banner, not a pig. Only malloc / newNode makes a pig.",
      run: { chain: [7, 12, 3], code: `// head is a pointer to the first node; follow the ropes
Node* p = head;
p = p->next;
p = p->next;
p = p->next;   // now p is NULL: past the last pig` } },
    { id: "new", name: "newNode (malloc)",
      code: `// make one node on the heap and return its address
Node* newNode(int x) {
    Node* n = (Node*) malloc(sizeof(Node));
    if (n == NULL) { printf("Out of memory\\n"); exit(1); }
    n->data = x;
    n->next = NULL;     // not tied to anything yet
    return n;
}`,
      why: "Nodes have to outlive the function that makes them, so they can't be ordinary local variables. <code>malloc</code> asks the heap for <code>sizeof(Node)</code> bytes and hands back the address. The <code>(Node*)</code> cast tells C what that raw memory is.",
      how: ["<code>malloc(sizeof(Node))</code>: room for one int and one address.", "Check for NULL: malloc can fail.", "Fill in data, and set next to NULL so it doesn't point at garbage.", "Return the address; the caller ties it into the list."],
      warn: "A brand-new node is tied to nothing. Making it does NOT put it in the list: you still have to link it (that's the next two parts).",
      note: "In the game, <code>newNode(x)</code> does exactly this for you: it returns a fresh address (0x1F0...).",
      run: { chain: [7, 12], code: `Node* m = newNode(22);   // a pig appears, roped to nothing` } },
    { id: "count", name: "count (traverse)",
      code: `// walk from head to NULL, one node at a time
int count(Node* head) {
    int c = 0;
    Node* p = head;          // a COPY of head walks; head stays put
    while (p != NULL) {
        c++;
        p = p->next;         // follow the rope
    }
    return c;
}`,
      why: "You can't jump to the 4th node like <code>a[3]</code>: the only way in is the front door, head. To visit everything you hold a pointer and keep moving it along the ropes until there is no next.",
      how: ["Start <code>p</code> at head.", "While p points at a real node: use it (here, count it).", "<code>p = p->next</code> moves the banner to the next pig.", "When p becomes NULL, every node has been visited exactly once."],
      warn: "Two classic slips: walking with <code>head</code> itself (the list loses its start), and <code>while (p->next != NULL)</code>, which stops one node early and crashes on an empty list.",
      run: { chain: [7, 12, 3, 19, 5], code: `int c = 0;
Node* p = head;
while (p != NULL) {
    c++;
    p = p->next;
}` } },
    { id: "search", name: "search",
      code: `// return a POINTER to the first node holding x (or NULL)
Node* search(Node* head, int x) {
    for (Node* p = head; p != NULL; p = p->next) {
        if (p->data == x) return p;
    }
    return NULL;
}`,
      why: "Returning the node's address (not its value, not a position number) lets the caller change that node directly afterwards: <code>found->data = 0;</code>.",
      how: ["Walk with p, as in count.", "Look inside each node: <code>p->data</code>.", "On a match, hand back p itself.", "If the walk reaches NULL, it isn't there: return NULL."],
      warn: "Always test <code>p != NULL</code> BEFORE <code>p->data</code>. Reading data through NULL is the classic crash (in the game: the NULL siren).",
      run: { chain: [7, 12, 3, 19, 5], code: `Node* found = NULL;
for (Node* p = head; p != NULL; p = p->next) {
    if (p->data == 19) { found = p; break; }
}` } },
    { id: "ins-head", name: "insert at head",
      code: `// put x first; return the new head
Node* insertAtHead(Node* head, int x) {
    Node* m = newNode(x);
    m->next = head;      // 1. tie the new node to the old first node
    return m;            // 2. the new node is the new head
}
// called as:  head = insertAtHead(head, 22);`,
      why: "Adding at the front is the cheapest thing a linked list can do: no walking, no shifting, just two pointer changes. (An array would have to shift every element right.)",
      how: ["Make the node.", "Point it at the current first node: <code>m->next = head</code>.", "Move head to it: <code>head = m</code>.", "It also works on an empty list: m->next becomes NULL."],
      warn: "ORDER MATTERS. If you move head first (<code>head = m; m->next = head;</code>), the new node points at itself and every other node is lost. Tie first, then move.",
      run: { chain: [7, 12, 3], code: `Node* m = newNode(22);
m->next = head;   // tie first...
head = m;         // ...then move head` } },
    { id: "ins-tail", name: "insert at tail",
      code: `// put x last; return the (maybe new) head
Node* insertAtTail(Node* head, int x) {
    Node* m = newNode(x);
    if (head == NULL) return m;          // empty list: m is everything
    Node* p = head;
    while (p->next != NULL) p = p->next; // stop ON the last node
    p->next = m;                          // tie it on
    return head;
}`,
      why: "Without a tail pointer, the end of the list can only be found by walking to it. This time we stop ON the last node (its next is NULL), because that's the node whose rope we must tie.",
      how: ["Make the node.", "Special case: an empty list has no last node, so the new node becomes head.", "Walk while <code>p->next != NULL</code>: p stops on the last node.", "<code>p->next = m</code> ties the new node on; its own next is already NULL."],
      warn: "Forgetting the empty-list case (<code>head == NULL</code>) crashes on <code>p->next</code>. And forgetting <code>p->next = m</code> makes a node nobody can reach.",
      run: { chain: [40, 10, 30], code: `Node* m = newNode(99);
if (head == NULL) {
    head = m;
} else {
    Node* p = head;
    while (p->next != NULL) { p = p->next; }
    p->next = m;
}` } },
    { id: "delete", name: "delete a value",
      code: `// remove the first node holding x; return the (maybe new) head
Node* deleteValue(Node* head, int x) {
    if (head == NULL) return NULL;
    if (head->data == x) {               // removing the first node
        Node* gone = head;
        head = head->next;
        free(gone);
        return head;
    }
    Node* p = head;
    while (p->next != NULL && p->next->data != x) p = p->next;
    if (p->next != NULL) {               // p is the node BEFORE it
        Node* gone = p->next;
        p->next = gone->next;            // skip over it
        free(gone);
    }
    return head;
}`,
      why: "To take a node out, the node BEFORE it must skip over it. A singly linked list can't look backwards, so we stop one early and look ahead with <code>p->next->data</code>.",
      how: ["Empty list: nothing to do.", "If it's the first node, head just moves to the second.", "Otherwise walk until <code>p->next</code> is the one to remove.", "Save it in <code>gone</code>, make p skip it (<code>p->next = gone->next</code>), then <code>free(gone)</code>."],
      warn: "Three traps: cutting (<code>p->next = NULL</code>) instead of skipping loses everything after; freeing before relinking means reading freed memory; forgetting the first-node case.",
      run: { chain: [7, 12, 3, 19, 5], code: `int x = 3;
Node* p = head;
while (p->next != NULL && p->next->data != x) { p = p->next; }
Node* gone = p->next;
p->next = gone->next;
free(gone);` } },
    { id: "reverse", name: "reverse",
      code: `// turn every arrow around; return the new head
Node* reverse(Node* head) {
    Node* prev = NULL;
    Node* cur = head;
    while (cur != NULL) {
        Node* next = cur->next;   // 1. remember the rest
        cur->next = prev;         // 2. turn this arrow around
        prev = cur;               // 3. step prev forward
        cur = next;               // 4. step cur forward
    }
    return prev;                  // prev is the old last node
}`,
      why: "Each node only knows its next, so we turn the arrows one at a time while walking. The moment we turn <code>cur</code>'s arrow back, we lose the way forward, so step 1 saves it first.",
      how: ["prev = NULL: the first node will become the last, pointing at NULL.", "Save <code>next = cur->next</code>: the rest of the rope.", "Turn the arrow: <code>cur->next = prev</code>.", "Move both along: <code>prev = cur; cur = next;</code>", "When cur is NULL, prev holds the new first node: <code>head = prev</code>."],
      warn: "Skip step 1 and the rest of the list is gone after the first turn. Forget <code>head = prev</code> and head still points at the old first node, which is now the LAST: the list looks like one node.",
      run: { chain: [7, 12, 3, 19, 5], code: `Node* prev = NULL;
Node* cur = head;
while (cur != NULL) {
    Node* next = cur->next;
    cur->next = prev;
    prev = cur;
    cur = next;
}
head = prev;` } },
    { id: "print", name: "print",
      code: `void printList(Node* head) {
    for (Node* p = head; p != NULL; p = p->next) {
        printf("%d -> ", p->data);
    }
    printf("NULL\\n");
}`,
      why: "The same walk as count, reading each node's data instead of counting. Printing <code>NULL</code> at the end makes the shape of the list obvious.",
      how: ["Walk with p from head.", "Print p->data and an arrow.", "After the loop, print NULL."],
      note: "The game can't print to a console; the board under the picture IS the printout: head -> 7 -> 12 -> ... -> NULL.",
      run: { chain: [7, 12, 3], code: `int total = 0;
for (Node* p = head; p != NULL; p = p->next) {
    total = total + p->data;   // 'print' each one by touching it
}` } },
    { id: "free", name: "free the list",
      code: `void freeList(Node* head) {
    Node* p = head;
    while (p != NULL) {
        Node* next = p->next;   // save the way on BEFORE freeing
        free(p);
        p = next;
    }
}`,
      why: "Every malloc needs a free, or the program leaks memory. Freeing a node destroys its next field too, so the address of the rest must be saved first.",
      how: ["Save <code>next = p->next</code>.", "<code>free(p)</code>.", "Move on to the saved next."],
      warn: "<code>free(p); p = p->next;</code> reads a node that no longer exists (use after free).",
      run: { chain: [7, 12, 3], code: `Node* p = head;
while (p != NULL) {
    Node* next = p->next;
    free(p);
    p = next;
}
head = NULL;` } },
    { id: "main", name: "main",
      code: `int main(void) {
    Node* head = NULL;                    // an empty list
    int tags[] = {7, 12, 3, 19, 5};
    for (int i = 0; i < 5; i++) head = insertAtTail(head, tags[i]);
    printList(head);                      // 7 -> 12 -> 3 -> 19 -> 5 -> NULL
    head = insertAtHead(head, 22);
    head = deleteValue(head, 3);
    head = reverse(head);
    printList(head);                      // 5 -> 19 -> 12 -> 7 -> 22 -> NULL
    printf("%d nodes\\n", count(head));
    freeList(head);
    return 0;
}`,
      why: "main ties the parts together: build the crew's rope, then use every operation once. Each function that can change the first node RETURNS the new head, and main stores it back.",
      how: ["Start empty: head = NULL.", "Build the rope with insertAtTail.", "Insert, delete, reverse: always <code>head = f(head, ...)</code>.", "Free everything before exiting."],
      warn: "Writing <code>insertAtHead(head, 22);</code> without <code>head = </code> throws the new head away: the node is made but the list never sees it.",
      run: { chain: [], code: `Node* t = NULL;
int k = 0;
// build 7 -> 12 -> 3 by tying each new pig to the end
head = newNode(7);
t = head;
t->next = newNode(12);
t = t->next;
t->next = newNode(3);
// then insert 22 at the head
Node* m = newNode(22);
m->next = head;
head = m;` } }
  ]
};

export const CAVE_CODEX = {
  title: "flock.c",
  intro: "The trials show a few lines at a time. This is the <b>whole program</b>: the array, its count n, and every operation. Tap a part, read why, then run it on your own flock and watch the sheep.",
  parts: [
    { id: "decl", name: "the array + n",
      code: `#include <stdio.h>
#define CAP 10                  // ten pens carved in the rock

int flock[CAP] = {34, 52, 18, 77, 45, 60, 23, 81};
int n = 8;                      // how many pens are IN USE`,
      why: "An array is one block of memory: CAP cells side by side, so <code>flock[i]</code> jumps straight to any pen. Its size is fixed when it's made, so we track separately how many cells hold real data: <code>n</code>.",
      how: ["<code>flock[0]</code> is the first pen, <code>flock[n-1]</code> the last sheep.", "Cells n to CAP-1 exist but hold junk.", "Address of flock[i] = start + i × 4 bytes: that's why access is instant."],
      warn: "Valid indexes are 0 to n-1. <code>i <= n</code> reads junk; <code>flock[CAP]</code> is outside the array altogether (in the game, the eye opens).",
      run: { flock: [34, 52, 18, 77, 45, 60, 23, 81], code: `int first = flock[0];
int last = flock[n - 1];` } },
    { id: "sum", name: "sum (traverse)",
      code: `int sum(int a[], int n) {
    int total = 0;
    for (int i = 0; i < n; i++) total += a[i];
    return total;
}`,
      why: "Visiting every element is the base of almost every array algorithm. The loop variable is the index, and <code>i < n</code> stops exactly after the last sheep.",
      how: ["i starts at 0.", "Add a[i] to the total.", "Stop when i reaches n (not n-1, not CAP)."],
      warn: "<code>i <= n</code> reads one pen too far.",
      run: { flock: [34, 52, 18, 77, 45], code: `int total = 0;
for (int i = 0; i < n; i++) {
    total = total + flock[i];
}` } },
    { id: "search", name: "linear search",
      code: `int linearSearch(int a[], int n, int x) {
    for (int i = 0; i < n; i++)
        if (a[i] == x) return i;   // the POSITION
    return -1;                     // not here
}`,
      why: "With no order to rely on, the only way is to look at each pen in turn. We return the index so the caller knows WHERE it is.",
      how: ["Check each pen from 0.", "On a match, return i.", "After the loop: -1 means not found."],
      warn: "Returning <code>a[i]</code> (the value you already knew) instead of <code>i</code>.",
      run: { flock: [34, 52, 18, 77, 45, 60, 23, 81], code: `int pos = -1;
for (int i = 0; i < n; i++) {
    if (flock[i] == 60) { pos = i; break; }
}` } },
    { id: "max", name: "biggest",
      code: `int maxIndex(int a[], int n) {
    int big = 0;
    for (int i = 1; i < n; i++)
        if (a[i] > a[big]) big = i;
    return big;
}`,
      why: "Keep the index of the best so far and compare everyone else to it. Keeping the index (not the value) tells you where it is too.",
      how: ["Assume pen 0 is biggest.", "Compare each later pen to a[big].", "Move big when you find heavier."],
      run: { flock: [34, 52, 18, 77, 45, 60, 23, 81], code: `int big = 0;
for (int i = 1; i < n; i++) {
    if (flock[i] > flock[big]) { big = i; }
}` } },
    { id: "insert", name: "insert at a position",
      code: `// put x at position pos; everything from pos on moves right
int insertAt(int a[], int n, int pos, int x) {
    if (n == CAP) { printf("Full\\n"); return n; }
    for (int i = n; i > pos; i--) a[i] = a[i - 1];   // from the BACK
    a[pos] = x;
    return n + 1;                                       // the new n
}`,
      why: "Array cells can't stretch, so to open a gap everyone after it must move one pen right. We move from the back so nobody is overwritten before they've moved.",
      how: ["Check there's room (n < CAP).", "Shift from the end down to pos.", "Write x into the gap.", "n grows by one."],
      warn: "Shifting front-to-back copies the same sheep into every pen. And forgetting n++ hides the new last sheep.",
      run: { flock: [34, 52, 18, 77, 45], code: `for (int i = n; i > 0; i--) {
    flock[i] = flock[i - 1];
}
flock[0] = 15;
n++;` } },
    { id: "delete", name: "delete a position",
      code: `int deleteAt(int a[], int n, int pos) {
    for (int i = pos; i < n - 1; i++) a[i] = a[i + 1];   // close the gap
    return n - 1;
}`,
      why: "The array must stay gap-free (pens 0 to n-1 all real), so everyone after the removed pen moves one left.",
      how: ["Start at the removed position.", "Copy each next pen into the current one.", "n shrinks by one."],
      warn: "Looping to <code>i < n</code> reads a[n]: one past the end.",
      run: { flock: [34, 52, 18, 77, 45, 60], code: `for (int i = 2; i < n - 1; i++) {
    flock[i] = flock[i + 1];
}
n--;` } },
    { id: "reverse", name: "reverse",
      code: `void reverse(int a[], int n) {
    int l = 0, r = n - 1;
    while (l < r) {
        int t = a[l]; a[l] = a[r]; a[r] = t;   // swap with a spare hand
        l++; r--;
    }
}`,
      why: "Two pointers walk in from both ends, swapping as they go. A swap needs a third variable, or the first value is overwritten.",
      how: ["l at the front, r at the back.", "Swap a[l] and a[r] through t.", "Move both inward; stop when they meet."],
      warn: "Running until <code>l < n</code> swaps everything twice: back where you started.",
      run: { flock: [34, 52, 18, 77, 45, 60], code: `int l = 0;
int r = n - 1;
while (l < r) {
    int t = flock[l];
    flock[l] = flock[r];
    flock[r] = t;
    l++;
    r--;
}` } },
    { id: "bubble", name: "bubble sort",
      code: `void bubbleSort(int a[], int n) {
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - 1 - i; j++)
            if (a[j] > a[j + 1]) { int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
}`,
      why: "Compare neighbours and swap if they're the wrong way round. Each pass carries the heaviest remaining sheep to the end, so each pass can stop one pen earlier.",
      how: ["Outer loop: one pass per sheep.", "Inner loop: compare j and j+1.", "Swap when out of order.", "After pass i, the last i pens are final."],
      run: { flock: [52, 18, 77, 34, 45], code: `for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - 1 - i; j++) {
        if (flock[j] > flock[j + 1]) {
            int t = flock[j];
            flock[j] = flock[j + 1];
            flock[j + 1] = t;
        }
    }
}` } },
    { id: "binary", name: "binary search",
      code: `// a must be SORTED
int binarySearch(int a[], int n, int x) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (a[mid] == x) return mid;
        if (a[mid] < x) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}`,
      why: "On a sorted array, one look at the middle tells you which half can't hold x. Halving each time finds anything among 1000 sheep in about 10 looks.",
      how: ["lo and hi bracket where x could be.", "Look at mid.", "Too small: throw away the left half. Too big: the right half.", "lo > hi means it isn't there."],
      warn: "Only works on sorted data. And <code>lo = mid</code> (not mid + 1) can loop forever.",
      run: { flock: [11, 18, 23, 34, 45, 52, 60, 77, 81], code: `int pos = -1;
int lo = 0;
int hi = n - 1;
while (lo <= hi) {
    int mid = (lo + hi) / 2;
    if (flock[mid] == 60) { pos = mid; break; }
    if (flock[mid] < 60) { lo = mid + 1; } else { hi = mid - 1; }
}` } },
    { id: "main", name: "main",
      code: `int main(void) {
    printf("total %d\\n", sum(flock, n));
    n = insertAt(flock, n, 0, 15);
    n = deleteAt(flock, n, 2);
    reverse(flock, n);
    bubbleSort(flock, n);
    printf("60 is at %d\\n", binarySearch(flock, n, 60));
    return 0;
}`,
      why: "Functions that change how many sheep there are return the new n, and main stores it: the array itself can't tell you its count.",
      how: ["Call each operation in turn.", "Always keep n up to date.", "Sort before binary search."] }
  ]
};

export const HARBOUR_CODEX = {
  title: "stack.c",
  intro: "The trials use push and pop as ready-made words. This is the <b>whole program</b> behind them: a stack built on an array and a top index. Tap a part, read why, then run it on your own quay.",
  parts: [
    { id: "decl", name: "the stack",
      code: `#include <stdio.h>
#define CAP 5

typedef struct {
    int items[CAP];   // the slots, bottom = items[0]
    int top;          // index of the top crate; -1 = empty
} Stack;

void init(Stack* s) { s->top = -1; }`,
      why: "A stack is an array plus one number: where the top is. Everything goes in and out at the top, so there's never any shifting.",
      how: ["items holds the crates bottom to top.", "top is the index of the last crate pushed.", "Empty means top == -1; full means top == CAP - 1."],
      warn: "top is an index, not a count: one crate means top = 0.",
      run: { stacks: [{ name: "s", capacity: 5, initial: [3, 7] }], code: `int t = peek(&s);   // the crate at items[top]` } },
    { id: "empty", name: "isEmpty / isFull",
      code: `int isEmpty(Stack* s) { return s->top == -1; }
int isFull(Stack* s)  { return s->top == CAP - 1; }`,
      why: "Every pop needs the stack not empty, every push needs it not full. These two checks are what stop underflow and overflow.",
      how: ["Compare top with -1 and with CAP - 1."],
      run: { stacks: [{ name: "s", capacity: 3, initial: [4, 9, 2] }], code: `while (!isEmpty(&s)) {
    pop(&s);
}` } },
    { id: "push", name: "push",
      code: `void push(Stack* s, int x) {
    if (isFull(s)) { printf("Overflow\\n"); return; }
    s->top++;              // move up one slot...
    s->items[s->top] = x;  // ...and put the crate there
}`,
      why: "The new crate always goes one above the current top, so the stack grows upward with no searching.",
      how: ["Refuse if full (overflow).", "top goes up by one.", "Store x at items[top]."],
      warn: "Writing first and then incrementing (<code>items[top] = x; top++;</code>) overwrites the old top crate.",
      run: { stacks: [{ name: "s", capacity: 4, initial: [3] }], code: `push(&s, 7);
push(&s, 1);` } },
    { id: "pop", name: "pop",
      code: `int pop(Stack* s) {
    if (isEmpty(s)) { printf("Underflow\\n"); return -1; }
    int x = s->items[s->top];  // take the top crate...
    s->top--;                  // ...then the slot below is the top
    return x;
}`,
      why: "Only the top crate can come out: Last In, First Out. Nothing is erased; top just moves down, and that slot counts as free.",
      how: ["Refuse if empty (underflow).", "Read items[top].", "top goes down by one.", "Return the crate."],
      warn: "Popping an empty stack: in the game the hold is empty and the crate he reaches for isn't there.",
      run: { stacks: [{ name: "s", capacity: 4, initial: [3, 7, 1] }], code: `int a = pop(&s);
int b = pop(&s);` } },
    { id: "peek", name: "peek",
      code: `int peek(Stack* s) {
    if (isEmpty(s)) return -1;
    return s->items[s->top];   // look, don't take
}`,
      why: "Sometimes you only need to know what's on top before deciding. peek reads it without moving top.",
      how: ["Check not empty.", "Return items[top]; top stays the same."],
      run: { stacks: [{ name: "s", capacity: 4, initial: [3, 7] }], code: `int t = peek(&s);` } },
    { id: "reverse", name: "reverse with a stack",
      code: `// pour everything from s into t: the order flips
void moveAll(Stack* s, Stack* t) {
    while (!isEmpty(s)) push(t, pop(s));
}`,
      why: "Because the last in comes out first, pouring one stack into another reverses it. It's the reason stacks reverse words, undo actions and walk back through function calls.",
      how: ["Pop from s.", "Push onto t.", "Repeat until s is empty."],
      run: { stacks: [{ name: "s", capacity: 5, initial: [1, 2, 3, 4] }, { name: "t", capacity: 5, initial: [] }], code: `while (!isEmpty(&s)) {
    push(&t, pop(&s));
}` } },
    { id: "sort", name: "sort with a second stack",
      code: `// sort s into t, biggest on top
void sortStack(Stack* s, Stack* t) {
    while (!isEmpty(s)) {
        int x = pop(s);
        while (!isEmpty(t) && peek(t) > x) push(s, pop(t));
        push(t, x);
    }
}`,
      why: "t is kept sorted at all times. To place x, anything in t bigger than x is moved back to s until x fits, like sliding a card into a sorted hand.",
      how: ["Take x off s.", "While t's top is bigger than x, move it back to s.", "Put x on t.", "Repeat until s is empty."],
      run: { stacks: [{ name: "s", capacity: 5, initial: [34, 3, 77, 12] }, { name: "t", capacity: 5, initial: [] }], code: `while (!isEmpty(&s)) {
    int x = pop(&s);
    while (!isEmpty(&t) && peek(&t) > x) {
        push(&s, pop(&t));
    }
    push(&t, x);
}` } },
    { id: "main", name: "main",
      code: `int main(void) {
    Stack hold; init(&hold);
    push(&hold, 3);   // WINE
    push(&hold, 2);   // BREAD
    push(&hold, 1);   // WATER: loaded last, so out first
    printf("first out: %d\\n", pop(&hold));
    return 0;
}`,
      why: "Load the ship in reverse of the order you need things: the last crate loaded is the first one out.",
      how: ["Make and init the stack.", "Push in reverse order of use.", "Pop gives them back in order of use."],
      run: { stacks: [{ name: "hold", capacity: 3, initial: [] }], code: `push(&hold, 3);
push(&hold, 2);
push(&hold, 1);
int first = pop(&hold);` } }
  ]
};
