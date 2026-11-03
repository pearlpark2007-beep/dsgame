import java.util.ArrayList;
import java.util.List;

public abstract class BaseStructure implements DataStructures {
    private final List<Step> steps = new ArrayList<>();

    // children call this to write down what they did
    protected void record(String action, int index, int value, String message) {
        steps.add(new Step(action, index, value, message));
    }

    @Override
    public List<Step> getSteps() {
        return List.copyOf(steps);   // read-only copy: outsiders can't edit the history
    }

    @Override
    public void clearSteps() {
        steps.clear();
    }
}