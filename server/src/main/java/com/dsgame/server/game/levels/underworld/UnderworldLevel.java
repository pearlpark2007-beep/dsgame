package com.dsgame.server.game.levels.underworld;

import com.dsgame.server.game.Level;
import com.dsgame.server.game.StructureSpec;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;
import com.dsgame.server.lang.RunError;
import com.dsgame.server.lang.TimelineStep;

import java.util.ArrayList;
import java.util.List;

// The Underworld (queues). Hades runs the afterlife like a government office: the dead take a number
// and are served one at a time, in the order they came. A queue.
// They wait on the carousel in the waiting hall (the queue's array, used as a circle).
// The queue is called `line`: enqueue(&line, x) joins the rear, dequeue(&line) serves the front.
// Every Underworld level judges the same things; this class holds them (Level -> UnderworldLevel -> each trial).
public abstract class UnderworldLevel extends Level {
    // who is who (the game shows the names): 7 Elpenor, 12 Anticleia, 30 Achilles, 41 Ajax,
    // 23 Agamemnon, 5 Patroclus, 99 Tiresias, 66 Heracles
    protected static final int TIRESIAS = 99;

    protected UnderworldLevel(String id, Tier tier, String title, String story, String goal, String hint,
                              String starterCode, int capacity, Integer... initial) {
        super(id, "underworld", tier, title, story, goal, hint, starterCode, 0,
                List.of(StructureSpec.queue("line", capacity, initial)));
    }

    // the line now, front to rear
    protected static List<Integer> line(Interpreter in) {
        return in.getStructure("line").snapshot();
    }

    // everyone served from the front of the line, in order (each dequeue)
    protected static List<Integer> dequeued(Interpreter in) {
        List<Integer> out = new ArrayList<>();
        for (TimelineStep s : in.getTimeline()) {
            if (s.action().equals("DEQUEUE") && s.target().equals("line")) out.add(s.value());
        }
        return out;
    }

    // a variable the player was asked to make; null if they never made it
    protected static Integer var(Interpreter in, String name) {
        try {
            return in.getVariable(name, -1);
        } catch (RunError e) {
            return null;
        }
    }

    protected static String show(List<Integer> line) {
        if (line.isEmpty()) return "front | (nobody) | rear";
        StringBuilder sb = new StringBuilder("front | ");
        for (int k = 0; k < line.size(); k++) sb.append(k > 0 ? " " : "").append(line.get(k));
        return sb.append(" | rear").toString();
    }
}
