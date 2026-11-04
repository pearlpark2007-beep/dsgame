package com.dsgame.server.game.levels;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Level;
import com.dsgame.server.game.StructureSpec;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

public class FerryLineLevel extends Level {

    public FerryLineLevel() {
        super("2-3", 2, "The Ferry Line",
                "At the top of the tower, a ferry carries passengers across the gap, strictly first-in, first-out. "
                        + "But they queued in the wrong order: the ferry must take 4 first and 1 last.",
                "Reverse queue q so it becomes [4, 3, 2, 1].",
                "A stack reverses order. Move everyone from q into s, then back into q. Loops will help.",
                """
                // q holds [1, 2, 3, 4]  (1 at the front)
                // s is an empty stack
                """,
                List.of(StructureSpec.queue("q", 5, 1, 2, 3, 4),
                        StructureSpec.stack("s", 5)));
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> q = in.getStructure("q").snapshot();
        if (q.equals(List.of(4, 3, 2, 1))) {
            return GoalResult.pass("The line is reversed! The ferry sets off.");
        }
        return GoalResult.fail("The queue is " + q + ", but the ferry needs [4, 3, 2, 1].");
    }
}