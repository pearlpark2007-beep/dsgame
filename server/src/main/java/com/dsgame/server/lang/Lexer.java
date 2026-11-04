package com.dsgame.server.lang;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// Stage 1: turns the player's text into a list of tokens
public class Lexer {
    private static final Map<String, TokenType> KEYWORDS = Map.of(
            "int", TokenType.INT,
            "if", TokenType.IF,
            "else", TokenType.ELSE,
            "while", TokenType.WHILE,
            "for", TokenType.FOR
    );

    private final String source;
    private final List<Token> tokens = new ArrayList<>();
    private int pos = 0;
    private int line = 1;

    public Lexer(String source) {
        this.source = source;
    }

    public List<Token> tokenize() {
        while (pos < source.length()) {
            char c = source.charAt(pos);
            if (c == '\n') {
                line++;
                pos++;
            } else if (Character.isWhitespace(c)) {
                pos++;
            } else if (c == '/' && peekNext() == '/') {
                skipLineComment();
            } else if (c == '/' && peekNext() == '*') {
                skipBlockComment();
            } else if (Character.isDigit(c)) {
                readNumber();
            } else if (Character.isLetter(c) || c == '_') {
                readWord();
            } else {
                readSymbol(c);
            }
        }
        tokens.add(new Token(TokenType.EOF, "", line));
        return tokens;
    }

    private char peekNext() {
        return (pos + 1 < source.length()) ? source.charAt(pos + 1) : '\0';
    }

    private void skipLineComment() {
        while (pos < source.length() && source.charAt(pos) != '\n') {
            pos++;
        }
    }

    private void skipBlockComment() {
        pos += 2;   // skip /*
        while (pos < source.length() && !(source.charAt(pos) == '*' && peekNext() == '/')) {
            if (source.charAt(pos) == '\n') line++;
            pos++;
        }
        pos += 2;   // skip */
    }

    private void readNumber() {
        int start = pos;
        while (pos < source.length() && Character.isDigit(source.charAt(pos))) {
            pos++;
        }
        tokens.add(new Token(TokenType.NUMBER, source.substring(start, pos), line));
    }

    private void readWord() {
        int start = pos;
        while (pos < source.length()
                && (Character.isLetterOrDigit(source.charAt(pos)) || source.charAt(pos) == '_')) {
            pos++;
        }
        String word = source.substring(start, pos);
        TokenType type = KEYWORDS.getOrDefault(word, TokenType.IDENTIFIER);
        tokens.add(new Token(type, word, line));
    }

    private void readSymbol(char c) {
        // try two-character symbols first, like == or ++
        String two = (pos + 1 < source.length()) ? source.substring(pos, pos + 2) : "";
        TokenType twoType = switch (two) {
            case "==" -> TokenType.EQUAL_EQUAL;
            case "!=" -> TokenType.BANG_EQUAL;
            case "<=" -> TokenType.LESS_EQUAL;
            case ">=" -> TokenType.GREATER_EQUAL;
            case "&&" -> TokenType.AND_AND;
            case "||" -> TokenType.OR_OR;
            case "++" -> TokenType.PLUS_PLUS;
            case "--" -> TokenType.MINUS_MINUS;
            default -> null;
        };
        if (twoType != null) {
            tokens.add(new Token(twoType, two, line));
            pos += 2;
            return;
        }

        TokenType oneType = switch (c) {
            case '(' -> TokenType.LEFT_PAREN;
            case ')' -> TokenType.RIGHT_PAREN;
            case '{' -> TokenType.LEFT_BRACE;
            case '}' -> TokenType.RIGHT_BRACE;
            case ',' -> TokenType.COMMA;
            case ';' -> TokenType.SEMICOLON;
            case '+' -> TokenType.PLUS;
            case '-' -> TokenType.MINUS;
            case '*' -> TokenType.STAR;
            case '/' -> TokenType.SLASH;
            case '%' -> TokenType.PERCENT;
            case '&' -> TokenType.AMPERSAND;
            case '!' -> TokenType.BANG;
            case '=' -> TokenType.EQUAL;
            case '<' -> TokenType.LESS;
            case '>' -> TokenType.GREATER;
            default -> throw new CompileError("Unexpected character '" + c + "'", line);
        };
        tokens.add(new Token(oneType, String.valueOf(c), line));
        pos++;
    }
}