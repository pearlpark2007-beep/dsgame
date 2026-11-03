public class Step {
    private final String action;   // what happened, e.g. "PUSH"
    private final int index;       // where: array index or node position
    private final int value;       // which value was involved
    private final String message;  // plain-English explanation for the player

    public Step(String action, int index, int value, String message) {
        this.action = action;
        this.index = index;
        this.value = value;
        this.message = message;
    }

    public String getAction()  { return action; }
    public int getIndex()      { return index; }
    public int getValue()      { return value; }
    public String getMessage() { return message; }

    @Override
    public String toString() {
        return action + " [index=" + index + ", value=" + value + "] " + message;
    }
}