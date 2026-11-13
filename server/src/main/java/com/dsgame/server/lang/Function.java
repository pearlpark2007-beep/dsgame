package com.dsgame.server.lang;

import java.util.List;

// a function the player wrote:   struct Node* insertAtEnd(struct Node *head, int value) { ... }
//   returns: "pointer" (struct Node*), "int" or "void"
public record Function(String name, String returns, List<Param> params, List<Stmt> body, int line) {

    // one parameter: int value   or   struct Node *head
    public record Param(String name, boolean pointer) { }
}
