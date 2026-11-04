package com.dsgame.server.game;

import com.dsgame.server.game.levels.BuriedKeyLevel;
import com.dsgame.server.game.levels.FerryLineLevel;
import com.dsgame.server.game.levels.FirstCrateLevel;
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
        register(new FirstCrateLevel());
        register(new BuriedKeyLevel());
        register(new FerryLineLevel());
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
        Outcome outcome = goal.met() ? Outcome.SUCCESS : Outcome.GOAL_NOT_MET;
        return new RunResult(outcome, goal.message(), -1, result.steps());
    }

    private Level findLevel(String id) {
        Level level = levels.get(id);
        if (level == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No level with id " + id);
        }
        return level;
    }
}