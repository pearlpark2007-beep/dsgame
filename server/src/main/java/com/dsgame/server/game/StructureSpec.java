package com.dsgame.server.game;

import com.dsgame.server.ds.DataStructures;
import com.dsgame.server.ds.Queue;
import com.dsgame.server.ds.Stack;

import java.util.List;

// a description of one structure a level starts with, e.g. stack "s", capacity 5, holding [99, 4, 7]
public record StructureSpec(String name, String kind, int capacity, List<Integer> initial) {

    public static StructureSpec stack(String name, int capacity, Integer... initial) {
        return new StructureSpec(name, "stack", capacity, List.of(initial));
    }

    public static StructureSpec queue(String name, int capacity, Integer... initial) {
        return new StructureSpec(name, "queue", capacity, List.of(initial));
    }

    // FACTORY: turns the description into a real, filled data structure
    public DataStructures build() {
        DataStructures ds = switch (kind) {
            case "stack" -> new Stack(capacity);
            case "queue" -> new Queue(capacity);
            default -> throw new IllegalArgumentException("Unknown kind: " + kind);
        };
        for (int value : initial) {
            ds.insert(value);
        }
        ds.clearSteps();   // the starting crates shouldn't appear in the animation
        return ds;
    }
}