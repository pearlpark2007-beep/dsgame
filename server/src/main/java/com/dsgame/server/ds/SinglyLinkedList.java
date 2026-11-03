package com.dsgame.server.ds;
public class SinglyLinkedList extends BaseStructure {

    // a Node lives INSIDE the list; no outside code can see or touch nodes
    private static class Node {
        int data;
        Node next;

        Node(int data) {
            this.data = data;
            this.next = null;
        }
    }

    private Node head;   // first node, or null if the list is empty
    private int count;

    public SinglyLinkedList() {
        head = null;
        count = 0;
    }

    // insert at the END (tail)
    @Override
    public void insert(int value) {
        Node newNode = new Node(value);
        if (head == null) {
            head = newNode;
            record("INSERT_HEAD", 0, value, "List was empty, " + value + " becomes the head");
        } else {
            Node current = head;
            int position = 0;
            record("VISIT", position, current.data, "Start at head " + current.data);
            while (current.next != null) {
                current = current.next;
                position++;
                record("VISIT", position, current.data, "Move to " + current.data);
            }
            current.next = newNode;
            record("LINK", position + 1, value, current.data + " now points to " + value);
        }
        count++;
    }

    // insert at the START (head)
    public void insertAtHead(int value) {
        Node newNode = new Node(value);
        newNode.next = head;
        head = newNode;
        count++;
        record("INSERT_HEAD", 0, value, value + " is the new head");
    }

    // remove the head
    @Override
    public int remove() {
        if (head == null) {
            record("EMPTY", -1, -1, "List is empty, nothing to remove");
            return -1;
        }
        int value = head.data;
        head = head.next;
        count--;
        record("DELETE_HEAD", 0, value, "Removed head " + value);
        return value;
    }

    // delete the first node with this value
    public boolean delete(int value) {
        if (head == null) {
            record("EMPTY", -1, -1, "List is empty, nothing to delete");
            return false;
        }
        if (head.data == value) {
            head = head.next;
            count--;
            record("DELETE", 0, value, "Deleted head " + value);
            return true;
        }
        Node prev = head;
        int position = 0;
        record("VISIT", position, prev.data, "Start at head " + prev.data);
        while (prev.next != null && prev.next.data != value) {
            prev = prev.next;
            position++;
            record("VISIT", position, prev.data, "Move to " + prev.data);
        }
        if (prev.next == null) {
            record("NOT_FOUND", -1, value, value + " is not in the list");
            return false;
        }
        prev.next = prev.next.next;   // skip over the deleted node
        count--;
        record("DELETE", position + 1, value, "Deleted " + value + "; " + prev.data + " now skips over it");
        return true;
    }

    // find the position of a value, or -1 if it's not there
    public int search(int value) {
        Node current = head;
        int position = 0;
        while (current != null) {
            record("VISIT", position, current.data, "Checking " + current.data);
            if (current.data == value) {
                record("FOUND", position, value, "Found " + value + " at position " + position);
                return position;
            }
            current = current.next;
            position++;
        }
        record("NOT_FOUND", -1, value, value + " is not in the list");
        return -1;
    }

    @Override
    public int peek() {
        if (head == null) {
            record("EMPTY", -1, -1, "List is empty");
            return -1;
        }
        record("PEEK", 0, head.data, "Head is " + head.data);
        return head.data;
    }

    @Override public boolean isEmpty() { return head == null; }
    @Override public boolean isFull()  { return false; }   // a linked list never runs out of slots
    @Override public int size()        { return count; }
    @Override public String getName()  { return "Singly Linked List"; }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        Node current = head;
        while (current != null) {
            sb.append(current.data).append(" -> ");
            current = current.next;
        }
        sb.append("null");
        return sb.toString();
    }
}