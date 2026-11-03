public class Stack extends ArrayStructure {

    public Stack(int capacity) {
        super(capacity);
    }

    @Override
    public void insert(int value) {        // push
        if (isFull()) {
            record("OVERFLOW", count, value, "Stack is full, can't push " + value);
            return;
        }
        items[count] = value;
        record("PUSH", count, value, "Pushed " + value + " at index " + count);
        count++;
    }

    @Override
    public int remove() {                  // pop
        if (isEmpty()) {
            record("UNDERFLOW", -1, -1, "Stack is empty, nothing to pop");
            return -1;
        }
        count--;
        int value = items[count];
        record("POP", count, value, "Popped " + value + " from index " + count);
        return value;
    }

    @Override
    public int peek() {
        if (isEmpty()) {
            record("EMPTY", -1, -1, "Stack is empty, nothing to peek");
            return -1;
        }
        record("PEEK", count - 1, items[count - 1], "Top is " + items[count - 1]);
        return items[count - 1];
    }

    @Override
    public String getName() {
        return "Stack";
    }

    public void push(int value) { insert(value); }
    public int pop()            { return remove(); }
}