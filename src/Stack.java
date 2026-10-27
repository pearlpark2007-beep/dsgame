public class Stack {
    private int[] items;
    private int top;
    public Stack(int capacity){
        items = new int[capacity];
        top = -1;
    }
    public void push(int data){
        if(top == items.length - 1){
            System.out.println("Overflow! Can't push "+ data);
            return;
        }
        items[++top] = data;
    }
    public int pop(){
        if(top == -1){
            System.out.println("Underflow!");
            return -1;
        }
        return items[top--];
    }
    public boolean isEmpty(){
        return top == -1;
    }
    public int peek(){
        if(isEmpty()){
            System.out.println("Underflow!");
            return -1;
        }
        return items[top];
    }
    public int size(){
        return top+1;
    }
}
