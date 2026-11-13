package com.dsgame.server.game.levels.circe;

import com.dsgame.server.ds.NodeChain;
import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.ArrayList;
import java.util.List;

// FINALE · THE BANQUET AT SUNSET. Circe makes a deal: two pigs on the rope are hers (66 and 77, her
// spies). Cut them out AND hand them back with free(), then turn the whole rope around: the spell
// breaks from the last man to the first. Three operations in one program: delete a value (twice),
// free, reverse. Writing your own deleteElement() and calling it is the clean way.
public class BanquetLevel extends CirceLevel {
    static final int SPY_A = 66, SPY_B = 77;

    public BanquetLevel() {
        super("circe-banquet", Tier.FINALE, "The Banquet at Sunset",
                "Circe pours the wine and makes her offer. Two pigs on the rope are hers: spies, tags 66 and 77. "
                        + "Cut them out and hand them back to her (free them). Then turn the rope around, "
                        + "and she lifts the spell from the last man to the first.",
                "Delete 66 and 77 (and free both). Then reverse: head -> 5 -> 19 -> 3 -> 12 -> 7 -> NULL. No crew lost.",
                "Write deleteElement() exactly as in your program and call it twice: head = deleteElement(head, 66); "
                        + "Then reverse with prev = NULL, cur = head, and next = cur->next saved first. End with head = prev;",
                """
                // Circe's deal, at sunset:
                //   1. cut out her spies, 66 and 77, and free() them
                //   2. turn the whole rope around
                // head -> 7 -> 66 -> 12 -> 3 -> 19 -> 77 -> 5 -> NULL
                // (you may write your own functions above, like deleteElement)

                """, 7, SPY_A, 12, 3, 19, SPY_B, 5);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        NodeChain c = chain(in);
        if (c.loops(head(in))) return GoalResult.fail("The rope loops back on itself: walking from head never reaches NULL.");
        List<Integer> now = walk(in);
        List<Integer> crewLost = new ArrayList<>(), spiesLeaked = new ArrayList<>();
        for (int t : lost(in)) (t == SPY_A || t == SPY_B ? spiesLeaked : crewLost).add(t);
        if (!crewLost.isEmpty()) {
            return GoalResult.fail("Pig" + (crewLost.size() > 1 ? "s " : " ") + crewLost + " of the crew "
                    + (crewLost.size() > 1 ? "are" : "is") + " cut loose: nothing points there any more. "
                    + "Save the next pig BEFORE turning or skipping an arrow.");
        }
        for (int spy : new int[]{SPY_A, SPY_B}) {
            if (now.contains(spy)) return GoalResult.fail("Circe's spy " + spy + " is still on the rope. The rope reads " + show(now) + ".");
        }
        if (!spiesLeaked.isEmpty()) {
            return GoalResult.fail("You cut " + spiesLeaked + " off the rope but never freed " + (spiesLeaked.size() > 1 ? "them" : "it")
                    + ": still in memory, reachable by nobody (a leak). Hand them back: free(toDelete);");
        }
        if (now.equals(List.of(7, 12, 3, 19, 5))) {
            return GoalResult.fail("The spies are gone. Now turn the rope around: prev, cur, next.");
        }
        if (now.equals(List.of(5, 19, 3, 12, 7))) {
            return GoalResult.pass("The spies are freed and the rope runs backwards. The sun goes down; the spell breaks, man by man.");
        }
        Integer prev = var(in, "prev");
        if (prev != null && c.walk(prev).equals(List.of(5, 19, 3, 12, 7))) {
            return GoalResult.fail("Every arrow turned and prev holds the new front, but head still points at the old first pig. Finish with head = prev;");
        }
        return GoalResult.fail("The rope reads " + show(now) + ". It should be head -> 5 -> 19 -> 3 -> 12 -> 7 -> NULL.");
    }
}
