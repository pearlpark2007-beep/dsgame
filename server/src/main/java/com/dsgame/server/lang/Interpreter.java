package com.dsgame.server.lang;

import com.dsgame.server.ds.DataStructures;
import com.dsgame.server.ds.Queue;
import com.dsgame.server.ds.Stack;
import com.dsgame.server.ds.Step;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Stage 3: runs the tree on the REAL data structures and builds the timeline
public class Interpreter {
    private static final int MAX_TICKS = 1000;

    private final Map<String, DataStructures> structures = new LinkedHashMap<>();
    private final Map<String, Integer> stepsSeen = new HashMap<>();
    private final List<TimelineStep> timeline = new ArrayList<>();
    private final Deque<Map<String, Integer>> scopes = new ArrayDeque<>();
    private int ticks = 0;

    public Interpreter() {
        scopes.push(new HashMap<>());   // the global scope
    }

    // the world gives the player its structures, e.g. "s" -> a Stack
    public void addStructure(String name, DataStructures ds) {
        structures.put(name, ds);
        stepsSeen.put(name, 0);
    }

    public DataStructures getStructure(String name) {
        return structures.get(name);
    }

    public List<TimelineStep> getTimeline() {
        return List.copyOf(timeline);
    }

    public void run(List<Stmt> program) {
        for (Stmt statement : program) {
            statement.execute(this);
        }
    }

    // ---------- variables and scopes ----------

    public void pushScope() { scopes.push(new HashMap<>()); }
    public void popScope()  { scopes.pop(); }

    public void declare(String name, int value, int line) {
        if (structures.containsKey(name)) {
            throw new RunError(Outcome.RUNTIME_ERROR, "'" + name + "' is already used for a data structure", line);
        }
        Map<String, Integer> currentScope = scopes.peek();
        if (currentScope.containsKey(name)) {
            throw new RunError(Outcome.RUNTIME_ERROR, "Variable '" + name + "' is already declared", line);
        }
        currentScope.put(name, value);
    }

    public int getVariable(String name, int line) {
        for (Map<String, Integer> scope : scopes) {          // innermost scope first
            if (scope.containsKey(name)) return scope.get(name);
        }
        if (structures.containsKey(name)) {
            throw new RunError(Outcome.RUNTIME_ERROR, "'" + name + "' is a data structure, not a number", line);
        }
        throw new RunError(Outcome.RUNTIME_ERROR, "Variable '" + name + "' is not declared", line);
    }

    public void assign(String name, int value, int line) {
        for (Map<String, Integer> scope : scopes) {
            if (scope.containsKey(name)) {
                scope.put(name, value);
                return;
            }
        }
        throw new RunError(Outcome.RUNTIME_ERROR,
                "Variable '" + name + "' is not declared. Did you forget 'int'?", line);
    }

    // ---------- infinite-loop guard ----------

    public void tick(int line) {
        ticks++;
        if (ticks > MAX_TICKS) {
            throw new RunError(Outcome.INFINITE_LOOP,
                    "Your code ran more than " + MAX_TICKS + " steps. Does your loop ever stop?", line);
        }
    }

    // ---------- built-in functions ----------

    public int callFunction(String name, List<Expr> args, int line) {
        tick(line);
        return switch (name) {
            case "push" -> {
                checkArgCount(name, args, 2, line);
                DataStructures ds = structureArg(name, args.get(0), line);
                requireKind(ds instanceof Stack, name, "a stack (use enqueue for a queue)", line);
                ds.insert(args.get(1).evaluate(this));
                collectSteps(line);
                yield 0;
            }
            case "pop" -> {
                checkArgCount(name, args, 1, line);
                DataStructures ds = structureArg(name, args.get(0), line);
                requireKind(ds instanceof Stack, name, "a stack (use dequeue for a queue)", line);
                int value = ds.remove();
                collectSteps(line);
                yield value;
            }
            case "enqueue" -> {
                checkArgCount(name, args, 2, line);
                DataStructures ds = structureArg(name, args.get(0), line);
                requireKind(ds instanceof Queue, name, "a queue (use push for a stack)", line);
                ds.insert(args.get(1).evaluate(this));
                collectSteps(line);
                yield 0;
            }
            case "dequeue" -> {
                checkArgCount(name, args, 1, line);
                DataStructures ds = structureArg(name, args.get(0), line);
                requireKind(ds instanceof Queue, name, "a queue (use pop for a stack)", line);
                int value = ds.remove();
                collectSteps(line);
                yield value;
            }
            case "peek" -> {
                checkArgCount(name, args, 1, line);
                DataStructures ds = structureArg(name, args.get(0), line);
                int value = ds.peek();
                collectSteps(line);
                yield value;
            }
            case "isEmpty" -> {
                checkArgCount(name, args, 1, line);
                yield structureArg(name, args.get(0), line).isEmpty() ? 1 : 0;
            }
            case "isFull" -> {
                checkArgCount(name, args, 1, line);
                yield structureArg(name, args.get(0), line).isFull() ? 1 : 0;
            }
            case "size" -> {
                checkArgCount(name, args, 1, line);
                yield structureArg(name, args.get(0), line).size();
            }
            default -> throw new RunError(Outcome.RUNTIME_ERROR, "Unknown function '" + name + "()'", line);
        };
    }

    private void checkArgCount(String function, List<Expr> args, int expected, int line) {
        if (args.size() != expected) {
            throw new RunError(Outcome.RUNTIME_ERROR,
                    function + "() needs " + expected + " argument(s), but got " + args.size(), line);
        }
    }

    private DataStructures structureArg(String function, Expr arg, int line) {
        if (arg instanceof Expr.VarExpr v && structures.containsKey(v.name())) {
            return structures.get(v.name());
        }
        throw new RunError(Outcome.RUNTIME_ERROR,
                function + "() needs a data structure first, like " + function + "(&s, ...)", line);
    }

    private void requireKind(boolean ok, String function, String kind, int line) {
        if (!ok) {
            throw new RunError(Outcome.RUNTIME_ERROR, function + "() only works on " + kind, line);
        }
    }

    // copy any NEW steps from the structures onto the timeline, and stop on overflow/underflow
    private void collectSteps(int line) {
        for (Map.Entry<String, DataStructures> entry : structures.entrySet()) {
            String name = entry.getKey();
            List<Step> all = entry.getValue().getSteps();
            int seen = stepsSeen.get(name);
            for (int i = seen; i < all.size(); i++) {
                Step step = all.get(i);
                timeline.add(new TimelineStep(name, step.getAction(), step.getIndex(),
                        step.getValue(), step.getMessage(), line));
                checkForFailure(step, line);
            }
            stepsSeen.put(name, all.size());
        }
    }

    private void checkForFailure(Step step, int line) {
        switch (step.getAction()) {
            case "OVERFLOW", "FULL"   -> throw new RunError(Outcome.OVERFLOW, step.getMessage(), line);
            case "UNDERFLOW", "EMPTY" -> throw new RunError(Outcome.UNDERFLOW, step.getMessage(), line);
            default -> { }
        }
    }
}