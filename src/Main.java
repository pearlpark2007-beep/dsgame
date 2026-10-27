public class Main {
    public static void main(String[] args) {
        Stack s = new Stack(3);   // create an object of the Stack class
        s.push(10);
        s.push(20);
        s.push(30);
        s.push(40);               // too many: should print Overflow
        System.out.println(s.pop());
        System.out.println(s.pop());

        System.out.println("Top: " + s.peek());   // looks at the top without removing it
        System.out.println("Size: " + s.size());  // how many elements are left
    }
}