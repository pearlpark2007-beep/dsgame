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

    // GET /api/levels              -> every level
    // GET /api/levels?island=harbour -> only that island's levels
    @GetMapping
    public List<LevelInfo> all(@RequestParam(value = "island", required = false) String island) {
        if (island == null) {
            return levelService.getAllLevels();
        }
        return levelService.getLevelsForIsland(island);
    }

    // GET /api/levels/harbour-1  -> one level
    @GetMapping("/{id}")
    public LevelInfo one(@PathVariable("id") String id) {
        return levelService.getLevelInfo(id);
    }

    // POST /api/levels/harbour-1/play  { "code": "..." }  -> the verdict and the steps
    @PostMapping("/{id}/play")
    public RunResult play(@PathVariable("id") String id, @RequestBody PlayRequest request) {
        String code = (request.code() == null) ? "" : request.code();
        return levelService.play(id, code);
    }
}
