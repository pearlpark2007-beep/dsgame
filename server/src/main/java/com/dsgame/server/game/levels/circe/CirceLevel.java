package com.dsgame.server.game.levels.circe;

import com.dsgame.server.ds.NodeChain;
import com.dsgame.server.game.Level;
import com.dsgame.server.game.StructureSpec;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;
import com.dsgame.server.lang.RunError;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

// Circe's island (linked lists). Circe has turned the crew into pigs and roped them nose to tail:
// each pig only knows the NEXT pig. The rope from the sty gate to the first pig is `head`.
// Every Circe level starts from the same chain; this class holds what they all need to judge a run,
// so each trial below only says what winning means for it (Level -> CirceLevel -> each trial).
public abstract class CirceLevel extends Level {
    // the men's tags, gate first: head -> 7 -> 12 -> 3 -> 19 -> 5 -> NULL
    protected static final Integer[] STY = {7, 12, 3, 19, 5};

    protected CirceLevel(String id, Tier tier, String title, String story, String goal, String hint, String starterCode) {
        super(id, "circe", tier, title, story, goal, hint, starterCode, 0,
                List.of(StructureSpec.list("sty", "head", STY)));
    }

    // ---------- helpers for checkGoal ----------

    protected static NodeChain chain(Interpreter in) {
        return (NodeChain) in.getStructure("sty");
    }

    protected static int head(Interpreter in) {
        return in.getVariable("head", -1);
    }

    // the tags met walking from head to NULL
    protected static List<Integer> walk(Interpreter in) {
        return chain(in).walk(head(in));
    }

    // the very first node of the level (where head started)
    protected static int gate(Interpreter in) {
        return chain(in).firstAddress();
    }

    // pigs from the starting chain that can no longer be reached from head (and weren't freed on purpose)
    protected static List<Integer> lost(Interpreter in) {
        NodeChain c = chain(in);
        Set<Integer> reach = c.reachable(head(in));
        List<Integer> lost = new ArrayList<>();
        for (int address : c.addresses()) {
            if (c.isNode(address) && !reach.contains(address)) lost.add(c.dataAt(address));
        }
        return lost;
    }

    // a variable the player was asked to make; null if they never made it
    protected static Integer var(Interpreter in, String name) {
        try {
            return in.getVariable(name, -1);
        } catch (RunError e) {
            return null;
        }
    }

    protected static String show(List<Integer> tags) {
        StringBuilder sb = new StringBuilder("head");
        for (int t : tags) sb.append(" -> ").append(t);
        return sb.append(" -> NULL").toString();
    }

    // the shared verdicts every trial checks first: a loop, or pigs cut loose
    protected static String chainBroken(Interpreter in) {
        if (chain(in).loops(head(in))) {
            return "The rope loops back on itself: walking from head never reaches NULL.";
        }
        List<Integer> lost = lost(in);
        if (!lost.isEmpty()) {
            return "Pig" + (lost.size() > 1 ? "s " : " ") + lost + (lost.size() > 1 ? " are" : " is")
                    + " cut loose: nothing points to " + (lost.size() > 1 ? "them" : "it") + " any more, so they're lost in the woods.";
        }
        return null;
    }
}
