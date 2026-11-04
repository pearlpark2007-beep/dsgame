package com.dsgame.server.ds;
import java.util.ArrayList;
import java.util.List;
public class Queue extends ArrayStructure {
    private int front = 0;
    private int rear = -1;

    public Queue(int capacity) {
        super(capacity);
    }

    @Override
    public void insert(int value) {        // enqueue
        if (isFull()) {
            record("FULL", -1, value, "Queue is full, can't enqueue " + value);
            return;
        }
        rear = (rear + 1) % items.length;  // move rear forward, wrap to 0 at the end
        items[rear] = value;
        count++;
        record("ENQUEUE", rear, value, "Enqueued " + value + " at index " + rear);
    }

    @Override
    public int remove() {                  // dequeue
        if (isEmpty()) {
            record("EMPTY", -1, -1, "Queue is empty, nothing to dequeue");
            return -1;
        }
        int value = items[front];
        record("DEQUEUE", front, value, "Dequeued " + value + " from index " + front);
        front = (front + 1) % items.length; // move front forward, wrap to 0 at the end
        count--;
        return value;
    }

    @Override
    public int peek() {
        if (isEmpty()) {
            record("EMPTY", -1, -1, "Queue is empty, nothing to peek");
            return -1;
        }
        record("PEEK", front, items[front], "Front is " + items[front]);
        return items[front];
    }
    @Override
    public List<Integer> snapshot() {
        List<Integer> result = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            result.add(items[(front + i) % items.length]);   // start at front, wrap around the circle
        }
        return result;   // front → rear
    }

    @Override
    public String getName() {
        return "Queue";
    }
}