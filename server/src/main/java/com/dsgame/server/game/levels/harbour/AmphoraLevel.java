package com.dsgame.server.game.levels.harbour;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Level;
import com.dsgame.server.game.StructureSpec;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

public class AmphoraLevel extends Level {

    public AmphoraLevel() {
        super("harbour-1", "harbour", Tier.NOVICE, "The Golden Amphora",
                "The cargo towers of the harbour can only be climbed from the top crate.",
                "Stack the crates so the golden amphora (99) rests on top.",
                "push(&s, value) places a crate on top of the stack.",
                """
                push(&s, 4);
                push(&s, 7);
                // place the amphora (99) on top:
                """,
                0,
                List.of(StructureSpec.stack("s", 3)));
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> s = in.getStructure("s").snapshot();
        if (s.isEmpty()) {
            return GoalResult.fail("The tower is empty. There is nothing to climb.");
        }
        int top = s.get(s.size() - 1);
        if (top != 99) {
            return GoalResult.fail("The top crate is " + top + ". The amphora is not within reach.");
        }
        if (s.size() < 3) {
            return GoalResult.fail("The amphora is on top, but the tower is too short to reach the ship.");
        }
        return GoalResult.pass("The amphora rests on top.");
    }
}
