const CAPACITY = 3;

// the operations we ask Java to run
// (every operation sends a value; pop and peek just send 0)
const operations = [
    { type: "push", value: 10 },
    { type: "push", value: 20 },
    { type: "push", value: 30 },
    { type: "push", value: 40 },
    { type: "peek", value: 0 },
    { type: "pop",  value: 0 },
    { type: "pop",  value: 0 }
];

let steps = [];   // filled in by Java

// grab the HTML elements we need, by their id
const stackEl   = document.getElementById("stack");
const messageEl = document.getElementById("message");
const logEl     = document.getElementById("log");
const playBtn   = document.getElementById("playBtn");
const nextBtn   = document.getElementById("nextBtn");
const resetBtn  = document.getElementById("resetBtn");

let current = 0;
let playing = false;

// ask the Java server to run the operations and send back the steps
async function loadSteps() {
    messageEl.textContent = "Asking Java for steps...";
    try {
        const response = await fetch("/api/stack/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ capacity: CAPACITY, operations: operations })
        });
        if (!response.ok) {
            messageEl.textContent = "Server error: " + response.status;
            messageEl.className = "error";
            return;
        }
        steps = await response.json();
        messageEl.textContent = "Got " + steps.length + " steps from Java. Press Play!";
        messageEl.className = "";
    } catch (err) {
        messageEl.textContent = "Can't reach the server. Is Spring Boot running?";
        messageEl.className = "error";
    }
}

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
    void stackEl.offsetWidth;
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
            slot.classList.add("highlight");
            setTimeout(() => {
                slot.textContent = "";
                slot.classList.remove("filled", "highlight");
            }, 400);
            break;
        case "OVERFLOW":
        case "UNDERFLOW":
        case "EMPTY":
            stackEl.classList.add("shake");
            break;
    }

    const isError = ["OVERFLOW", "UNDERFLOW", "EMPTY"].includes(step.action);
    messageEl.textContent = step.message;
    messageEl.className = isError ? "error" : "";

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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

function reset() {
    if (playing) return;
    current = 0;
    logEl.innerHTML = "";
    messageEl.textContent = "Press Play to start";
    messageEl.className = "";
    drawEmptyStack();
}

playBtn.addEventListener("click", play);
nextBtn.addEventListener("click", nextStep);
resetBtn.addEventListener("click", reset);

// when the page first loads
drawEmptyStack();
loadSteps();