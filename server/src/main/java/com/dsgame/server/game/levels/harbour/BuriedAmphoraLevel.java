package com.dsgame.server.game.levels.harbour;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Level;
import com.dsgame.server.game.StructureSpec;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

public class BuriedAmphoraLevel extends Level {

    public BuriedAmphoraLevel() {
        super("harbour-2", "harbour", Tier.ADEPT, "The Buried Amphora",
                "The amphora lies at the bottom of a tower. Only the top crate can be lifted.",
                "Bring the amphora (99) to the top of s, keeping every crate in s.",
                "Use t as a spare pile. A value can be held for a moment: int key = pop(&s);",
                """
                // s holds [99, 4, 7]   (99 at the bottom, 7 on top)
                // t is an empty spare pile
                """,
                0,
                List.of(StructureSpec.stack("s", 5, 99, 4, 7),
                        StructureSpec.stack("t", 5)));
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        return HarbourRules.amphoraOnTopKeepingAll(in.getStructure("s").snapshot());
    }
}
