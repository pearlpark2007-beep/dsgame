package com.dsgame.server.lang;

// every kind of "word" the player's code can contain
public enum TokenType {
    // single characters
    LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE, LEFT_BRACKET, RIGHT_BRACKET, COMMA, SEMICOLON,
    PLUS, MINUS, STAR, SLASH, PERCENT, AMPERSAND, BANG, EQUAL, LESS, GREATER,
    // two characters
    EQUAL_EQUAL, BANG_EQUAL, LESS_EQUAL, GREATER_EQUAL, AND_AND, OR_OR,
    PLUS_PLUS, MINUS_MINUS, PLUS_EQUAL, MINUS_EQUAL, ARROW,
    // values and names
    NUMBER, IDENTIFIER,
    // keywords
    INT, IF, ELSE, WHILE, FOR, BREAK, CONTINUE,
    // end of the code
    EOF
}