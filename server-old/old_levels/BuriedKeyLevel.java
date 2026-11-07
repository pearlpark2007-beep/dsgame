package com.dsgame.server.game.levels;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Level;
import com.dsgame.server.game.StructureSpec;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

public class BuriedKeyLevel extends Level {

    public BuriedKeyLevel() {
        super("2-2", 2, "The Buried Key",
                "Higher up, the key crate is trapped at the BOTTOM of a stack. "
                        + "The tower only lets you take crates from the top, and every crate must be kept.",
                "Get 99 on top of stack s, with all 3 crates still in s.",
                "Use stack t as a temporary pile. You can store a value: int key = pop(&s);",
                """
                // s holds [99, 4, 7]  (99 at the bottom, 7 on top)
                // t is empty and can hold crates for a while
                """,
                List.of(StructureSpec.stack("s", 5, 99, 4, 7),
                        StructureSpec.stack("t", 5)));
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> s = in.getStructure("s").snapshot();
        if (s.isEmpty() || s.get(s.size() - 1) != 99) {
            return GoalResult.fail("The key (99) isn't on top of s.");
        }
        if (s.size() != 3 || !s.contains(4) || !s.contains(7)) {
            return GoalResult.fail("The key is on top, but crates were lost. s must still hold 4 and 7.");
        }
        return GoalResult.pass("The key is on top and nothing was lost! The door opens.");
    }
}