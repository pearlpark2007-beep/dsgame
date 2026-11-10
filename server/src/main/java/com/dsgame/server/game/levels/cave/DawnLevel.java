package com.dsgame.server.game.levels.cave;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// FINALE: everything at once. Remove the thin sheep, bring the biggest ram to the front,
// add the lamb at the end, count the hiding places, and keep n right the whole time.
public class DawnLevel extends CaveLevel {
    private static final List<Integer> WANT = List.of(95, 41, 63, 50, 70, 33, 58, 20);

    public DawnLevel() {
        super("cave-finale", Tier.FINALE, "Dawn",
                "The last hour before dawn. Polyphemus will let the flock out in pen order, feeling every back, "
                        + "and he knows how many there should be. All ten pens are full.",
                "1. Remove every sheep under 30, keeping the rest in order.  2. Bring the biggest ram to pen 0, "
                        + "everyone else in order.  3. Add the lamb (20) at the end.  4. Count the sheep after the ram "
                        + "weighing 30 or more into hidden.  5. Keep n right.",
                "The pens are full: make room before you add anything. After removing a sheep, look at the same pen again.",
                """
                // flock: 41 18 27 63 95 50 12 70 33 58   (n = 10, every pen full)

                int hidden = 0;
                """,
                41, 18, 27, 63, 95, 50, 12, 70, 33, 58);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> got = pens(in);
        Integer hidden = var(in, "hidden");
        if (got.stream().anyMatch(v -> v < 30 && v != 20)) {
            return GoalResult.fail("A thin sheep is still in the line: " + show(got) + ". After removing a sheep, "
                    + "the next one slides into the same pen; check that pen again before moving on.");
        }
        if (got.isEmpty() || got.get(0) != 95) {
            return GoalResult.fail("Pen 0 holds " + (got.isEmpty() ? "nothing" : got.get(0))
                    + ". The biggest ram (95) must go out first, with Odysseus under it.");
        }
        if (!got.equals(WANT)) {
            if (n(in) != WANT.size()) {
                return GoalResult.fail("He counts " + n(in) + " sheep but expects " + WANT.size() + ": " + show(got) + ".");
            }
            return GoalResult.fail("The line is " + show(got) + ". It should be 95 41 63 50 70 33 58 20.");
        }
        if (hidden == null || hidden != 6) {
            return GoalResult.fail("The line is right, but hidden is " + hidden + ". Six sheep after the ram weigh 30 or more.");
        }
        long w = writes(in);
        String stars = w <= 10 ? "Out in " + w + " writes, the cleanest escape there is."
                : w <= 22 ? "Out in " + w + " writes. A two-marker sweep does it in 10."
                : "Out, in " + w + " writes. The clean way takes 22, the cleverest 10.";
        return GoalResult.pass("Ninety-five first, six men under six sheep, the lamb last. " + stars);
    }
}
