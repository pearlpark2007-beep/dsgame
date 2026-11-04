package com.dsgame.server.game;

import java.util.List;

// everything the browser needs to show a level before the player runs any code
public record LevelInfo(String id, int world, String title, String story, String goal,
                        String hint, String starterCode, List<StructureSpec> structures) {}