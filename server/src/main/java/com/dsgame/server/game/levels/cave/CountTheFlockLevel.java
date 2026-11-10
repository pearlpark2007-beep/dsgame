package com.dsgame.server.game.levels.cave;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

// TRIAL 1 (traverse): walk every pen in use, adding up the weights
public class CountTheFlockLevel extends CaveLevel {
    public CountTheFlockLevel() {
        super("cave-1", Tier.PRACTICE, "Count the Flock",
                "Polyphemus weighs his flock every night by hand. Tonight you do it first.",
                "Add up the weight of every sheep into total.",
                "Start total at 0, then visit pens 0, 1, 2 ... and stop BEFORE pen n: for (int i = 0; i < n; i++)",
                """
                // flock: 34 52 18 77 45 60 23 81   (n = 8, pens 0 to 7)
                int total = 0;

                """,
                FLOCK);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        Integer total = var(in, "total");
        if (total == null) return GoalResult.fail("There is no variable called total.");
        if (total == 390) return GoalResult.pass("390. Every sheep counted once.");
        if (readJunk(in)) {
            return GoalResult.fail("total is " + total + ". Your loop reached pen " + n(in)
                    + ", past the last sheep, and added whatever was lying there. Stop at i < n, not i <= n.");
        }
        return GoalResult.fail("total is " + total + ", but the flock weighs 390.");
    }
}
