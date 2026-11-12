package com.dsgame.server.game.levels.circe;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// FINALE (reverse a linked list): turn every arrow around with three pointers, losing nobody
public class TurnThemBackLevel extends CirceLevel {
    public TurnThemBackLevel() {
        super("circe-finale", Tier.FINALE, "Turn Them Back",
                "Circe's spell unwinds backwards: the last pig roped is the first to turn back into a man. "
                        + "Turn the whole rope around, so the gate leads to tag 5 first.",
                "Reverse the chain: head -> 5 -> 19 -> 3 -> 12 -> 7 -> NULL. Every pig stays on the rope.",
                "Three pointers: prev (starts NULL), cur (starts at head), next. Each round: next = cur->next; "
                        + "cur->next = prev; prev = cur; cur = next;  At the end, head = prev;",
                """
                // head -> 7 -> 12 -> 3 -> 19 -> 5 -> NULL
                Node* prev = NULL;
                Node* cur = head;

                """);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> now = walk(in);
        if (now.equals(List.of(5, 19, 3, 12, 7)) && lost(in).isEmpty()) {
            return GoalResult.pass("The rope runs backwards. The spell breaks from tag 5 to tag 7.");
        }
        Integer prev = var(in, "prev");
        if (prev != null && chain(in).walk(prev).equals(List.of(5, 19, 3, 12, 7))) {
            return GoalResult.fail("Every arrow turned, and prev holds the new front, but head still points at the old first pig (now the LAST). Finish with head = prev;");
        }
        String broken = chainBroken(in);
        if (broken != null) {
            return GoalResult.fail(broken + " Save the next pig BEFORE turning the arrow: next = cur->next;");
        }
        return GoalResult.fail("The rope reads " + show(now) + ". It should be head -> 5 -> 19 -> 3 -> 12 -> 7 -> NULL.");
    }
}
