package com.dsgame.server.game.levels.harbour;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Level;
import com.dsgame.server.game.StructureSpec;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

public class NarrowDockLevel extends Level {

    public NarrowDockLevel() {
        super("harbour-3", "harbour", Tier.HERO, "The Narrow Dock",
                "The tide is rising. The dock has room for only one crate on each spare pile.",
                "Bring the amphora (99) to the top of s, keeping every crate, in at most 10 moves.",
                "",
                """
                // s holds [99, 4, 7]
                // t and u can each hold ONE crate
                """,
                10,
                List.of(StructureSpec.stack("s", 3, 99, 4, 7),
                        StructureSpec.stack("t", 1),
                        StructureSpec.stack("u", 1)));
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        return HarbourRules.amphoraOnTopKeepingAll(in.getStructure("s").snapshot());
    }
}
