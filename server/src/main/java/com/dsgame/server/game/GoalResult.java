package com.dsgame.server.game;

// did the player's code achieve the level's goal? and what should the game say?
public record GoalResult(boolean met, String message) {

    public static GoalResult pass(String message) {
        return new GoalResult(true, message);
    }

    public static GoalResult fail(String message) {
        return new GoalResult(false, message);
    }
}