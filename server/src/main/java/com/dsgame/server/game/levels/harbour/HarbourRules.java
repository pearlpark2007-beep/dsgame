package com.dsgame.server.game.levels.harbour;

import com.dsgame.server.game.GoalResult;

import java.util.List;

// a goal check shared by the Adept and Hero harbour levels
final class HarbourRules {
    private HarbourRules() {}

    static GoalResult amphoraOnTopKeepingAll(List<Integer> s) {
        if (s.isEmpty() || s.get(s.size() - 1) != 99) {
            return GoalResult.fail("The amphora is still out of reach.");
        }
        if (s.size() != 3 || !s.contains(4) || !s.contains(7)) {
            return GoalResult.fail("The amphora is on top, but crates were lost to the sea.");
        }
        return GoalResult.pass("The amphora rests on top, and nothing was lost.");
    }
}
