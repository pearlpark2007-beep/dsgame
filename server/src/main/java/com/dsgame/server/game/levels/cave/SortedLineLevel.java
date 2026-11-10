package com.dsgame.server.game.levels.cave;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

// BONUS (binary search on a sorted line): find it in 4 looks or fewer
public class SortedLineLevel extends CaveLevel {
    public SortedLineLevel() {
        super("cave-bonus", Tier.PRACTICE, "The Sorted Line",
                "The flock stands lightest to heaviest. Feeling every sheep wakes him; you get four touches.",
                "Put the pen of the sheep weighing 60 into pos, looking at no more than 4 pens.",
                "Look at the middle pen. Too light? The answer is to the right, so forget the left half. Repeat.",
                """
                // flock, sorted: 18 23 34 45 52 60 77 81   (n = 8)
                int pos = -1;

                """,
                18, 23, 34, 45, 52, 60, 77, 81);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        Integer pos = var(in, "pos");
        if (pos == null) return GoalResult.fail("There is no variable called pos.");
        if (pos != 5) return GoalResult.fail("pos is " + pos + ", but the sheep weighing 60 is in pen 5.");
        long looks = looks(in);
        if (looks > 4) {
            return GoalResult.fail("Found him, but you touched " + looks + " sheep. Halve the line each time "
                    + "and you need 4 at most.");
        }
        return GoalResult.pass("Pen 5, in " + looks + " looks. Walking the line could take 8.");
    }
}
