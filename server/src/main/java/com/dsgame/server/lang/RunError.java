package com.dsgame.server.lang;

// thrown when the code is valid but something goes wrong while running it
public class RunError extends RuntimeException {
    private final Outcome outcome;
    private final int line;

    public RunError(Outcome outcome, String message, int line) {
        super(message);
        this.outcome = outcome;
        this.line = line;
    }

    public Outcome getOutcome() { return outcome; }
    public int getLine()        { return line; }
}