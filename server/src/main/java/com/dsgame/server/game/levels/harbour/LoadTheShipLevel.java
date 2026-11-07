package com.dsgame.server.game.levels.harbour;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Level;
import com.dsgame.server.game.StructureSpec;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

import static com.dsgame.server.game.levels.harbour.HarbourCargo.*;

// PRACTICE: clear the hold, then load it so the supplies come out in the order the crew needs them.
// A ship's hold is a stack: the last crate loaded is the first one out.
public class LoadTheShipLevel extends Level {

    public LoadTheShipLevel() {
        super("harbour-practice", "harbour", Tier.PRACTICE, "Load the Ship",
                "The giants filled your hold with rocks. Before you can run, the hold must be cleared and stocked. "
                        + "A hold is a stack: the last crate loaded is the first one out.",
                "Throw out every rock, then load WATER, BREAD and WINE so they come out in the order the crew needs them: "
                        + "WATER first, then BREAD, then WINE.",
                "You can't see how many rocks there are: while (!isEmpty(&hold)) { pop(&hold); } "
                        + "Then remember: the crate you load LAST comes out FIRST.",
                """
                int WATER = 1;
                int BREAD = 2;
                int WINE  = 3;

                // 1. Throw the giants' rocks overboard
                //    (keep popping while the hold is not empty)

                // 2. Load the supplies: WATER must come out first

                // 3. Check what will come out first
                int first = peek(&hold);
                """,
                0,
                List.of(StructureSpec.stack("hold", 3, ROCKS, ROCKS, ROCKS)));
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> hold = in.getStructure("hold").snapshot();
        if (hold.contains(ROCKS)) {
            return GoalResult.fail("There are still rocks in the hold.");
        }
        if (hold.size() < 3) {
            return GoalResult.fail("The hold isn't stocked yet: it needs WATER, BREAD and WINE.");
        }
        if (!hold.equals(List.of(WINE, BREAD, WATER))) {
            return GoalResult.fail("They would come out as " + unloadOrder(hold)
                    + ". The crew needs WATER first, then BREAD, then WINE.");
        }
        return GoalResult.pass("The hold is stocked: WATER comes out first, then BREAD, then WINE.");
    }
}
