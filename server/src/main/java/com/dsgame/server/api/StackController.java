package com.dsgame.server.api;

import com.dsgame.server.ds.Stack;
import com.dsgame.server.ds.Step;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stack")
public class StackController {

    // GET /api/stack/demo → a fixed demo you can view directly in the browser
    @GetMapping("/demo")
    public List<Step> demo() {
        Stack stack = new Stack(3);
        stack.push(10);
        stack.push(20);
        stack.push(30);
        stack.push(40);   // overflow
        stack.peek();
        stack.pop();
        stack.pop();
        return stack.getSteps();
    }

    // POST /api/stack/run → runs whatever operations the browser sends
    @PostMapping("/run")
    public List<Step> run(@RequestBody StackRequest request) {
        Stack stack = new Stack(request.capacity());
        for (Operation op : request.operations()) {
            switch (op.type()) {
                case "push" -> stack.push(op.value());
                case "pop"  -> stack.pop();
                case "peek" -> stack.peek();
                default     -> throw new IllegalArgumentException("Unknown operation: " + op.type());
            }
        }
        return stack.getSteps();
    }
}