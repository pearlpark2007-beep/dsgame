package com.dsgame.server.game.levels.cave;

import com.dsgame.server.ds.ArrayADT;
import com.dsgame.server.game.Level;
import com.dsgame.server.game.StructureSpec;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;
import com.dsgame.server.lang.RunError;
import com.dsgame.server.lang.TimelineStep;

import java.util.List;

// The Cave of Polyphemus (arrays). Every cave level gives the player the same thing: ten carved pens
// in a row, `flock`, with `n` of them in use. This class holds what all of them need to check a win,
// so each level below only says what winning means for it (inheritance: Level -> CaveLevel -> each trial).
public abstract class CaveLevel extends Level {
    public static final int PENS = 10;
    // the flock most trials start with
    protected static final Integer[] FLOCK = {34, 52, 18, 77, 45, 60, 23, 81};

    protected CaveLevel(String id, Tier tier, String title, String story, String goal, String hint,
                        String starterCode, Integer... flock) {
        super(id, "cave", tier, title, story, goal, hint, starterCode, 0,
                List.of(StructureSpec.array("flock", PENS, "n", flock)));
    }

    // ---------- helpers for checkGoal ----------

    // the pens in use right now: the first n
    protected static List<Integer> pens(Interpreter in) {
        return ((ArrayADT) in.getStructure("flock")).firstN(n(in));
    }

    protected static int n(Interpreter in) {
        return in.getVariable("n", -1);
    }

    // a variable the player was asked to make; null if they never made it
    protected static Integer var(Interpreter in, String name) {
        try {
            return in.getVariable(name, -1);
        } catch (RunError e) {
            return null;
        }
    }

    // how many times the code wrote into a pen (the "moves" the ratings count)
    protected static long writes(Interpreter in) {
        return count(in, "WRITE");
    }

    // how many times the code looked into a pen (reads, including junk reads past n)
    protected static long looks(Interpreter in) {
        return count(in, "READ") + count(in, "JUNK");
    }

    protected static boolean readJunk(Interpreter in) {
        return count(in, "JUNK") > 0;
    }

    private static long count(Interpreter in, String action) {
        long c = 0;
        for (TimelineStep step : in.getTimeline()) {
            if (step.target().equals("flock") && step.action().equals(action)) c++;
        }
        return c;
    }

    protected static String show(List<Integer> pens) {
        StringBuilder sb = new StringBuilder();
        for (int v : pens) sb.append(sb.isEmpty() ? "" : " ").append(v);
        return sb.isEmpty() ? "(no sheep)" : sb.toString();
    }

    // "9 writes, the cleanest possible" or "12 writes (cleanest possible: 9)"
    protected static String rating(Interpreter in, int best) {
        long w = writes(in);
        return w <= best ? w + " writes, the cleanest possible." : w + " writes (cleanest possible: " + best + ").";
    }
}
