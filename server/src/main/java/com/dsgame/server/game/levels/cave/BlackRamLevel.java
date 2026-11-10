package com.dsgame.server.game.levels.cave;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

// TRIAL 2 (linear search): find WHICH pen holds a value
public class BlackRamLevel extends CaveLevel {
    public BlackRamLevel() {
        super("cave-2", Tier.PRACTICE, "Where's the Black Ram?",
                "The black ram is the only one weighing 60. Find which pen he is in.",
                "Put the pen number of the sheep weighing 60 into pos. If there were none, pos would stay -1.",
                "Visit every pen; when flock[i] == 60, remember i (the pen), not flock[i] (the weight).",
                """
                // flock: 34 52 18 77 45 60 23 81   (n = 8)
                int pos = -1;

                """,
                FLOCK);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        Integer pos = var(in, "pos");
        if (pos == null) return GoalResult.fail("There is no variable called pos.");
        if (pos == 5) return GoalResult.pass("Pen 5. Found him.");
        if (pos == 60) return GoalResult.fail("pos is 60: that's his weight. You need the pen he's in (the i).");
        if (pos == -1) return GoalResult.fail("pos is still -1, so the search never found him. He is there.");
        return GoalResult.fail("pos is " + pos + ", but pen " + pos + " doesn't hold the ram weighing 60.");
    }
}
