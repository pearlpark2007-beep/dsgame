package com.dsgame.server.game.levels.cave;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.HashSet;
import java.util.List;

// TRIAL 8 (swap, reverse)
public class BackToFrontLevel extends CaveLevel {
    public BackToFrontLevel() {
        super("cave-8", Tier.PRACTICE, "Back to Front",
                "He lets them out in the order they came in. Tonight the order must be the other way round.",
                "Reverse the whole line of sheep.",
                "Two markers, l at the front and r at the back: swap them (hold one in a temp), move inward, stop when they meet.",
                """
                // flock: 34 52 18 77 45 60 23 81   (n = 8)

                """,
                FLOCK);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> got = pens(in);
        if (got.equals(List.of(81, 23, 60, 45, 77, 18, 52, 34))) {
            return GoalResult.pass("Back to front. " + rating(in, 8));
        }
        if (got.equals(List.of(FLOCK))) {
            return GoalResult.fail("The flock is back how it started: every pair was swapped twice. "
                    + "Stop when the markers meet in the middle.");
        }
        if (new HashSet<>(got).size() < got.size()) {
            return GoalResult.fail("Some sheep are now in two pens and others are gone: " + show(got)
                    + ". A swap needs a temp: int t = flock[l]; flock[l] = flock[r]; flock[r] = t;");
        }
        return GoalResult.fail("The flock is " + show(got) + ". It should be 81 23 60 45 77 18 52 34.");
    }
}
