package com.dsgame.server.api;

import com.dsgame.server.game.StructureSpec;

import java.util.List;

// what the browser sends to the Lab: which island, the player's code, and the player's own starting data
public record SandboxRequest(String island, String code, List<StructureSpec> structures) {}
