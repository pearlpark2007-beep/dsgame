public class Main {

    // print every recorded step of ANY data structure, then clear them
    static void showSteps(DataStructures ds) {
        System.out.println("=== " + ds.getName() + " ===");
        for (Step step : ds.getSteps()) {
            System.out.println(step);
        }
        ds.clearSteps();
    }

    public static void main(String[] args) {
        // Stack
        Stack s = new Stack(2);
        s.push(10);
        s.push(20);
        s.push(30);     // overflow: capacity is 2
        s.pop();
        showSteps(s);

        // Linked list: build, then delete
        SinglyLinkedList list = new SinglyLinkedList();
        list.insert(10);
        list.insert(20);
        list.insert(30);
        list.insertAtHead(5);
        System.out.println(list);
        list.clearSteps();   // only show the delete's steps below

        list.delete(20);
        showSteps(list);
        System.out.println(list);

        // Queue
        Queue q = new Queue(2);
        q.insert(1);
        q.insert(2);
        q.insert(3);    // full
        q.remove();
        showSteps(q);

        // Linked list search
        System.out.println("Position of 30: " + list.search(30));
        showSteps(list);
    }
}