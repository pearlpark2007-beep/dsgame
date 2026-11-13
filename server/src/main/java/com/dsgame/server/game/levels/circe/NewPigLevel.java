package com.dsgame.server.game.levels.circe;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// TRIAL 3 (insert at the head): a new node in front, without dropping the rest
public class NewPigLevel extends CirceLevel {
    public NewPigLevel() {
        super("circe-3", Tier.PRACTICE, "A New Pig at the Gate",
                "Elpenor wandered in late, drunk, and Circe got him too: tag 22. "
                        + "He has to go at the front of the rope, by the gate.",
                "Make a new node 22 and put it first: head -> 22 -> 7 -> 12 -> 3 -> 19 -> 5 -> NULL.",
                "Order matters. First tie him to the old first pig (m->next = head), THEN move the gate rope (head = m).",
                """
                // head -> 7 -> 12 -> 3 -> 19 -> 5 -> NULL
                struct Node *m = newNode(22);   // a new pig, roped to nothing yet

                """);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> now = walk(in);
        if (now.equals(List.of(22, 7, 12, 3, 19, 5))) {
            return GoalResult.pass("Elpenor is at the gate, and the other five are still behind him.");
        }
        if (now.equals(List.of(22))) {
            return GoalResult.fail("head -> 22 -> NULL: you moved the gate rope before tying 22 to the others. Five pigs wandered off. Tie first: m->next = head;");
        }
        String broken = chainBroken(in);
        if (broken != null) return GoalResult.fail(broken);
        return GoalResult.fail("The rope reads " + show(now) + ". It should start head -> 22 -> 7.");
    }
}
