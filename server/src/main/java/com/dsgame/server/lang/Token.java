package com.dsgame.server.lang;

// one "word" of code: what kind it is, its exact text, and which line it's on
public record Token(TokenType type, String text, int line) {}