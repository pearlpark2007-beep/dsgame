package com.dsgame.server.game;

import com.dsgame.server.lang.Interpreter;
import com.dsgame.server.lang.TimelineStep;

import java.util.List;
import java.util.Set;

// the template every level follows; each concrete level only decides what "winning" means
public abstract class Level {
    // actions that count as a "move" (looking with peek is free)
    private static final Set<String> MOVES = Set.of("PUSH", "POP", "ENQUEUE", "DEQUEUE");

    private final String id;
    private final String island;
    private final Tier tier;
    private final String title;
    private final String story;
    private final String goal;
    private final String hint;
    private final String starterCode;
    private final int maxMoves;               // 0 = no limit
    private final List<StructureSpec> structures;

    protected Level(String id, String island, Tier tier, String title, String story, String goal,
                    String hint, String starterCode, int maxMoves, List<StructureSpec> structures) {
        this.id = id;
        this.island = island;
        this.tier = tier;
        this.title = title;
        this.story = story;
        this.goal = goal;
        this.hint = hint;
        this.starterCode = starterCode;
        this.maxMoves = maxMoves;
        this.structures = structures;
    }

    public String getId()     { return id; }
    public String getIsland() { return island; }
    public int getMaxMoves()  { return maxMoves; }

    // build fresh structures for this run and give them to the interpreter
    public void setup(Interpreter interpreter) {
        for (StructureSpec spec : structures) {
            interpreter.addStructure(spec.name(), spec.build());
        }
    }

    // every level must decide what counts as a win
    public abstract GoalResult checkGoal(Interpreter interpreter);

    // how many real moves the player's code made
    public static int countMoves(List<TimelineStep> steps) {
        int moves = 0;
        for (TimelineStep step : steps) {
            if (MOVES.contains(step.action())) moves++;
        }
        return moves;
    }

    public LevelInfo toInfo() {
        return new LevelInfo(id, island, tier, title, story, goal, hint, starterCode, maxMoves, structures);
    }
}
