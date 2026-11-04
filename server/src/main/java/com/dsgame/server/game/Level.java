package com.dsgame.server.game;

import com.dsgame.server.lang.Interpreter;

import java.util.List;

// the template every level follows; each concrete level only decides what "winning" means
public abstract class Level {
    private final String id;
    private final int world;
    private final String title;
    private final String story;
    private final String goal;
    private final String hint;
    private final String starterCode;
    private final List<StructureSpec> structures;

    protected Level(String id, int world, String title, String story, String goal,
                    String hint, String starterCode, List<StructureSpec> structures) {
        this.id = id;
        this.world = world;
        this.title = title;
        this.story = story;
        this.goal = goal;
        this.hint = hint;
        this.starterCode = starterCode;
        this.structures = structures;
    }

    public String getId() { return id; }

    // build fresh structures for this run and give them to the interpreter
    public void setup(Interpreter interpreter) {
        for (StructureSpec spec : structures) {
            interpreter.addStructure(spec.name(), spec.build());
        }
    }

    // every level must decide what counts as a win
    public abstract GoalResult checkGoal(Interpreter interpreter);

    public LevelInfo toInfo() {
        return new LevelInfo(id, world, title, story, goal, hint, starterCode, structures);
    }
}