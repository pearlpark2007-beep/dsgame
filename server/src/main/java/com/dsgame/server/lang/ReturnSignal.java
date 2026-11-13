package com.dsgame.server.lang;

// how 'return' leaves a function: ReturnStmt throws one, the function call catches it
public final class ReturnSignal extends RuntimeException {
    final int value;
    final boolean hasValue;
    final int line;

    ReturnSignal(int value, boolean hasValue, int line) {
        super("return", null, false, false);   // no stack trace: ordinary control flow
        this.value = value;
        this.hasValue = hasValue;
        this.line = line;
    }
}
