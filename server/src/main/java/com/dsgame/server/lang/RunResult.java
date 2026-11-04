package com.dsgame.server.lang;

import java.util.List;

// everything the game needs to know after running the player's code
public record RunResult(Outcome outcome, String message, int line, List<TimelineStep> steps) {}