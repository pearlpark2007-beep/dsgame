package com.dsgame.server.ds;
import java.util.List;

public interface DataStructures {
    void insert(int value);
    int remove();
    int peek();
    boolean isEmpty();
    boolean isFull();
    int size();
    String getName();
    List<Step> getSteps();
    void clearSteps();
    List<Integer> snapshot();
}