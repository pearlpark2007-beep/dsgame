package com.dsgame.server.lang;

import com.dsgame.server.ds.ArrayADT;
import com.dsgame.server.ds.DataStructures;
import com.dsgame.server.ds.NodeChain;
import com.dsgame.server.ds.Queue;
import com.dsgame.server.ds.Stack;
import com.dsgame.server.ds.Step;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
    // names declared as pointers (Node* p): their changes go on the timeline as PTR, so the game draws an arrow
    private final Set<String> pointerNames = new HashSet<>();
    // functions the player wrote (createNode, insertAtEnd...), and how deep the calls go right now
    private final Map<String, Function> functions = new HashMap<>();
    private int depth = 0;
    private int printed = 0;          // characters printf has written (a runaway loop can't flood the console)
    private static final int MAX_DEPTH = 60, MAX_PRINT = 4000;

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
        // every function is known before anything runs (so the order they are written in doesn't matter)
        for (Stmt statement : program) {
            if (statement instanceof Stmt.FunctionDefStmt def) {
                if (functions.containsKey(def.function().name())) {
                    throw new RunError(Outcome.COMPILE_ERROR, "The function " + def.function().name() + "() is written twice", def.function().line());
                }
                functions.put(def.function().name(), def.function());
            }
        }
        boolean mainCalled = false;
        for (Stmt statement : program) {
            if (statement instanceof Stmt.FunctionDefStmt) continue;
            statement.execute(this);
        }
        // a whole C program: run main() (only when nothing at the top level already did the work)
        Function main = functions.get("main");
        if (main != null && program.stream().allMatch(Interpreter::onlyDeclares)) {
            callUser(main, List.of(), main.line());
        }
    }

    // a top-level line that only sets things up (a function, a struct, a global variable or array):
    // a program made of these alone is a whole C file, so main() is where it starts
    private static boolean onlyDeclares(Stmt s) {
        if (s instanceof Stmt.FunctionDefStmt || s instanceof Stmt.StructDefStmt || s instanceof Stmt.DeclareStmt
                || s instanceof Stmt.DeclarePointerStmt || s instanceof Stmt.DeclareArrayStmt) return true;
        if (s instanceof Stmt.ListStmt list) return list.statements().stream().allMatch(Interpreter::onlyDeclares);
        return false;
    }

    // ---------- the player's own functions ----------

    private int callUser(Function fn, List<Expr> args, int line) {
        if (depth >= MAX_DEPTH) {
            throw new RunError(Outcome.INFINITE_LOOP, "More than " + MAX_DEPTH + " calls inside calls. Does " + fn.name() + "() call itself forever?", line);
        }
        if (args.size() != fn.params().size()) {
            throw new RunError(Outcome.RUNTIME_ERROR, fn.name() + "() needs " + fn.params().size() + " argument(s), but got " + args.size(), line);
        }
        // the arguments are worked out where the call is (C passes COPIES of them)
        int[] values = new int[args.size()];
        for (int k = 0; k < values.length; k++) values[k] = args.get(k).evaluate(this);
        StringBuilder call = new StringBuilder(fn.name()).append("(");
        for (int k = 0; k < values.length; k++) {
            Function.Param p = fn.params().get(k);
            call.append(k > 0 ? ", " : "").append(p.name()).append(" = ").append(p.pointer() ? NodeChain.hex(values[k]) : String.valueOf(values[k]));
        }
        call.append(")");
        timeline.add(new TimelineStep(fn.name(), "CALL", depth + 1, 0, call.toString(), line));

        // a fresh set of variables: the function sees only its own, and the global ones
        List<Map<String, Integer>> savedScopes = new ArrayList<>(scopes);
        List<Map<String, ArrayADT>> savedArrays = new ArrayList<>(arrayScopes);
        Map<String, Integer> global = scopes.peekLast();
        Map<String, ArrayADT> globalArrays = arrayScopes.peekLast();
        scopes.clear(); arrayScopes.clear();
        scopes.push(global); arrayScopes.push(globalArrays);
        scopes.push(new HashMap<>()); arrayScopes.push(new HashMap<>());
        depth++;
        int result = 0;
        boolean returned = false, ok = false;
        Set<String> locals = new LinkedHashSet<>();
        try {
            for (int k = 0; k < values.length; k++) {
                Function.Param p = fn.params().get(k);
                if (p.pointer()) declarePointer(p.name(), values[k], fn.line());
                else declare(p.name(), values[k], fn.line());
            }
            try {
                for (Stmt s : fn.body()) s.execute(this);
            } catch (ReturnSignal r) {
                result = r.value; returned = r.hasValue;
            }
            if (!returned && !fn.returns().equals("void")) {
                throw new RunError(Outcome.RUNTIME_ERROR, fn.name() + "() reached its closing '}' without a 'return'", line);
            }
            ok = true;
        } catch (LoopSignal signal) {
            throw new RunError(Outcome.COMPILE_ERROR, "'break' or 'continue' outside a loop in " + fn.name() + "()", line);
        } finally {
            depth--;
            locals.addAll(scopes.peek().keySet());
            scopes.clear(); arrayScopes.clear();
            for (int k = savedScopes.size() - 1; k >= 0; k--) scopes.push(savedScopes.get(k));
            for (int k = savedArrays.size() - 1; k >= 0; k--) arrayScopes.push(savedArrays.get(k));
        }
        if (ok) {
            // first the answer leaves the function; then its variables are gone, and a name the caller
            // also has (head inside deleteFirst) shows the caller's value again
            String what = fn.returns().equals("void") ? fn.name() + "() is done"
                    : fn.name() + "() returns " + (fn.returns().equals("pointer") ? NodeChain.hex(result) : String.valueOf(result));
            timeline.add(new TimelineStep(fn.name(), "RETURN", depth + 1, result, what, line));
            for (String name : locals) forget(name, line);
        }
        return result;
    }

    // a variable left its block or function: show the outer one with that name again, or drop it
    private void forget(String name, int line) {
        for (Map<String, Integer> scope : scopes) {
            if (scope.containsKey(name)) { recordVar(name, scope.get(name), line); return; }
        }
        timeline.add(new TimelineStep(name, "DROP", 0, 0, name + " is gone", line));
    }

    // printf("%d -> ", temp->data);
    private int printf(List<Expr> args, int line) {
        if (args.isEmpty() || !(args.get(0) instanceof Expr.StringExpr fmt)) {
            throw new RunError(Outcome.RUNTIME_ERROR, "printf needs a \"text\" first, like printf(\"%d\\n\", x)", line);
        }
        StringBuilder out = new StringBuilder();
        String f = fmt.text();
        int next = 1;
        for (int k = 0; k < f.length(); k++) {
            char c = f.charAt(k);
            if (c == '%' && k + 1 < f.length()) {
                char spec = f.charAt(++k);
                if (spec == '%') { out.append('%'); continue; }
                if (next >= args.size()) throw new RunError(Outcome.RUNTIME_ERROR, "printf has a %" + spec + " but no value for it", line);
                int v = args.get(next++).evaluate(this);
                out.append(spec == 'p' ? NodeChain.hex(v) : String.valueOf(v));
            } else out.append(c);
        }
        printed += out.length();
        if (printed > MAX_PRINT) throw new RunError(Outcome.INFINITE_LOOP, "printf has printed more than " + MAX_PRINT + " characters. Does a loop ever stop?", line);
        timeline.add(new TimelineStep("console", "PRINT", 0, 0, out.toString(), line));
        return out.length();
    }

    // ---------- variables and scopes ----------

    public void pushScope() { scopes.push(new HashMap<>()); arrayScopes.push(new HashMap<>()); }
    public void popScope()  { popScope(true); }
    // ok: the block ended normally (or by break/continue/return): the game is told its variables are gone
    public void popScope(boolean ok) {
        Map<String, Integer> gone = scopes.pop();
        arrayScopes.pop();
        if (ok) for (String name : gone.keySet()) forget(name, 0);
    }

    // a level hands the player an array AND its length, e.g. flock with n = 8
    public void bindLength(String arrayName, String lengthVar, int length) {
        lengthVars.put(arrayName, lengthVar);
        declare(lengthVar, length, 0);
    }

    // a level hands the player a list AND the pointer to its first node, e.g. head
    public void bindPointer(String pointerName, int address) {
        declarePointer(pointerName, address, 0);
    }

    public void declarePointer(String name, int address, int line) {
        pointerNames.add(name);
        declare(name, address, line);
    }

    public boolean isPointer(String name) {
        return pointerNames.contains(name);
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
        recordVar(name, value, line);
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
        if (initial == null && scopes.size() == 1 && depth == 0) {
            // a global array with no values is all zeros in C (only local arrays start with junk)
            for (int i = 0; i < size; i++) array.set(i, 0);
            array.clearSteps();
        } else if (initial != null) {
            // as in C: listed values go first, the rest of the cells become 0
            for (int i = 0; i < size; i++) array.set(i, i < initial.length ? initial[i] : 0);
            array.clearSteps();
        }
        arrayScopes.peek().put(name, array);
        localStepsSeen.put(array, 0);
        // the game draws the array from its first moment: its size, and every cell's starting value
        StringBuilder cells = new StringBuilder();
        List<Integer> start = array.firstN(size);
        for (int i = 0; i < size; i++) cells.append(i > 0 ? " " : "").append(start.get(i));
        timeline.add(new TimelineStep(name, "ARRAY", size, 0, "int " + name + "[" + size + "]: " + cells, line));
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
                recordVar(name, value, line);
                recordLength(name, value, line);
                return;
            }
        }
        throw new RunError(Outcome.RUNTIME_ERROR,
                "Variable '" + name + "' is not declared. Did you forget 'int'?", line);
    }

    // every time a plain int variable gets a value (int i = 0; total = total + ...; i++), put it on the
    // timeline as a VAR step: the game's array board draws i, j, lo, hi... as arrows over the cells
    private void recordVar(String name, int value, int line) {
        if (pointerNames.contains(name)) {
            timeline.add(new TimelineStep(name, "PTR", 0, value, name + " = " + NodeChain.hex(value), line));
            return;
        }
        timeline.add(new TimelineStep(name, "VAR", 0, value, name + " = " + value, line));
    }

    // ---------- pointers and nodes (Chapter 3) ----------

    // the island's node memory (there is one per level that uses lists)
    private NodeChain chain(int line) {
        for (DataStructures ds : structures.values()) {
            if (ds instanceof NodeChain c) return c;
        }
        throw new RunError(Outcome.RUNTIME_ERROR, "There are no nodes here: Node* only works on Circe's island", line);
    }

    // p->data   p->next
    public int readField(int address, String field, String who, int line) {
        NodeChain c = chain(line);
        int value = field.equals("data") ? c.getData(address, who) : c.getNext(address, who);
        collectSteps(line);
        return value;
    }

    // p->data = v   p->next = q
    public void writeField(int address, String field, int value, String who, int line) {
        NodeChain c = chain(line);
        if (field.equals("data")) c.setData(address, value, who);
        else c.setNext(address, value, who);
        collectSteps(line);
    }

    // when the player changes an array's length variable (n = n + 1), the game shows the rope and
    // the "n =" sign move: put that change on the timeline as a LENGTH step for that array
    private void recordLength(String name, int value, int line) {
        for (Map.Entry<String, String> entry : lengthVars.entrySet()) {
            if (entry.getValue().equals(name)) {
                timeline.add(new TimelineStep(entry.getKey(), "LENGTH", value, value,
                        name + " = " + value + " (pens in use)", line));
            }
        }
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
        Function fn = functions.get(name);
        if (fn != null) return callUser(fn, args, line);
        return switch (name) {
            case "malloc" -> {
                checkArgCount(name, args, 1, line);
                args.get(0).evaluate(this);
                NodeChain c = chain(line);
                int address = c.allocate();
                collectSteps(line);
                yield address;
            }
            case "printf" -> printf(args, line);
            case "exit" -> throw new RunError(Outcome.RUNTIME_ERROR, "exit(" + (args.isEmpty() ? "" : args.get(0).evaluate(this)) + "): the program stopped itself", line);
            case "scanf" -> throw new RunError(Outcome.RUNTIME_ERROR, "scanf waits for a keyboard: on Aeaea the values are written into the code (or set in the Lab)", line);
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
            case "newNode" -> {
                checkArgCount(name, args, 1, line);
                NodeChain c = chain(line);
                int address = c.newNode(args.get(0).evaluate(this));
                collectSteps(line);
                yield address;
            }
            case "free" -> {
                checkArgCount(name, args, 1, line);
                NodeChain c = chain(line);
                Expr arg = args.get(0);
                c.free(arg.evaluate(this), (arg instanceof Expr.VarExpr v) ? v.name() : "that pointer");
                collectSteps(line);
                yield 0;
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
            case "NULL_DEREF"         -> throw new RunError(Outcome.NULL_POINTER, step.getMessage(), line);
            case "NO_MEMORY"          -> throw new RunError(Outcome.OVERFLOW, step.getMessage(), line);
            default -> { }
        }
    }
}