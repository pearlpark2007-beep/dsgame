package com.dsgame.server.game.levels.underworld;

import com.dsgame.server.game.GoalResult;
import com.dsgame.server.game.Tier;
import com.dsgame.server.lang.Interpreter;

import java.util.List;

// FINALE (the circle): eight souls through a carousel that holds four. The rear runs off the end of the
// array and wraps round to place 0: that is why a queue's array is used as a circle.
public class HourOfTheDeadLevel extends UnderworldLevel {
    private static final List<Integer> ORDER = List.of(7, 12, 30, 41, 23, 5, 99, 66);

    public HourOfTheDeadLevel() {
        super("underworld-finale", Tier.FINALE, "Closing Time",
                "The office shuts at dawn. Four places on the carousel, eight souls with tickets. "
                        + "Every one of them has something to say to you, and they say it in the order they came.",
                "Serve all eight, in the order they came. A newcomer joins only when someone has been served. When you're done, nobody is waiting.",
                "For each newcomer: dequeue(&line); then enqueue(&line, arrivals[i]); After the loop: while (!isEmpty(&line)) dequeue(&line);",
                """
                // the line, front to rear: 7, 12, 30, 41   (4 places: full)
                int arrivals[4] = {23, 5, 99, 66};

                """,
                4, 7, 12, 30, 41);
    }

    @Override
    public GoalResult checkGoal(Interpreter in) {
        List<Integer> drank = dequeued(in), line = line(in);
        for (int k = 0; k < drank.size() && k < ORDER.size(); k++) {
            if (!drank.get(k).equals(ORDER.get(k))) {
                return GoalResult.fail("Soul number " + (k + 1) + " to be served was " + drank.get(k) + ", but " + ORDER.get(k)
                        + " came first. Drank so far: " + drank.subList(0, k + 1) + ".");
            }
        }
        if (drank.size() > ORDER.size()) return GoalResult.fail("Someone was served twice: " + drank + ".");
        if (!line.isEmpty()) return GoalResult.fail("Still waiting: " + show(line) + ". The office is closing.");
        if (drank.size() < ORDER.size()) return GoalResult.fail("Only " + drank.size() + " of the eight were served: " + drank + ".");
        return GoalResult.pass("Eight souls, four places, nobody out of turn. The office closes, and Tiresias speaks.");
    }
}
