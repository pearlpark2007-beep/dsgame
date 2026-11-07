package com.dsgame.server.game;

import com.dsgame.server.game.levels.harbour.AmphoraLevel;
import com.dsgame.server.game.levels.harbour.BuriedAmphoraLevel;
import com.dsgame.server.game.levels.harbour.NarrowDockLevel;
import com.dsgame.server.lang.CodeRunner;
import com.dsgame.server.lang.Interpreter;
import com.dsgame.server.lang.Outcome;
import com.dsgame.server.lang.RunResult;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LevelService {
    private final Map<String, Level> levels = new LinkedHashMap<>();

    public LevelService() {
        // the Laestrygonian Harbour (stack)
        register(new AmphoraLevel());
        register(new BuriedAmphoraLevel());
        register(new NarrowDockLevel());
    }

    private void register(Level level) {
        levels.put(level.getId(), level);
    }

    public List<LevelInfo> getAllLevels() {
        List<LevelInfo> result = new ArrayList<>();
        for (Level level : levels.values()) {
            result.add(level.toInfo());
        }
        return result;
    }

    // only the levels of one island, e.g. "harbour"
    public List<LevelInfo> getLevelsForIsland(String island) {
        List<LevelInfo> result = new ArrayList<>();
        for (Level level : levels.values()) {
            if (level.getIsland().equals(island)) {
                result.add(level.toInfo());
            }
        }
        return result;
    }

    public LevelInfo getLevelInfo(String id) {
        return findLevel(id).toInfo();
    }

    // the heart of the game: run the player's code, then judge it
    public RunResult play(String id, String code) {
        Level level = findLevel(id);

        Interpreter interpreter = new Interpreter();
        level.setup(interpreter);

        RunResult result = new CodeRunner().run(code, interpreter);
        if (result.outcome() != Outcome.SUCCESS) {
            return result;   // compile error, overflow, infinite loop... no need to check the goal
        }

        GoalResult goal = level.checkGoal(interpreter);
        if (!goal.met()) {
            return new RunResult(Outcome.GOAL_NOT_MET, goal.message(), -1, result.steps());
        }

        // Hero tier: the goal was reached, but was it reached within the move limit?
        int moves = Level.countMoves(result.steps());
        if (level.getMaxMoves() > 0 && moves > level.getMaxMoves()) {
            return new RunResult(Outcome.GOAL_NOT_MET,
                    "The amphora is on top, but it took " + moves + " moves. The tide allows only "
                            + level.getMaxMoves() + ".", -1, result.steps());
        }
        return new RunResult(Outcome.SUCCESS, goal.message(), -1, result.steps());
    }

    private Level findLevel(String id) {
        Level level = levels.get(id);
        if (level == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No level with id " + id);
        }
        return level;
    }
}
