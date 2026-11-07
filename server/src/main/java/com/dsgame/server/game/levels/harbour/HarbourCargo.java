package com.dsgame.server.game.levels.harbour;

import java.util.List;

// what each crate number means on the Harbour island (the crates are ints, as in C)
public final class HarbourCargo {
    private HarbourCargo() {}

    public static final int WATER = 1;
    public static final int BREAD = 2;
    public static final int WINE  = 3;
    public static final int ROCKS = 8;     // what the giants threw into the hold
    public static final int AXE   = 77;    // the bronze axe that can cut the harbour chain

    public static String name(int value) {
        return switch (value) {
            case WATER -> "WATER";
            case BREAD -> "BREAD";
            case WINE  -> "WINE";
            case ROCKS -> "ROCKS";
            case AXE   -> "AXE";
            default    -> String.valueOf(value);
        };
    }

    // the order the crates would come out if you popped them all: top first
    public static String unloadOrder(List<Integer> bottomToTop) {
        StringBuilder sb = new StringBuilder();
        for (int i = bottomToTop.size() - 1; i >= 0; i--) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(name(bottomToTop.get(i)));
        }
        return sb.toString();
    }
}
