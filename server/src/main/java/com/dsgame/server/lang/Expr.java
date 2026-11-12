package com.dsgame.server.lang;

import java.util.List;

// an expression: anything that produces a number
public interface Expr {
    int evaluate(Interpreter in);

    // 42
    record NumberExpr(int value) implements Expr {
        public int evaluate(Interpreter in) {
            return value;
        }
    }

    // x
    record VarExpr(String name, int line) implements Expr {
        public int evaluate(Interpreter in) {
            return in.getVariable(name, line);
        }
    }

    // -x   or   !x
    record UnaryExpr(TokenType op, Expr right, int line) implements Expr {
        public int evaluate(Interpreter in) {
            int value = right.evaluate(in);
            return switch (op) {
                case MINUS -> -value;
                case BANG  -> (value == 0) ? 1 : 0;
                default    -> throw new RunError(Outcome.RUNTIME_ERROR, "Unknown operator", line);
            };
        }
    }

    // a + b,  a < b,  a && b, ...
    record BinaryExpr(Expr left, TokenType op, Expr right, int line) implements Expr {
        public int evaluate(Interpreter in) {
            // && and || only look at the right side when needed, exactly like C
            if (op == TokenType.AND_AND) {
                return (left.evaluate(in) != 0 && right.evaluate(in) != 0) ? 1 : 0;
            }
            if (op == TokenType.OR_OR) {
                return (left.evaluate(in) != 0 || right.evaluate(in) != 0) ? 1 : 0;
            }

            int a = left.evaluate(in);
            int b = right.evaluate(in);
            return switch (op) {
                case PLUS  -> a + b;
                case MINUS -> a - b;
                case STAR  -> a * b;
                case SLASH -> {
                    if (b == 0) throw new RunError(Outcome.RUNTIME_ERROR, "Division by zero", line);
                    yield a / b;
                }
                case PERCENT -> {
                    if (b == 0) throw new RunError(Outcome.RUNTIME_ERROR, "Division by zero", line);
                    yield a % b;
                }
                case EQUAL_EQUAL   -> (a == b) ? 1 : 0;
                case BANG_EQUAL    -> (a != b) ? 1 : 0;
                case LESS          -> (a < b)  ? 1 : 0;
                case LESS_EQUAL    -> (a <= b) ? 1 : 0;
                case GREATER       -> (a > b)  ? 1 : 0;
                case GREATER_EQUAL -> (a >= b) ? 1 : 0;
                default -> throw new RunError(Outcome.RUNTIME_ERROR, "Unknown operator", line);
            };
        }
    }

    // flock[i]   reading one cell of an array
    record IndexExpr(String name, Expr index, int line) implements Expr {
        public int evaluate(Interpreter in) {
            return in.readIndex(name, index.evaluate(in), line);
        }
    }

    // p->data   p->next   p->next->data ...  following a pointer into its node
    // (who is how the player wrote the pointer before the arrow, e.g. "p" or "p->next", so messages can name it)
    record FieldExpr(Expr pointer, String field, String who, int line) implements Expr {
        public int evaluate(Interpreter in) {
            return in.readField(pointer.evaluate(in), field, who, line);
        }
    }

    // push(&s, 10),  pop(&s),  isEmpty(&q), ...
    record CallExpr(String name, List<Expr> args, int line) implements Expr {
        public int evaluate(Interpreter in) {
            return in.callFunction(name, args, line);
        }
    }
}