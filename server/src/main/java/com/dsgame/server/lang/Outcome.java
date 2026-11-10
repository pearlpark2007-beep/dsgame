package com.dsgame.server.lang;

// every way a run can end; each one gets its own cinematic in the game
public enum Outcome {
    SUCCESS,
    COMPILE_ERROR,
    RUNTIME_ERROR,
    OVERFLOW,
    UNDERFLOW,
    INFINITE_LOOP,
    OUT_OF_BOUNDS,
    GOAL_NOT_MET
}