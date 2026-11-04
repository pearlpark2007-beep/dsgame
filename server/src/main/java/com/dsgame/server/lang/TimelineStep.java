package com.dsgame.server.lang;

// one step for the animation: which structure, what happened, and which line of code caused it
public record TimelineStep(String target, String action, int index, int value, String message, int line) {

    @Override
    public String toString() {
        return "line " + line + " | " + target + " | " + action
                + " [index=" + index + ", value=" + value + "] " + message;
    }
}