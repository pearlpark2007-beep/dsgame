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
    private int loopDepth = 0;   // so 'break' and 'continue' can only be used inside a loop

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
            Stmt declaration = declarationList();
            consume(SEMICOLON, "Missing ';' after the declaration");
            return declaration;
        }
        if (match(BREAK, CONTINUE)) {
            Token word = previous();
            if (loopDepth == 0) {
                throw new CompileError("'" + word.text() + "' can only be used inside a loop", word.line());
            }
            consume(SEMICOLON, "Missing ';' after '" + word.text() + "'");
            return (word.type() == BREAK) ? new BreakStmt(word.line()) : new ContinueStmt(word.line());
        }
        if (match(IF))         return ifStatement();
        if (match(WHILE))      return whileStatement();
        if (match(FOR))        return forStatement();
        if (match(LEFT_BRACE)) return block();

        Stmt simple = simpleStatement();
        consume(SEMICOLON, "Missing ';' at the end of the line");
        return simple;
    }

    // after 'int':   x = 5   or   l = 0, r = 9   (several, separated by commas)
    private Stmt declarationList() {
        Stmt first = declarationRest();
        if (!check(COMMA)) return first;
        List<Stmt> all = new ArrayList<>();
        all.add(first);
        while (match(COMMA)) {
            all.add(declarationRest());
        }
        return new ListStmt(all);
    }

    // one declaration:   x = 5   |   pens[10]   |   a[5] = {3, 1, 4}   |   b[] = {2, 7}
    private Stmt declarationRest() {
        Token name = consume(IDENTIFIER, "Expected a variable name after 'int'");
        if (match(LEFT_BRACKET)) {
            Expr size = check(RIGHT_BRACKET) ? null : expression();
            consume(RIGHT_BRACKET, "Missing ']' after the size of " + name.text());
            List<Expr> initial = null;
            if (match(EQUAL)) {
                consume(LEFT_BRACE, "An array starts with '{', like {3, 1, 4}");
                initial = new ArrayList<>();
                if (!check(RIGHT_BRACE)) {
                    do {
                        initial.add(expression());
                    } while (match(COMMA));
                }
                consume(RIGHT_BRACE, "Missing '}' to close the list of values");
            }
            if (size == null && initial == null) {
                throw new CompileError("The array " + name.text() + "[] needs a size, like "
                        + name.text() + "[10]", name.line());
            }
            return new DeclareArrayStmt(name.text(), size, initial, name.line());
        }
        Expr initializer = null;
        if (match(EQUAL)) {
            initializer = expression();
        }
        return new DeclareStmt(name.text(), initializer, name.line());
    }

    // x = 5   |   x += 2   |   i++   |   flock[i] = 5   |   flock[i]++   |   push(&s, 10)
    private Stmt simpleStatement() {
        if (check(IDENTIFIER)) {
            TokenType next = peekType(1);
            if (next == EQUAL) {
                Token name = advance();   // the name
                advance();                // the '='
                return new AssignStmt(name.text(), expression(), name.line());
            }
            if (next == PLUS_EQUAL || next == MINUS_EQUAL) {
                // x += 2  is just  x = x + 2
                Token name = advance();
                TokenType op = (advance().type() == PLUS_EQUAL) ? PLUS : MINUS;
                Expr old = new VarExpr(name.text(), name.line());
                return new AssignStmt(name.text(), new BinaryExpr(old, op, expression(), name.line()), name.line());
            }
            if (next == LEFT_BRACKET) {
                int start = current;
                Token name = advance();
                advance();                // the '['
                Expr index = expression();
                consume(RIGHT_BRACKET, "Missing ']' after the index");
                Expr cell = new IndexExpr(name.text(), index, name.line());
                if (match(EQUAL)) {
                    return new IndexAssignStmt(name.text(), index, expression(), name.line());
                }
                if (match(PLUS_EQUAL, MINUS_EQUAL)) {
                    TokenType op = (previous().type() == PLUS_EQUAL) ? PLUS : MINUS;
                    return new IndexAssignStmt(name.text(), index,
                            new BinaryExpr(cell, op, expression(), name.line()), name.line());
                }
                if (match(PLUS_PLUS, MINUS_MINUS)) {
                    TokenType op = (previous().type() == PLUS_PLUS) ? PLUS : MINUS;
                    return new IndexAssignStmt(name.text(), index,
                            new BinaryExpr(cell, op, new NumberExpr(1), name.line()), name.line());
                }
                current = start;          // just reading a cell, e.g.  flock[i];  : treat it as an expression
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
        Stmt body = loopBody();
        return new WhileStmt(condition, body, line);
    }

    // a loop's body: the only place 'break' and 'continue' are allowed
    private Stmt loopBody() {
        loopDepth++;
        try {
            return statement();
        } finally {
            loopDepth--;
        }
    }

    private Stmt forStatement() {
        int line = previous().line();
        consume(LEFT_PAREN, "Expected '(' after 'for'");

        Stmt init = null;
        if (match(INT)) {
            init = declarationList();
        } else if (!check(SEMICOLON)) {
            init = simpleStatement();
        }
        consume(SEMICOLON, "Expected ';' after the start of the for loop");

        Expr condition = check(SEMICOLON) ? null : expression();
        consume(SEMICOLON, "Expected ';' after the for-loop condition");

        Stmt update = null;
        if (!check(RIGHT_PAREN)) {
            update = simpleStatement();
            if (check(COMMA)) {                    // for (...; ...; l++, r--)
                List<Stmt> updates = new ArrayList<>();
                updates.add(update);
                while (match(COMMA)) updates.add(simpleStatement());
                update = new ListStmt(updates);
            }
        }
        consume(RIGHT_PAREN, "Expected ')' to close the for loop");

        Stmt body = loopBody();
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
            if (match(LEFT_BRACKET)) {
                Expr index = expression();
                consume(RIGHT_BRACKET, "Missing ']' after the index");
                return new IndexExpr(name.text(), index, name.line());
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