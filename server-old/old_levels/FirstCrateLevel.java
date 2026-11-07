package com.dsgame.server.game.levels;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Level;
import com.dsgame.server.game.StructureSpec;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

public class FirstCrateLevel extends Level {

    public FirstCrateLevel() {
        super("2-1", 2, "The First Crate",
                "The student lands at the foot of the Call Stack Tower. A lift waits, "
                        + "but it only rises when the KEY crate (99) sits on top of the stack.",
                "Make 99 the top crate of stack s.",
                "push(&s, value) places a crate on top of the stack.",
                """
                // Stack s is empty. Put the key crate (99) on top.
                """,
                List.of(StructureSpec.stack("s", 3)));
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> s = in.getStructure("s").snapshot();
        if (s.isEmpty()) {
            return GoalResult.fail("The stack is empty. The lift doesn't move.");
        }
        int top = s.get(s.size() - 1);
        if (top == 99) {
            return GoalResult.pass("The key is on top! The lift rises.");
        }
        return GoalResult.fail("The top crate is " + top + ", not the key (99).");
    }
}