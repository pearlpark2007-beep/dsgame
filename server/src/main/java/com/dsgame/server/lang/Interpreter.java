package com.dsgame.server.lang;

import com.dsgame.server.ds.ArrayADT;
import com.dsgame.server.ds.DataStructures;
import com.dsgame.server.ds.Queue;
import com.dsgame.server.ds.Stack;
import com.dsgame.server.ds.Step;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.IdentityHashMap;
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
    // arrays the player declares (int a[5];) live in scopes too, beside the numbers
    private final Deque<Map<String, ArrayADT>> arrayScopes = new ArrayDeque<>();
    private final Map<ArrayADT, Integer> localStepsSeen = new IdentityHashMap<>();
    // a level's array and the variable that holds how many cells are in use, e.g. "flock" -> "n"
    private final Map<String, String> lengthVars = new HashMap<>();
    private int ticks = 0;

    public Interpreter() {
        scopes.push(new HashMap<>());   // the global scope
        arrayScopes.push(new HashMap<>());
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

    public void pushScope() { scopes.push(new HashMap<>()); arrayScopes.push(new HashMap<>()); }
    public void popScope()  { scopes.pop(); arrayScopes.pop(); }

    // a level hands the player an array AND its length, e.g. flock with n = 8
    public void bindLength(String arrayName, String lengthVar, int length) {
        lengthVars.put(arrayName, lengthVar);
        declare(lengthVar, length, 0);
    }

    public void declare(String name, int value, int line) {
        if (structures.containsKey(name)) {
            throw new RunError(Outcome.RUNTIME_ERROR, "'" + name + "' is already used for a data structure", line);
        }
        Map<String, Integer> currentScope = scopes.peek();
        if (currentScope.containsKey(name) || arrayScopes.peek().containsKey(name)) {
            throw new RunError(Outcome.RUNTIME_ERROR, "Variable '" + name + "' is already declared", line);
        }
        currentScope.put(name, value);
    }

    public int getVariable(String name, int line) {
        for (Map<String, Integer> scope : scopes) {          // innermost scope first
            if (scope.containsKey(name)) return scope.get(name);
        }
        if (structures.containsKey(name) || findArray(name) != null) {
            throw new RunError(Outcome.RUNTIME_ERROR, "'" + name + "' is a row of cells: pick one, like "
                    + name + "[0]", line);
        }
        throw new RunError(Outcome.RUNTIME_ERROR, "Variable '" + name + "' is not declared", line);
    }

    // ---------- arrays ----------

    public void declareArray(String name, int size, int[] initial, int line) {
        if (size < 1 || size > 1000) {
            throw new RunError(Outcome.RUNTIME_ERROR, "An array needs between 1 and 1000 cells, not " + size, line);
        }
        if (initial != null && initial.length > size) {
            throw new RunError(Outcome.RUNTIME_ERROR, "Too many values for " + name + "[" + size + "]", line);
        }
        if (structures.containsKey(name) || scopes.peek().containsKey(name) || arrayScopes.peek().containsKey(name)) {
            throw new RunError(Outcome.RUNTIME_ERROR, "'" + name + "' is already declared", line);
        }
        ArrayADT array = new ArrayADT(name, size);
        if (initial != null) {
            // as in C: listed values go first, the rest of the cells become 0
            for (int i = 0; i < size; i++) array.set(i, i < initial.length ? initial[i] : 0);
            array.clearSteps();
        }
        arrayScopes.peek().put(name, array);
        localStepsSeen.put(array, 0);
    }

    // the player's own array (innermost first), or a level's array
    private ArrayADT findArray(String name) {
        for (Map<String, ArrayADT> scope : arrayScopes) {
            if (scope.containsKey(name)) return scope.get(name);
        }
        return (structures.get(name) instanceof ArrayADT a) ? a : null;
    }

    private ArrayADT arrayOrError(String name, int line) {
        ArrayADT array = findArray(name);
        if (array != null) return array;
        if (structures.containsKey(name)) {
            throw new RunError(Outcome.RUNTIME_ERROR, "'" + name + "' is not an array, so it has no [ ]", line);
        }
        throw new RunError(Outcome.RUNTIME_ERROR, "There is no array called '" + name + "'", line);
    }

    // how many cells are really in use: the level's n, or every cell for the player's own arrays
    private int lengthOf(String name, ArrayADT array, int line) {
        String var = lengthVars.get(name);
        return (var != null && findArray(name) == structures.get(name)) ? getVariable(var, line) : array.capacity();
    }

    public int readIndex(String name, int index, int line) {
        ArrayADT array = arrayOrError(name, line);
        int value = array.get(index, lengthOf(name, array, line));
        collectSteps(line);
        return value;
    }

    public void writeIndex(String name, int index, int value, int line) {
        arrayOrError(name, line).set(index, value);
        collectSteps(line);
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
        for (Map<String, ArrayADT> scope : arrayScopes) {
            for (Map.Entry<String, ArrayADT> entry : scope.entrySet()) {
                ArrayADT array = entry.getValue();
                List<Step> all = array.getSteps();
                int seen = localStepsSeen.getOrDefault(array, 0);
                for (int i = seen; i < all.size(); i++) {
                    Step step = all.get(i);
                    timeline.add(new TimelineStep(entry.getKey(), step.getAction(), step.getIndex(),
                            step.getValue(), step.getMessage(), line));
                    localStepsSeen.put(array, i + 1);
                    checkForFailure(step, line);
                }
            }
        }
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
            case "OUT_OF_BOUNDS"      -> throw new RunError(Outcome.OUT_OF_BOUNDS, step.getMessage(), line);
            default -> { }
        }
    }
}