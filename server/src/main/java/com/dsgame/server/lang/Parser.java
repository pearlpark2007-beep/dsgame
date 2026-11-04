package com.dsgame.server.lang;

import com.dsgame.server.lang.Expr.*;
import com.dsgame.server.lang.Stmt.*;

import java.util.ArrayList;
import java.util.List;

import static com.dsgame.server.lang.TokenType.*;

// Stage 2: checks the grammar and builds the tree of Expr and Stmt objects
public class Parser {
    private final List<Token> tokens;
    private int current = 0;

    public Parser(List<Token> tokens) {
        this.tokens = tokens;
    }

    public List<Stmt> parseProgram() {
        List<Stmt> program = new ArrayList<>();
        while (!check(EOF)) {
            program.add(statement());
        }
        return program;
    }

    // ---------- statements ----------

    private Stmt statement() {
        if (match(INT)) {
            Stmt declaration = declarationRest();
            consume(SEMICOLON, "Missing ';' after the declaration");
            return declaration;
        }
        if (match(IF))         return ifStatement();
        if (match(WHILE))      return whileStatement();
        if (match(FOR))        return forStatement();
        if (match(LEFT_BRACE)) return block();

        Stmt simple = simpleStatement();
        consume(SEMICOLON, "Missing ';' at the end of the line");
        return simple;
    }

    // after 'int':   x = 5
    private Stmt declarationRest() {
        Token name = consume(IDENTIFIER, "Expected a variable name after 'int'");
        Expr initializer = null;
        if (match(EQUAL)) {
            initializer = expression();
        }
        return new DeclareStmt(name.text(), initializer, name.line());
    }

    // x = 5   |   i++   |   i--   |   push(&s, 10)
    private Stmt simpleStatement() {
        if (check(IDENTIFIER)) {
            TokenType next = peekType(1);
            if (next == EQUAL) {
                Token name = advance();   // the name
                advance();                // the '='
                return new AssignStmt(name.text(), expression(), name.line());
            }
            if (next == PLUS_PLUS || next == MINUS_MINUS) {
                Token name = advance();
                Token op = advance();
                return new IncrementStmt(name.text(), (op.type() == PLUS_PLUS) ? 1 : -1, name.line());
            }
        }
        return new ExprStmt(expression());
    }

    private Stmt ifStatement() {
        consume(LEFT_PAREN, "Expected '(' after 'if'");
        Expr condition = expression();
        consume(RIGHT_PAREN, "Expected ')' after the if condition");
        Stmt thenBranch = statement();
        Stmt elseBranch = null;
        if (match(ELSE)) {
            elseBranch = statement();
        }
        return new IfStmt(condition, thenBranch, elseBranch);
    }

    private Stmt whileStatement() {
        int line = previous().line();
        consume(LEFT_PAREN, "Expected '(' after 'while'");
        Expr condition = expression();
        consume(RIGHT_PAREN, "Expected ')' after the while condition");
        Stmt body = statement();
        return new WhileStmt(condition, body, line);
    }

    private Stmt forStatement() {
        int line = previous().line();
        consume(LEFT_PAREN, "Expected '(' after 'for'");

        Stmt init = null;
        if (match(INT)) {
            init = declarationRest();
        } else if (!check(SEMICOLON)) {
            init = simpleStatement();
        }
        consume(SEMICOLON, "Expected ';' after the start of the for loop");

        Expr condition = check(SEMICOLON) ? null : expression();
        consume(SEMICOLON, "Expected ';' after the for-loop condition");

        Stmt update = check(RIGHT_PAREN) ? null : simpleStatement();
        consume(RIGHT_PAREN, "Expected ')' to close the for loop");

        Stmt body = statement();
        return new ForStmt(init, condition, update, body, line);
    }

    private Stmt block() {
        List<Stmt> statements = new ArrayList<>();
        while (!check(RIGHT_BRACE) && !check(EOF)) {
            statements.add(statement());
        }
        consume(RIGHT_BRACE, "Missing '}' to close the block");
        return new BlockStmt(statements);
    }

    // ---------- expressions (lowest priority first) ----------

    private Expr expression() {
        return or();
    }

    private Expr or() {
        Expr expr = and();
        while (match(OR_OR)) {
            Token op = previous();
            expr = new BinaryExpr(expr, op.type(), and(), op.line());
        }
        return expr;
    }

    private Expr and() {
        Expr expr = equality();
        while (match(AND_AND)) {
            Token op = previous();
            expr = new BinaryExpr(expr, op.type(), equality(), op.line());
        }
        return expr;
    }

    private Expr equality() {
        Expr expr = comparison();
        while (match(EQUAL_EQUAL, BANG_EQUAL)) {
            Token op = previous();
            expr = new BinaryExpr(expr, op.type(), comparison(), op.line());
        }
        return expr;
    }

    private Expr comparison() {
        Expr expr = term();
        while (match(LESS, LESS_EQUAL, GREATER, GREATER_EQUAL)) {
            Token op = previous();
            expr = new BinaryExpr(expr, op.type(), term(), op.line());
        }
        return expr;
    }

    private Expr term() {
        Expr expr = factor();
        while (match(PLUS, MINUS)) {
            Token op = previous();
            expr = new BinaryExpr(expr, op.type(), factor(), op.line());
        }
        return expr;
    }

    private Expr factor() {
        Expr expr = unary();
        while (match(STAR, SLASH, PERCENT)) {
            Token op = previous();
            expr = new BinaryExpr(expr, op.type(), unary(), op.line());
        }
        return expr;
    }

    private Expr unary() {
        if (match(BANG, MINUS)) {
            Token op = previous();
            return new UnaryExpr(op.type(), unary(), op.line());
        }
        return primary();
    }

    private Expr primary() {
        if (match(NUMBER)) {
            Token number = previous();
            try {
                return new NumberExpr(Integer.parseInt(number.text()));
            } catch (NumberFormatException e) {
                throw new CompileError("The number " + number.text() + " is too big", number.line());
            }
        }
        if (match(AMPERSAND)) {
            return primary();   // C-style &s: we simply use s
        }
        if (match(IDENTIFIER)) {
            Token name = previous();
            if (match(LEFT_PAREN)) {
                List<Expr> args = new ArrayList<>();
                if (!check(RIGHT_PAREN)) {
                    do {
                        args.add(expression());
                    } while (match(COMMA));
                }
                consume(RIGHT_PAREN, "Missing ')' after the arguments of " + name.text() + "()");
                return new CallExpr(name.text(), args, name.line());
            }
            return new VarExpr(name.text(), name.line());
        }
        if (match(LEFT_PAREN)) {
            Expr inside = expression();
            consume(RIGHT_PAREN, "Missing ')'");
            return inside;
        }
        Token t = peek();
        String what = (t.type() == EOF) ? "end of code" : "'" + t.text() + "'";
        throw new CompileError("Unexpected " + what, t.line());
    }

    // ---------- helpers ----------

    private boolean match(TokenType... types) {
        for (TokenType type : types) {
            if (check(type)) {
                advance();
                return true;
            }
        }
        return false;
    }

    private boolean check(TokenType type) {
        return peek().type() == type;
    }

    private TokenType peekType(int offset) {
        int index = Math.min(current + offset, tokens.size() - 1);
        return tokens.get(index).type();
    }

    private Token peek() {
        return tokens.get(current);
    }

    private Token previous() {
        return tokens.get(current - 1);
    }

    private Token advance() {
        if (!check(EOF)) current++;
        return previous();
    }

    private Token consume(TokenType type, String message) {
        if (check(type)) return advance();
        // a missing ';' belongs to the line before, which feels natural to the player
        int line = (type == SEMICOLON && current > 0) ? previous().line() : peek().line();
        throw new CompileError(message, line);
    }
}