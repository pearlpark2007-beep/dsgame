package com.dsgame.server.ds;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

// The Array ADT: a fixed row of numbered cells (the pens in the Cyclops' cave).
// Any cell can be read or written straight away by its index: that is what makes it an array.
//
// OOP: it EXTENDS ArrayStructure (reusing items[] and count, like Stack does), and the bounds
// check lives INSIDE this class (encapsulation): no code outside can touch a cell past the end.
public class ArrayADT extends ArrayStructure {
    private final String name;

    // cells nobody has filled hold leftover junk, just like a real C array
    public ArrayADT(String name, int capacity) {
        super(capacity);
        this.name = name;
        Random junk = new Random(name.hashCode());
        for (int i = 0; i < capacity; i++) {
            items[i] = 1 + junk.nextInt(98);
        }
    }

    public int capacity() {
        return items.length;
    }

    public boolean inBounds(int index) {
        return index >= 0 && index < items.length;
    }

    // read cell i.  `length` is how many cells are really in use (the player's n):
    // reading past it is allowed, as in C, but gives junk and is flagged for the player
    public int get(int index, int length) {
        if (!inBounds(index)) {
            record("OUT_OF_BOUNDS", index, -1, outOfBounds(index));
            return 0;
        }
        if (index >= length) {
            record("JUNK", index, items[index], "Pen " + index + " is past n (" + length
                    + "): it holds whatever was left there (" + items[index] + ")");
        } else {
            record("READ", index, items[index], "Read pen " + index + ": " + items[index]);
        }
        return items[index];
    }

    // write cell i
    public void set(int index, int value) {
        if (!inBounds(index)) {
            record("OUT_OF_BOUNDS", index, value, outOfBounds(index));
            return;
        }
        items[index] = value;
        record("WRITE", index, value, "Pen " + index + " = " + value);
    }

    private String outOfBounds(int index) {
        return "There is no pen " + index + ". The pens are numbered 0 to " + (items.length - 1) + ".";
    }

    // ---- the DataStructures operations, as an array does them (used to fill a level's start) ----

    @Override
    public void insert(int value) {            // add at the end
        if (isFull()) {
            record("OVERFLOW", count, value, "All " + items.length + " pens are full, can't add " + value);
            return;
        }
        items[count] = value;
        record("WRITE", count, value, "Pen " + count + " = " + value);
        count++;
    }

    @Override
    public int remove() {                      // take from the end
        if (isEmpty()) {
            record("UNDERFLOW", -1, -1, "No pens are in use, nothing to remove");
            return -1;
        }
        count--;
        return items[count];
    }

    @Override
    public int peek() {                        // look at the last one in use
        if (isEmpty()) {
            record("EMPTY", -1, -1, "No pens are in use");
            return -1;
        }
        return items[count - 1];
    }

    @Override
    public String getName() {
        return name;
    }

    // the cells a level started with
    @Override
    public List<Integer> snapshot() {
        return firstN(count);
    }

    // the first n cells, as they are now (n comes from the player's code, so it is clamped)
    public List<Integer> firstN(int n) {
        List<Integer> result = new ArrayList<>();
        for (int i = 0; i < Math.max(0, Math.min(n, items.length)); i++) {
            result.add(items[i]);
        }
        return result;
    }
}
