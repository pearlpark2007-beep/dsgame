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
            "for", TokenType.FOR,
            "break", TokenType.BREAK,
            "continue", TokenType.CONTINUE,
            "return", TokenType.RETURN
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
            } else if (c == '#' && atLineStart()) {
                readDirective();              // #define SIZE 5 is remembered; #include <stdio.h> and friends: nothing to do
            } else if (c == '"') {
                readString();
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

    // #define NAME 123: from here on, the word NAME is read as the number 123 (a named constant).
    // Anything else after # (#include ...) is skipped.
    private final Map<String, String> defines = new java.util.HashMap<>();

    private void readDirective() {
        int end = source.indexOf('\n', pos);
        String text = source.substring(pos, end < 0 ? source.length() : end);
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("#\\s*define\\s+([A-Za-z_][A-Za-z0-9_]*)\\s+(\\d+)\\s*(//.*|/\\*.*)?").matcher(text.strip());
        if (m.matches()) {
            defines.put(m.group(1), m.group(2));
        } else if (text.strip().matches("#\\s*define\\b.*")) {
            throw new CompileError("Only simple #define constants work here, like  #define SIZE 5", line);
        }
        skipLineComment();
    }

    private char peekNext() {
        return (pos + 1 < source.length()) ? source.charAt(pos + 1) : '\0';
    }

    // only spaces before it on this line?
    private boolean atLineStart() {
        for (int k = pos - 1; k >= 0 && source.charAt(k) != '\n'; k--) {
            if (!Character.isWhitespace(source.charAt(k))) return false;
        }
        return true;
    }

    // "text with %d and \n": the text, with its escapes turned into the real characters
    private void readString() {
        int startLine = line;
        StringBuilder text = new StringBuilder();
        pos++;                                  // the opening "
        while (pos < source.length() && source.charAt(pos) != '"') {
            char ch = source.charAt(pos);
            if (ch == '\n') throw new CompileError("A string must end on the same line: missing '\"'", startLine);
            if (ch == '\\' && pos + 1 < source.length()) {
                char e = source.charAt(pos + 1);
                text.append(switch (e) { case 'n' -> '\n'; case 't' -> '\t'; case '0' -> '\0'; default -> e; });
                pos += 2;
                continue;
            }
            text.append(ch);
            pos++;
        }
        if (pos >= source.length()) throw new CompileError("A string must end with '\"'", startLine);
        pos++;                                  // the closing "
        tokens.add(new Token(TokenType.STRING, text.toString(), startLine));
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
        if (defines.containsKey(word)) {                 // a #define constant: the number itself
            tokens.add(new Token(TokenType.NUMBER, defines.get(word), line));
            return;
        }
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
            case "+=" -> TokenType.PLUS_EQUAL;
            case "-=" -> TokenType.MINUS_EQUAL;
            case "->" -> TokenType.ARROW;          // p->next: follow a pointer to its node
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
            case '[' -> TokenType.LEFT_BRACKET;
            case ']' -> TokenType.RIGHT_BRACKET;
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