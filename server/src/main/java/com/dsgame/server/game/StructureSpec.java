package com.dsgame.server.game;

import com.dsgame.server.ds.ArrayADT;
import com.dsgame.server.ds.DataStructures;
import com.dsgame.server.ds.NodeChain;
import com.dsgame.server.ds.Queue;
import com.dsgame.server.ds.Stack;

import java.util.List;

// a description of one structure a level starts with, e.g. stack "s", capacity 5, holding [99, 4, 7].
// An array also names the variable that says how many of its cells are in use (lengthVar, e.g. "n").
// A list uses that same field for the name of the pointer to its first node (e.g. "head").
public record StructureSpec(String name, String kind, int capacity, List<Integer> initial, String lengthVar) {

    public static StructureSpec stack(String name, int capacity, Integer... initial) {
        return new StructureSpec(name, "stack", capacity, List.of(initial), null);
    }

    public static StructureSpec queue(String name, int capacity, Integer... initial) {
        return new StructureSpec(name, "queue", capacity, List.of(initial), null);
    }

    // e.g. array("flock", 10, "n", 34, 52, 18): ten pens, the first three in use, n = 3
    public static StructureSpec array(String name, int capacity, String lengthVar, Integer... initial) {
        return new StructureSpec(name, "array", capacity, List.of(initial), lengthVar);
    }

    // e.g. list("sty", "head", 7, 12, 3): three nodes chained in that order, and a pointer head to the first
    public static StructureSpec list(String name, String headVar, Integer... initial) {
        return new StructureSpec(name, "list", 40, List.of(initial), headVar);
    }

    // FACTORY: turns the description into a real, filled data structure
    public DataStructures build() {
        DataStructures ds = switch (kind) {
            case "stack" -> new Stack(capacity);
            case "queue" -> new Queue(capacity);
            case "array" -> new ArrayADT(name, capacity);
            case "list"  -> new NodeChain(name);
            default -> throw new IllegalArgumentException("Unknown kind: " + kind);
        };
        for (int value : initial) {
            ds.insert(value);
        }
        ds.clearSteps();   // the starting crates shouldn't appear in the animation
        return ds;
    }
}