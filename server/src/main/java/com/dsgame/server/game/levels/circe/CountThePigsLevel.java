package com.dsgame.server.game.levels.circe;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

// TRIAL 1 (traversal): walk the chain from head to NULL, counting
public class CountThePigsLevel extends CirceLevel {
    public CountThePigsLevel() {
        super("circe-1", Tier.PRACTICE, "Count the Pigs",
                "Circe has turned your men into pigs and roped them nose to tail. You can't see the whole sty: "
                        + "from the gate you can only follow the rope, one pig at a time.",
                "Count the pigs into count. Walk from head, pig to pig, until the rope ends (NULL).",
                "Never move head itself: walk a copy.  struct Node *p = head;  then  p = p->next;  until p is NULL.",
                """
                // head -> ? -> ? -> ... -> NULL   (you can't see how many)
                int count = 0;
                struct Node *p = head;

                """);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        if (head(in) != gate(in)) {
            return GoalResult.fail("head moved. Now nobody knows where the chain starts. Walk a copy: struct Node *p = head;");
        }
        Integer count = var(in, "count");
        if (count == null) return GoalResult.fail("There is no variable called count.");
        if (count == 5) return GoalResult.pass("Five pigs. Five men. Every one still on the rope.");
        if (count == 4) return GoalResult.fail("count is 4: you stopped one pig early. Loop while p != NULL, not while p->next != NULL.");
        return GoalResult.fail("count is " + count + ". There are more pigs (or fewer) than that on the rope.");
    }
}
