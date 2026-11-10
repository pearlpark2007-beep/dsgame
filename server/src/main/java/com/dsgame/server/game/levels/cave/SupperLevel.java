package com.dsgame.server.game.levels.cave;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// TRIAL 7 (delete at a position: shift left, from the gap)
public class SupperLevel extends CaveLevel {
    public SupperLevel() {
        super("cave-7", Tier.PRACTICE, "The Cyclops' Supper",
                "Polyphemus takes the sheep in pen 2 for his supper. The pen can't stay empty: he'd notice a gap.",
                "Remove the sheep in pen 2 and close the gap, keeping everyone else in order.",
                "From the gap, each sheep steps one pen left: for (int i = 2; i < n - 1; i++) flock[i] = flock[i + 1]; then n--.",
                """
                // flock: 34 52 18 77 45 60 23 81   (n = 8)

                """,
                FLOCK);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> got = pens(in);
        if (got.equals(List.of(34, 52, 77, 45, 60, 23, 81))) {
            return GoalResult.pass("No gap, nothing missing. " + rating(in, 5));
        }
        if (n(in) == 8 && got.size() == 8 && got.get(6) == 81 && got.get(7) == 81) {
            return GoalResult.fail("The last sheep is counted twice: 81 is still in pen 7 as well as pen 6. "
                    + "One sheep fewer means n--.");
        }
        return GoalResult.fail("The flock is " + show(got) + ". It should be 34 52 77 45 60 23 81.");
    }
}
