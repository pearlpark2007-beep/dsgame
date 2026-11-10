package com.dsgame.server.game.levels.cave;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// TRIAL 5 (insert at the end)
public class TwoLambsLevel extends CaveLevel {
    public TwoLambsLevel() {
        super("cave-5", Tier.PRACTICE, "Two Lambs Born",
                "Two lambs were born in the night, weighing 12 and 9. They go in the next empty pens.",
                "Add 12, then 9, at the end of the flock.",
                "The first empty pen is pen n. Put the lamb there, then n++ so the next one goes after it.",
                """
                // flock: 34 52 18 77 45 60 23 81   (n = 8, pens 8 and 9 are empty)

                """,
                FLOCK);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> want = List.of(34, 52, 18, 77, 45, 60, 23, 81, 12, 9);
        if (pens(in).equals(want)) return GoalResult.pass("Ten pens, ten sheep. The cave is full now.");
        if (n(in) < 10) {
            return GoalResult.fail("n is " + n(in) + ". Each new lamb needs n++, or the next one lands on top of it.");
        }
        return GoalResult.fail("The flock is " + show(pens(in)) + ". It should end ... 81 12 9.");
    }
}
