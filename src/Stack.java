public class Stack extends AbstractStructure{
    public Stack(int capacity){
        super(capacity);
    }
    @Override
    public void insert(int value){
        if (isFull()) {
            System.out.println("Overflow! Can't push " + value);
            return;
        }
        items[count++] = value;
    }
    @Override
    public int remove(){
        if(isEmpty()){
            System.out.println("Underflow!");
            return -1;
        }
        return items[--count];
    }
    @Override
    public int peek(){
        if(isEmpty()){
            System.out.println("Stack is empty!");
            return -1;
        }
        return items[count -1];
    }
    @Override
    public String getName(){return "Stack";}
    public void  push(int value) {insert(value);}
    public int pop(){return remove();}
}
