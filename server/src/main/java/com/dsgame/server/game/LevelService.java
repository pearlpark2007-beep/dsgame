package com.dsgame.server.game;

import com.dsgame.server.game.levels.cave.*;
import com.dsgame.server.game.levels.circe.*;
import com.dsgame.server.game.levels.harbour.LoadTheShipLevel;
import com.dsgame.server.game.levels.harbour.TheChainLevel;
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
        register(new LoadTheShipLevel());   // practice
        register(new TheChainLevel());      // finale

        // the Cave of Polyphemus (array): eight trials, a bonus, then the finale
        register(new CountTheFlockLevel());  // traverse
        register(new BlackRamLevel());       // linear search
        register(new BiggestRamLevel());     // max
        register(new TooThinLevel());        // count with a test
        register(new TwoLambsLevel());       // insert at the end
        register(new FirstOutLevel());       // insert at a position
        register(new SupperLevel());         // delete at a position
        register(new BackToFrontLevel());    // swap, reverse
        register(new SortedLineLevel());     // bonus: binary search
        register(new DawnLevel());           // finale

        // Circe's island (linked list): four trials, then the finale
        register(new CountThePigsLevel());   // traverse
        register(new FindEurylochusLevel()); // search, keep a pointer
        register(new NewPigLevel());         // insert at the head
        register(new CutLooseLevel());       // delete from the middle
        register(new TurnThemBackLevel());   // finale: reverse
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
        return judge(findLevel(id), code);
    }

    // THE LAB: the player's own starting data and any code. SandboxLevel is just another Level,
    // so it goes through exactly the same judge() as the story levels.
    public RunResult sandbox(String island, String code, List<StructureSpec> structures) {
        SandboxLevel level;
        try {
            level = SandboxLevel.create(island, structures);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        return judge(level, code);
    }

    // run the code on a fresh copy of the level's structures, then ask the level if it was won
    private RunResult judge(Level level, String code) {
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

        // a level with a move limit: the goal was reached, but was it reached within the limit?
        int moves = Level.countMoves(result.steps());
        if (level.getMaxMoves() > 0 && moves > level.getMaxMoves()) {
            return new RunResult(Outcome.GOAL_NOT_MET,
                    "The goal was reached, but it took " + moves + " moves. Only "
                            + level.getMaxMoves() + " are allowed.", -1, result.steps());
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
