package com.dsgame.server.game.levels.cave;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// TRIAL 6 (insert at a position: shift right, from the end)
public class FirstOutLevel extends CaveLevel {
    public FirstOutLevel() {
        super("cave-6", Tier.PRACTICE, "First Out at Dawn",
                "A lamb weighing 15 must be first out of the cave. Everyone else keeps their place in the line.",
                "Put 15 in pen 0; every other sheep moves one pen to the right, in the same order.",
                "Make room from the END: for (int i = n; i > 0; i--) flock[i] = flock[i - 1]; then the lamb, then n++.",
                """
                // flock: 34 52 18 77 45 60 23 81   (n = 8)

                """,
                FLOCK);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> got = pens(in);
        if (got.equals(List.of(15, 34, 52, 18, 77, 45, 60, 23, 81))) {
            return GoalResult.pass("The lamb is first. " + rating(in, 9));
        }
        if (got.size() > 2 && got.stream().skip(1).allMatch(v -> v == 34)) {
            return GoalResult.fail("Every pen holds 34 now. Shifting from the front copies the first sheep "
                    + "into every pen. Start at the end and walk left.");
        }
        if (n(in) == 8) return GoalResult.fail("n is still 8, so the last sheep isn't counted. One more sheep means n++.");
        return GoalResult.fail("The flock is " + show(got) + ". It should be 15 34 52 18 77 45 60 23 81.");
    }
}
