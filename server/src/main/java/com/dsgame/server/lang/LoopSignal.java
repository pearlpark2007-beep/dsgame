package com.dsgame.server.lang;

// how 'break' and 'continue' leave a loop: the statement throws one of these and the loop catches it.
// (The parser makes sure they are only used inside a loop.)
public final class LoopSignal extends RuntimeException {
    public static final LoopSignal BREAK = new LoopSignal("break");
    public static final LoopSignal CONTINUE = new LoopSignal("continue");

    private LoopSignal(String which) {
        super(which, null, false, false);   // no stack trace: this is ordinary control flow, not an error
    }
}
