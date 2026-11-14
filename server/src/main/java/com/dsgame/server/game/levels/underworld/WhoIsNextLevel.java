package com.dsgame.server.game.levels.underworld;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// TRIAL 2 (peek, size): look at the front without serving anyone
public class WhoIsNextLevel extends UnderworldLevel {
    public WhoIsNextLevel() {
        super("underworld-2", Tier.PRACTICE, "Who Stands at the Front",
                "Ajax is at the front. He hasn't forgiven you for the armour of Achilles. "
                        + "Before anyone is called, you want to know who's first and how many are waiting.",
                "Put who is at the front in next and how many wait in waiting. Nobody is served.",
                "peek(&line) tells you who's at the front and leaves him there. size(&line) counts the line.",
                """
                // the line, front to rear: 41 (Ajax), 23 (Agamemnon), 5 (Patroclus)
                int next = 0;
                int waiting = 0;

                """,
                6, 41, 23, 5);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> drank = dequeued(in);
        if (!drank.isEmpty()) return GoalResult.fail(drank.get(0) + " was served. dequeue serves him; peek only looks.");
        Integer next = var(in, "next"), waiting = var(in, "waiting");
        if (next == null || waiting == null) return GoalResult.fail("Keep the answers in next and waiting.");
        if (next != 41) return GoalResult.fail("next = " + next + ". The front of the line is 41.");
        if (waiting != 3) return GoalResult.fail("waiting = " + waiting + ". Count the line: size(&line).");
        return GoalResult.pass("Ajax at the front, three waiting, and nobody called.");
    }
}
