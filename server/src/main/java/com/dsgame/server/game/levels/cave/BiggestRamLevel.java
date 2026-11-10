package com.dsgame.server.game.levels.cave;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

// TRIAL 3 (max): which pen holds the biggest value
public class BiggestRamLevel extends CaveLevel {
    public BiggestRamLevel() {
        super("cave-3", Tier.PRACTICE, "The Biggest Ram",
                "Homer says Odysseus picked the biggest ram of the flock for himself. Which pen is it in?",
                "Put the pen number of the heaviest sheep into big.",
                "Assume pen 0 is the biggest (big = 0), then check pens 1 to n-1: if flock[i] > flock[big], big = i.",
                """
                // flock: 34 52 18 77 45 60 23 81   (n = 8)
                int big = 0;

                """,
                FLOCK);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        Integer big = var(in, "big");
        if (big == null) return GoalResult.fail("There is no variable called big.");
        if (big == 7) return GoalResult.pass("Pen 7: 81, the biggest ram in the cave.");
        if (big == 81) return GoalResult.fail("big is 81: that's the biggest weight. Store the pen (the i), not the weight.");
        return GoalResult.fail("big is " + big + ", but the heaviest sheep is not in pen " + big + ".");
    }
}
