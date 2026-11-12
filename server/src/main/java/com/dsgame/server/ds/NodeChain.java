package com.dsgame.server.ds;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

// The memory a linked list lives in, the way C sees it: every node sits at its own ADDRESS, holds a
// number (data) and the address of the next node (next). Address 0 is NULL: "no node".
// Unlike SinglyLinkedList (which hides its nodes inside), this class lets the player's code hold
// node addresses in pointer variables (Node* p) and follow them with p->next: that is the whole
// point of Chapter 3. The list's start is NOT stored here: it is the player's own pointer, head.
public class NodeChain extends BaseStructure {
    public static final int NULL = 0;
    private static final int FIRST_ADDRESS = 0x1A0;   // nodes appear at 0x1A0, 0x1B0, 0x1C0, ... (16 bytes apart)
    private static final int MAX_NODES = 40;

    // one node in memory
    private static final class Node {
        int data;
        int next = NULL;
        boolean freed = false;
        Node(int data) { this.data = data; }
    }

    private final String name;
    private final Map<Integer, Node> memory = new LinkedHashMap<>();
    private int nextAddress = FIRST_ADDRESS;
    private int first = NULL;   // where the level's starting chain begins (handed to the player as head)
    private int last = NULL;

    public NodeChain(String name) {
        this.name = name;
    }

    // ---------- what the player's code can do (the interpreter calls these) ----------

    // newNode(v): a fresh node, pointing nowhere yet
    public int newNode(int value) {
        if (memory.size() >= MAX_NODES) {
            record("NO_MEMORY", NULL, value, "No memory left for another node (" + MAX_NODES + " at most)");
            return NULL;
        }
        int address = nextAddress;
        nextAddress += 0x10;
        memory.put(address, new Node(value));
        record("NEW", address, value, "A new node " + value + " at " + hex(address) + ", next = NULL");
        return address;
    }

    // p->data
    public int getData(int address, String who) {
        Node node = nodeAt(address, who);
        record("READ", address, node.data, who + "->data is " + node.data);
        return node.data;
    }

    // p->data = v
    public void setData(int address, int value, String who) {
        Node node = nodeAt(address, who);
        node.data = value;
        record("WRITE", address, value, who + "->data = " + value);
    }

    // p->next (just following an arrow is free: it is not a step of its own)
    public int getNext(int address, String who) {
        return nodeAt(address, who).next;
    }

    // p->next = q
    public void setNext(int address, int to, String who) {
        Node node = nodeAt(address, who);
        if (to != NULL && !memory.containsKey(to)) {
            record("NULL_DEREF", address, to, "There is no node at " + hex(to) + " to point to");
            return;
        }
        node.next = to;
        String target = (to == NULL) ? "NULL" : String.valueOf(memory.get(to).data);
        record("LINK", address, to, node.data + " now points to " + target);
    }

    // free(p): the node is handed back; following an old pointer to it is now an error
    public void free(int address, String who) {
        Node node = nodeAt(address, who);
        node.freed = true;
        record("FREE", address, node.data, "Node " + node.data + " at " + hex(address) + " is freed");
    }

    // a pointer that leads nowhere (NULL, a freed node, or a made-up number) can't be followed
    private Node nodeAt(int address, String who) {
        Node node = memory.get(address);
        if (address == NULL) {
            record("NULL_DEREF", NULL, NULL, who + " is NULL: there is no node there to look inside");
        } else if (node == null) {
            record("NULL_DEREF", address, NULL, who + " = " + address + " is not the address of any node");
        } else if (node.freed) {
            record("NULL_DEREF", address, NULL, who + " points to a node that was already freed");
        } else {
            return node;
        }
        return DEAD;   // the interpreter stops on the NULL_DEREF step before this is ever used
    }
    private static final Node DEAD = new Node(0);

    // ---------- reading the memory (levels use these to judge) ----------

    public boolean isNode(int address) {
        Node node = memory.get(address);
        return node != null && !node.freed;
    }
    public int dataAt(int address) { return memory.get(address).data; }
    public int nextOf(int address) { return memory.get(address).next; }
    public int firstAddress() { return first; }
    public List<Integer> addresses() { return new ArrayList<>(memory.keySet()); }

    // the values met by walking from a head pointer, stopping at NULL (or if the chain loops back on itself)
    public List<Integer> walk(int head) {
        List<Integer> values = new ArrayList<>();
        Set<Integer> seen = new HashSet<>();
        for (int at = head; at != NULL && isNode(at) && seen.add(at); at = nextOf(at)) {
            values.add(dataAt(at));
        }
        return values;
    }
    // the addresses met on that walk
    public Set<Integer> reachable(int head) {
        Set<Integer> seen = new HashSet<>();
        for (int at = head; at != NULL && isNode(at) && seen.add(at); at = nextOf(at)) { }
        return seen;
    }
    // does the walk from head ever come back to a node it already met?
    public boolean loops(int head) {
        Set<Integer> seen = new HashSet<>();
        for (int at = head; at != NULL && isNode(at); at = nextOf(at)) {
            if (!seen.add(at)) return true;
        }
        return false;
    }

    public static String hex(int address) {
        return address == NULL ? "NULL" : "0x" + Integer.toHexString(address).toUpperCase();
    }

    // ---------- DataStructures: used to BUILD a level's starting chain ----------

    // insert = add a node at the end of the starting chain
    @Override
    public void insert(int value) {
        int address = newNode(value);
        if (first == NULL) first = address;
        else memory.get(last).next = address;
        last = address;
    }

    // the other operations act on the starting chain (the game itself uses the methods above)
    @Override
    public int remove() {
        if (first == NULL) return -1;
        int value = memory.get(first).data;
        first = memory.get(first).next;
        return value;
    }
    @Override public int peek()        { return first == NULL ? -1 : memory.get(first).data; }
    @Override public boolean isEmpty() { return first == NULL; }
    @Override public boolean isFull()  { return memory.size() >= MAX_NODES; }
    @Override public int size()        { return walk(first).size(); }
    @Override public String getName()  { return name; }
    @Override public List<Integer> snapshot() { return walk(first); }
}
