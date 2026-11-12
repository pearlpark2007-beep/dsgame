package com.dsgame.server.api;

import com.dsgame.server.game.LevelService;
import com.dsgame.server.lang.RunResult;
import org.springframework.web.bind.annotation.*;

// THE LAB: run any code on data the player chose themselves
@RestController
@RequestMapping("/api/sandbox")
public class SandboxController {
    private final LevelService levelService;

    public SandboxController(LevelService levelService) {
        this.levelService = levelService;
    }

    // POST /api/sandbox  { "island": "cave", "code": "...", "structures": [ { "name": "flock", "kind": "array", "capacity": 10, "initial": [34, 52], "lengthVar": "n" } ] }
    @PostMapping
    public RunResult run(@RequestBody SandboxRequest request) {
        String code = (request.code() == null) ? "" : request.code();
        return levelService.sandbox(request.island(), code, request.structures());
    }
}
