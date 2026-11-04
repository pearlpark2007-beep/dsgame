package com.dsgame.server.lang;

// thrown when the code has a grammar mistake, like a missing ';'
public class CompileError extends RuntimeException {
    private final int line;

    public CompileError(String message, int line) {
        super(message);
        this.line = line;
    }

    public int getLine() { return line; }
}