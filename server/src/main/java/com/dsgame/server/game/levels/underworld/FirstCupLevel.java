package com.dsgame.server.game.levels.underworld;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// TRIAL 1 (dequeue): the front of a queue leaves first
public class FirstCupLevel extends UnderworldLevel {
    public FirstCupLevel() {
        super("underworld-1", Tier.PRACTICE, "Now Serving",
                "Odysseus came down here to ask one dead man the way home. First he has to get past the office. "
                        + "The dead are served one at a time, in the order they came. Nobody pushes in. Not here.",
                "Serve the first two souls. Keep who was served in first and second.",
                "dequeue(&line) serves the soul at the FRONT and gives you who it was: first = dequeue(&line);",
                """
                // the line, front to rear: 7 (Elpenor), 12 (Anticleia), 30 (Achilles)
                int first = 0;
                int second = 0;

                """,
                6, 7, 12, 30);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> drank = dequeued(in);
        if (drank.isEmpty()) return GoalResult.fail("Nobody was served. dequeue(&line) serves the soul at the front.");
        if (drank.size() > 2) return GoalResult.fail("Three were served: " + drank + ". Only two tickets tonight.");
        Integer first = var(in, "first"), second = var(in, "second");
        if (first == null || second == null) return GoalResult.fail("Keep who was served in first and second.");
        if (drank.size() < 2) return GoalResult.fail("Only " + drank.get(0) + " was served. Call one more.");
        if (first != 7 || second != 12) {
            return GoalResult.fail("first = " + first + ", second = " + second + ". The ones served were 7, then 12: keep what dequeue gives you.");
        }
        return GoalResult.pass("Elpenor first, then your mother. Achilles waits: " + show(line(in)) + ".");
    }
}
