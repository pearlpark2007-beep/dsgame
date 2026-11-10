package com.dsgame.server.game.levels.cave;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

// TRIAL 4 (count with a test)
public class TooThinLevel extends CaveLevel {
    public TooThinLevel() {
        super("cave-4", Tier.PRACTICE, "Too Thin to Hide a Man",
                "A man clinging under a sheep needs a big sheep. Anything under 30 is too thin.",
                "Count the sheep weighing under 30 into thin.",
                "thin starts at 0; visit every pen and add 1 when flock[i] < 30.",
                """
                // flock: 34 52 18 77 45 60 23 81   (n = 8)
                int thin = 0;

                """,
                FLOCK);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        Integer thin = var(in, "thin");
        if (thin == null) return GoalResult.fail("There is no variable called thin.");
        if (thin == 2) return GoalResult.pass("Two: the ones weighing 18 and 23.");
        return GoalResult.fail("thin is " + thin + ", but two sheep weigh under 30 (18 and 23).");
    }
}
