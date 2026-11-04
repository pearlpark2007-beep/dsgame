package com.dsgame.server.lang;

import java.util.List;

// one simple entry point: give it code and a prepared interpreter, get back a RunResult
public class CodeRunner {

    public RunResult run(String code, Interpreter interpreter) {
        List<Stmt> program;
        try {
            program = new Parser(new Lexer(code).tokenize()).parseProgram();
        } catch (CompileError e) {
            return new RunResult(Outcome.COMPILE_ERROR, e.getMessage(), e.getLine(), List.of());
        }

        try {
            interpreter.run(program);
        } catch (RunError e) {
            return new RunResult(e.getOutcome(), e.getMessage(), e.getLine(), interpreter.getTimeline());
        }

        return new RunResult(Outcome.SUCCESS, "Program finished", -1, interpreter.getTimeline());
    }
}