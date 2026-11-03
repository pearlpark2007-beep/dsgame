// The same kind of steps your Java Stack records, written as JavaScript objects.
// In Milestone 5, these will come from Spring Boot instead of being typed here.
const steps = [
    { action: "PUSH",     index: 0, value: 10, message: "Pushed 10 at index 0" },
    { action: "PUSH",     index: 1, value: 20, message: "Pushed 20 at index 1" },
    { action: "PUSH",     index: 2, value: 30, message: "Pushed 30 at index 2" },
    { action: "OVERFLOW", index: 3, value: 40, message: "Stack is full, can't push 40" },
    { action: "PEEK",     index: 2, value: 30, message: "Top is 30" },
    { action: "POP",      index: 2, value: 30, message: "Popped 30 from index 2" },
    { action: "POP",      index: 1, value: 20, message: "Popped 20 from index 1" }
];

const CAPACITY = 3;

// grab the HTML elements we need, by their id
const stackEl   = document.getElementById("stack");
const messageEl = document.getElementById("message");
const logEl     = document.getElementById("log");
const playBtn   = document.getElementById("playBtn");
const nextBtn   = document.getElementById("nextBtn");
const resetBtn  = document.getElementById("resetBtn");

let current = 0;      // which step comes next
let playing = false;  // true while auto-play is running

// create the empty slots inside the stack box
function drawEmptyStack() {
    stackEl.innerHTML = "";
    for (let i = 0; i < CAPACITY; i++) {
        const slot = document.createElement("div");
        slot.className = "slot";
        slot.id = "slot-" + i;
        stackEl.appendChild(slot);
    }
}

// remove old highlights and shake before the next step
function clearEffects() {
    document.querySelectorAll(".slot.highlight").forEach(s => s.classList.remove("highlight"));
    stackEl.classList.remove("shake");
    void stackEl.offsetWidth;   // tiny trick: lets the shake animation play again
}

// show ONE step on the screen
function applyStep(step) {
    clearEffects();
    const slot = document.getElementById("slot-" + step.index);

    switch (step.action) {
        case "PUSH":
            slot.textContent = step.value;
            slot.classList.add("filled");
            break;

        case "PEEK":
            slot.classList.add("highlight");
            break;

        case "POP":
            slot.classList.add("highlight");    // glow first...
            setTimeout(() => {                  // ...then empty it 0.4 seconds later
                slot.textContent = "";
                slot.classList.remove("filled", "highlight");
            }, 400);
            break;

        case "OVERFLOW":
        case "UNDERFLOW":
            stackEl.classList.add("shake");
            break;
    }

    // show the message, in red if it's an error
    messageEl.textContent = step.message;
    messageEl.className = (step.action === "OVERFLOW" || step.action === "UNDERFLOW") ? "error" : "";

    // add a line to the log
    const li = document.createElement("li");
    li.textContent = step.action + " → " + step.message;
    logEl.appendChild(li);
}

// run the next step; returns false when there are none left
function nextStep() {
    if (current >= steps.length) {
        messageEl.textContent = "Done! Press Reset to watch again.";
        messageEl.className = "";
        return false;
    }
    applyStep(steps[current]);
    current++;
    return true;
}

// wait for some milliseconds
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// play all remaining steps automatically
async function play() {
    if (playing) return;
    playing = true;
    playBtn.disabled = true;
    nextBtn.disabled = true;

    while (nextStep()) {
        await sleep(900);
    }

    playing = false;
    playBtn.disabled = false;
    nextBtn.disabled = false;
}

// start over
function reset() {
    if (playing) return;
    current = 0;
    logEl.innerHTML = "";
    messageEl.textContent = "Press Play to start";
    messageEl.className = "";
    drawEmptyStack();
}

// connect buttons to functions
playBtn.addEventListener("click", play);
nextBtn.addEventListener("click", nextStep);
resetBtn.addEventListener("click", reset);

// when the page first loads
drawEmptyStack();