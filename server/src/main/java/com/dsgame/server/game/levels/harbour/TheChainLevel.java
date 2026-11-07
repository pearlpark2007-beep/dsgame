package com.dsgame.server.game.levels.harbour;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Level;
import com.dsgame.server.game.StructureSpec;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

import static com.dsgame.server.game.levels.harbour.HarbourCargo.*;

// FINALE: the harbour chain's winch is on top of the tallest cargo tower. The bronze axe is buried
// inside it. Dig it out with a spare pile and put it on top, without losing a single crate.
public class TheChainLevel extends Level {
    private static final List<Integer> TOWER = List.of(12, AXE, 31, 45, 50, 63);   // bottom to top

    public TheChainLevel() {
        super("harbour-finale", "harbour", Tier.FINALE, "The Chain",
                "Antiphates has raised the harbour chain. Its winch sits on top of the tallest cargo tower, "
                        + "and the one thing that can cut it, the bronze AXE, is buried inside that tower.",
                "Bring the AXE (77) to the top of the tower, keeping all 6 crates in it: the winch is 6 crates high. "
                        + "The spare pile beside it holds 4.",
                "peek(&tower) shows the top crate without moving it. Keep moving crates to spare while the top isn't the AXE.",
                """
                int AXE = 77;

                // tower, bottom to top: 12, AXE, 31, 45, 50, 63
                // spare: an empty pile beside it (holds 4)
                """,
                0,
                List.of(StructureSpec.stack("tower", 6, TOWER.toArray(new Integer[0])),
                        StructureSpec.stack("spare", 4)));
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> tower = in.getStructure("tower").snapshot();
        if (tower.isEmpty() || tower.get(tower.size() - 1) != AXE) {
            return GoalResult.fail("The AXE is not on top. Odysseus can't reach the winch with it.");
        }
        if (tower.size() < TOWER.size() || !tower.containsAll(TOWER)) {
            return GoalResult.fail("The AXE is on top, but the tower is only " + tower.size()
                    + " crates high. The winch is 6 crates up.");
        }
        return GoalResult.pass("The AXE is on top, and the tower still reaches the winch.");
    }
}
