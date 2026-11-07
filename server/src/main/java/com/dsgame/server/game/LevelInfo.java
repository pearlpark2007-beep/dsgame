package com.dsgame.server.game;

import java.util.List;

// everything the browser needs to show a level before the player runs any code
public record LevelInfo(String id, String island, Tier tier, String title, String story, String goal,
                        String hint, String starterCode, int maxMoves, List<StructureSpec> structures) {}
