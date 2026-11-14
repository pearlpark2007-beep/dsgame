package com.dsgame.server.game;

import com.dsgame.server.ds.ArrayADT;
import com.dsgame.server.ds.DataStructures;
import com.dsgame.server.ds.NodeChain;
import com.dsgame.server.lang.Interpreter;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

// THE LAB: a level the player builds. They choose the starting data (their own flock, their own stacks)
// and write any code they like. There is nothing to win, so the "goal" only reports what the
// structures look like at the end. It is still a Level: the same interpreter, the same structures and the
// same play() run it, which is why one abstract class can serve both the story levels and the Lab
// (inheritance and polymorphism: LevelService never needs to know which kind it is running).
public class SandboxLevel extends Level {
    private static final int MAX_STONES = 8;     // places on the carousel in the waiting hall
    // limits the 3D scenes can show: ten pens in the cave, towers up to six crates on the quay
    public static final int MAX_PENS = 10;
    public static final int MAX_STACKS = 3;
    public static final int MAX_STACK_HEIGHT = 6;
    public static final int MAX_NODES = 8;
    public static final int MIN_VALUE = -999, MAX_VALUE = 999;

    private static final Pattern NAME = Pattern.compile("[a-z][a-z0-9_]{0,9}");
    private static final Set<String> RESERVED = Set.of("int", "if", "else", "while", "for", "break", "continue",
            "push", "pop", "peek", "isEmpty", "isFull", "size", "n", "flock", "return", "head", "sty", "newNode", "free");

    private final List<StructureSpec> specs;

    private SandboxLevel(String island, List<StructureSpec> specs) {
        super("lab-" + island, island, Tier.PRACTICE, "The Lab",
                "Your data, your code. No giant, no clock.",
                "No goal: run any code and watch what it does.",
                null, "", 0, specs);
        this.specs = specs;
    }

    // FACTORY with checks: the browser sends the player's own setup, so nothing is trusted as it arrives.
    // Throws IllegalArgumentException with a plain-English reason when the setup can't be built.
    public static SandboxLevel create(String island, List<StructureSpec> specs) {
        if (specs == null || specs.isEmpty()) throw new IllegalArgumentException("Set up at least one structure first.");
        if ("cave".equals(island)) {
            if (specs.size() != 1) throw new IllegalArgumentException("The cave has one row of pens.");
            StructureSpec s = specs.get(0);
            List<Integer> values = checkValues(s.initial(), MAX_PENS, "pens");
            // the cave's array is always the flock, counted by n, in ten pens
            return new SandboxLevel(island, List.of(StructureSpec.array("flock", MAX_PENS, "n", values.toArray(new Integer[0]))));
        }
        if ("harbour".equals(island)) {
            if (specs.size() > MAX_STACKS) throw new IllegalArgumentException("The quay has room for " + MAX_STACKS + " stacks.");
            Set<String> names = new HashSet<>();
            List<StructureSpec> clean = new java.util.ArrayList<>();
            for (StructureSpec s : specs) {
                String name = s.name() == null ? "" : s.name().trim();
                if (!NAME.matcher(name).matches() || RESERVED.contains(name)) {
                    throw new IllegalArgumentException("'" + name + "' can't be a stack's name: use small letters, like s or spare.");
                }
                if (!names.add(name)) throw new IllegalArgumentException("Two stacks are both called '" + name + "'.");
                int cap = s.capacity();
                if (cap < 1 || cap > MAX_STACK_HEIGHT) throw new IllegalArgumentException("A stack holds 1 to " + MAX_STACK_HEIGHT + " crates (" + name + " asked for " + cap + ").");
                List<Integer> values = checkValues(s.initial(), cap, name);
                clean.add(StructureSpec.stack(name, cap, values.toArray(new Integer[0])));
            }
            return new SandboxLevel(island, clean);
        }
        if ("circe".equals(island)) {
            if (specs.size() != 1) throw new IllegalArgumentException("The sty has one chain of pigs.");
            List<Integer> values = checkValues(specs.get(0).initial(), MAX_NODES, "the chain");
            return new SandboxLevel(island, List.of(StructureSpec.list("sty", "head", values.toArray(new Integer[0]))));
        }
        if ("underworld".equals(island)) {
            // one line of souls round the pit: 3 to 8 stones, the souls already waiting front to rear
            if (specs.size() != 1) throw new IllegalArgumentException("The hall has one queue.");
            int cap = specs.get(0).capacity();
            if (cap < 3 || cap > MAX_STONES) throw new IllegalArgumentException("The carousel has 3 to " + MAX_STONES + " places.");
            List<Integer> values = checkValues(specs.get(0).initial(), cap, "the line");
            return new SandboxLevel(island, List.of(StructureSpec.queue("line", cap, values.toArray(new Integer[0]))));
        }
        throw new IllegalArgumentException("There is no Lab on '" + island + "'.");
    }

    private static List<Integer> checkValues(List<Integer> values, int max, String where) {
        List<Integer> v = values == null ? List.of() : values;
        if (v.size() > max) throw new IllegalArgumentException(where + " can hold " + max + " values, not " + v.size() + ".");
        for (Integer x : v) {
            if (x == null || x < MIN_VALUE || x > MAX_VALUE) throw new IllegalArgumentException("Values must be whole numbers from " + MIN_VALUE + " to " + MAX_VALUE + ".");
        }
        return v;
    }

    // nothing to win: say how every structure ended up
    @Override
    public GoalResult checkGoal(Interpreter in) {
        StringBuilder sb = new StringBuilder("Ran to the end.");
        for (StructureSpec s : specs) {
            DataStructures ds = in.getStructure(s.name());
            if (ds instanceof NodeChain chain) {
                int head = in.getVariable(s.lengthVar(), 0);
                sb.append(" From head: ").append(chain.walk(head)).append(chain.loops(head) ? " ... and round again (it loops)." : " -> NULL.");
            } else if (ds instanceof ArrayADT array) {
                int n = in.getVariable(s.lengthVar(), 0);
                sb.append(" ").append(s.name()).append(" = ").append(array.firstN(n)).append(", n = ").append(n).append(".");
            } else if (ds instanceof com.dsgame.server.ds.Queue) {
                sb.append(" ").append(s.name()).append(", front to rear: ").append(ds.snapshot()).append(".");
            } else {
                List<Integer> items = ds.snapshot();
                sb.append(" ").append(s.name()).append(" = ").append(items).append(" (top = ").append(items.size() - 1).append(").");
            }
        }
        return GoalResult.pass(sb.toString());
    }
}
