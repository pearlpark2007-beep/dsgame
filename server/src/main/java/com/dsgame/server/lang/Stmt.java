package com.dsgame.server.lang;

import java.util.List;

// a statement: something that DOES something
public interface Stmt {
    void execute(Interpreter in);

    // int x = 5;
    record DeclareStmt(String name, Expr initializer, int line) implements Stmt {
        public void execute(Interpreter in) {
            int value = (initializer == null) ? 0 : initializer.evaluate(in);
            in.declare(name, value, line);
        }
    }

    // x = 5;
    record AssignStmt(String name, Expr value, int line) implements Stmt {
        public void execute(Interpreter in) {
            in.assign(name, value.evaluate(in), line);
        }
    }

    // i++;   i--;
    record IncrementStmt(String name, int delta, int line) implements Stmt {
        public void execute(Interpreter in) {
            in.assign(name, in.getVariable(name, line) + delta, line);
        }
    }

    // push(&s, 10);
    record ExprStmt(Expr expr) implements Stmt {
        public void execute(Interpreter in) {
            expr.evaluate(in);
        }
    }

    // { ... }   variables declared inside disappear at the closing brace
    record BlockStmt(List<Stmt> statements) implements Stmt {
        public void execute(Interpreter in) {
            in.pushScope();
            try {
                for (Stmt s : statements) {
                    s.execute(in);
                }
            } finally {
                in.popScope();
            }
        }
    }

    // if (...) ... else ...
    record IfStmt(Expr condition, Stmt thenBranch, Stmt elseBranch) implements Stmt {
        public void execute(Interpreter in) {
            if (condition.evaluate(in) != 0) {
                thenBranch.execute(in);
            } else if (elseBranch != null) {
                elseBranch.execute(in);
            }
        }
    }

    // while (...) ...
    record WhileStmt(Expr condition, Stmt body, int line) implements Stmt {
        public void execute(Interpreter in) {
            while (condition.evaluate(in) != 0) {
                in.tick(line);   // counts loop rounds to catch infinite loops
                body.execute(in);
            }
        }
    }

    // for (init; condition; update) ...
    record ForStmt(Stmt init, Expr condition, Stmt update, Stmt body, int line) implements Stmt {
        public void execute(Interpreter in) {
            in.pushScope();   // so  for (int i = ...)  can be used again in another loop
            try {
                if (init != null) init.execute(in);
                while (condition == null || condition.evaluate(in) != 0) {
                    in.tick(line);
                    body.execute(in);
                    if (update != null) update.execute(in);
                }
            } finally {
                in.popScope();
            }
        }
    }
}