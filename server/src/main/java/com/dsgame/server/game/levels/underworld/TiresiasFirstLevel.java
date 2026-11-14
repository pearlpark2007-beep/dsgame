package com.dsgame.server.game.levels.underworld;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// TRIAL 3 (rotate: dequeue then enqueue): move the front to the back until the one you want is first
public class TiresiasFirstLevel extends UnderworldLevel {
    public TiresiasFirstLevel() {
        super("underworld-3", Tier.PRACTICE, "The Prophet Goes First",
                "Circe was clear: Tiresias, the blind prophet, is the one to ask, and he goes before anyone. He's third in line. "
                        + "A queue has no side door, so the ones in front of him go round to the back.",
                "Serve Tiresias (99) and keep him in prophet. Nobody else is served: everyone in front of him goes to the back, in the same order.",
                "Send the front to the back: enqueue(&line, dequeue(&line)); Do that while peek(&line) is not 99. Then prophet = dequeue(&line);",
                """
                // the line, front to rear: 7, 12, 99 (Tiresias), 30, 41
                int prophet = 0;

                """,
                6, 7, 12, 99, 30, 41);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        Integer prophet = var(in, "prophet");
        List<Integer> line = line(in);
        if (prophet == null) return GoalResult.fail("Keep who was served in prophet.");
        if (prophet != TIRESIAS) return GoalResult.fail("prophet = " + prophet + ". The prophet is 99: send the front to the back until he is first.");
        if (line.contains(TIRESIAS)) return GoalResult.fail("Tiresias is still in line.");
        List<Integer> want = List.of(30, 41, 7, 12);
        if (line.equals(want)) return GoalResult.pass("Tiresias is served. Behind him the line closed up: " + show(line) + ".");
        if (line.size() < 4) {
            return GoalResult.fail("Only " + show(line) + " is left in line. Whoever you dequeue must be enqueued again, or they're gone.");
        }
        return GoalResult.fail("The line reads " + show(line) + ". It should be " + show(want) + ": the same order, just turned round.");
    }
}
