package com.dsgame.server.api;

import com.dsgame.server.game.LevelInfo;
import com.dsgame.server.game.LevelService;
import com.dsgame.server.lang.RunResult;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/levels")
public class LevelController {
    private final LevelService levelService;

    // Spring passes in the LevelService automatically: this is dependency injection
    public LevelController(LevelService levelService) {
        this.levelService = levelService;
    }

    // GET /api/levels  → every level
    @GetMapping
    public List<LevelInfo> all() {
        return levelService.getAllLevels();
    }

    // GET /api/levels/2-1  → one level
    @GetMapping("/{id}")
    public LevelInfo one(@PathVariable("id") String id) {
        return levelService.getLevelInfo(id);
    }

    // POST /api/levels/2-1/play  { "code": "..." }  → the verdict and the steps
    @PostMapping("/{id}/play")
    public RunResult play(@PathVariable("id") String id, @RequestBody PlayRequest request) {
        String code = (request.code() == null) ? "" : request.code();
        return levelService.play(id, code);
    }
}