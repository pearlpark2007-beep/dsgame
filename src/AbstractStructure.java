public abstract class AbstractStructure implements DataStructures {
    protected int[] items;
    protected int count;

    public AbstractStructure(int capacity) {
        items = new int[capacity];
        count = 0;
    }

    public boolean isEmpty() {
        return count == 0;
    }

    public boolean isFull() {
        return count == items.length;
    }
    public int size(){
        return count;
    }
}

