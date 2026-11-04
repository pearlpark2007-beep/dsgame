package com.dsgame.server.api;

// what the browser sends: the player's code
public record PlayRequest(String code) {}