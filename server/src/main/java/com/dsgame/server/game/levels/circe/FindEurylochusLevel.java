package com.dsgame.server.game.levels.circe;

import com.dsgame.server.ds.NodeChain;
import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

// TRIAL 2 (search): find the NODE holding a value, and keep a pointer to it
public class FindEurylochusLevel extends CirceLevel {
    public FindEurylochusLevel() {
        super("circe-2", Tier.PRACTICE, "Find Eurylochus",
                "Your second-in-command wears tag 19. He is somewhere on the rope. "
                        + "Hermes' herb can turn one man back, but only if you can put your hand on him.",
                "Make the pointer found point at the pig whose data is 19. If he weren't there, found would stay NULL.",
                "Walk with p. When p->data == 19, do found = p; and stop. found holds where he is, not the 19.",
                """
                // head -> 7 -> 12 -> 3 -> 19 -> 5 -> NULL
                struct Node *found = NULL;
                struct Node *p = head;

                """);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        String broken = chainBroken(in);
        if (broken != null) return GoalResult.fail(broken);
        Integer found = var(in, "found");
        if (found == null) return GoalResult.fail("There is no pointer called found.");
        NodeChain c = chain(in);
        if (found == NodeChain.NULL) return GoalResult.fail("found is still NULL, so the search never caught him. He is on the rope.");
        if (!c.isNode(found)) return GoalResult.fail("found is " + found + ": that's not where any pig stands. Copy the pointer: found = p;");
        if (c.dataAt(found) == 19) return GoalResult.pass("Got him: found -> 19 at " + NodeChain.hex(found) + ".");
        return GoalResult.fail("found points at the pig with tag " + c.dataAt(found) + ". Eurylochus is 19.");
    }
}
