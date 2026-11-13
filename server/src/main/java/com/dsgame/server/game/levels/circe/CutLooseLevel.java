package com.dsgame.server.game.levels.circe;

import com.dsgame.server.ds.NodeChain;
import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// TRIAL 4 (delete): take one node out of the middle and close the gap
public class CutLooseLevel extends CirceLevel {
    public CutLooseLevel() {
        super("circe-4", Tier.PRACTICE, "Cut Him Loose",
                "The herb works on the third pig, tag 3: he's a man again and has to leave the rope. "
                        + "Close the gap so nobody behind him is lost.",
                "Remove the pig with tag 3: head -> 7 -> 12 -> 19 -> 5 -> NULL. (You may free() his node.)",
                "Stop on the pig BEFORE him (12). Then make it skip over him: p->next = p->next->next;",
                """
                // head -> 7 -> 12 -> 3 -> 19 -> 5 -> NULL
                struct Node *p = head;

                """);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> now = walk(in);
        NodeChain c = chain(in);
        if (now.equals(List.of(7, 12, 19, 5))) {
            List<Integer> lost = lost(in);
            if (lost.isEmpty() || lost.equals(List.of(3))) {
                return GoalResult.pass("Tag 3 walks free, and 12 now leads straight to 19.");
            }
        }
        if (now.equals(List.of(7, 12))) {
            return GoalResult.fail("head -> 7 -> 12 -> NULL: you cut the rope instead of skipping. 19 and 5 are lost. Use p->next = p->next->next;");
        }
        if (now.equals(List.of(7, 12, 3, 19, 5))) {
            return GoalResult.fail("The rope is unchanged: tag 3 is still on it.");
        }
        if (c.loops(head(in))) return GoalResult.fail("The rope loops back on itself: walking from head never reaches NULL.");
        return GoalResult.fail("The rope reads " + show(now) + ". It should be head -> 7 -> 12 -> 19 -> 5 -> NULL.");
    }
}
