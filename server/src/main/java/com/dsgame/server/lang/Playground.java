package com.dsgame.server.lang;

import com.dsgame.server.ds.Queue;
import com.dsgame.server.ds.Stack;

// run this directly to test the interpreter in the console
public class Playground {
    public static void main(String[] args) {
        String code = """
                push(&s, 7);
                pop(&s);
                pop(&s);
                """;

        Interpreter interpreter = new Interpreter();
        interpreter.addStructure("s", new Stack(5));
        interpreter.addStructure("q", new Queue(5));

        RunResult result = new CodeRunner().run(code, interpreter);

        System.out.println("Outcome: " + result.outcome() + " - " + result.message()
                + (result.line() > 0 ? " (line " + result.line() + ")" : ""));
        for (TimelineStep step : result.steps()) {
            System.out.println(step);
        }
    }
}