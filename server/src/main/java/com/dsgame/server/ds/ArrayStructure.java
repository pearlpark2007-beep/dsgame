package com.dsgame.server.ds;
public abstract class ArrayStructure extends BaseStructure {
    protected int[] items;
    protected int count;

    public ArrayStructure(int capacity) {
        items = new int[capacity];
        count = 0;
    }

    @Override
    public boolean isEmpty() {
        return count == 0;
    }

    @Override
    public boolean isFull() {
        return count == items.length;
    }

    @Override
    public int size() {
        return count;
    }
}