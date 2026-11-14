package com.dsgame.server.game.levels.underworld;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// TRIAL 4 (isFull): join only while there is room
public class PitHoldsFiveLevel extends UnderworldLevel {
    public PitHoldsFiveLevel() {
        super("underworld-4", Tier.PRACTICE, "Five Seats",
                "Five places on the carousel. Three souls already wait; three more come through the door. "
                        + "Enqueue into a full queue and the line breaks.",
                "Let the newcomers join while there's room. Count the ones sent back to wait outside in turned.",
                "Before each enqueue ask isFull(&line). Full: turned++; instead.",
                """
                // the line, front to rear: 7, 12, 30   (5 places)
                int arrivals[3] = {41, 23, 5};
                int turned = 0;

                """,
                5, 7, 12, 30);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> line = line(in);
        Integer turned = var(in, "turned");
        if (!dequeued(in).isEmpty()) return GoalResult.fail("Someone was served. Tonight you only let them join.");
        if (turned == null) return GoalResult.fail("Count the ones sent back outside in turned.");
        if (!line.equals(List.of(7, 12, 30, 41, 23))) {
            return GoalResult.fail("The line reads " + show(line) + ". It should be " + show(List.of(7, 12, 30, 41, 23)) + ": newcomers join at the rear, in the order they came.");
        }
        if (turned != 1) return GoalResult.fail("turned = " + turned + ". Exactly one soul found the line full.");
        return GoalResult.pass("Five on the carousel, and Patroclus waits outside. No one broke the line.");
    }
}
