public class Queue extends AbstractStructure{
    private int front = 0;
    private int rear = -1;
    public Queue(int capacity){
        super(capacity);
    }
    @Override
    public void insert(int value){
        if(isFull()){
            System.out.println("Queue full! Can't enqueue "+ value);
            return;
        }
        rear = (rear+1)% items.length;
        items[rear] = value;
        count++;
    }
    @Override
    public int remove(){
        if(isEmpty()){
            System.out.println("Queue empty!");
            return -1;
        }
        int value = items[front];
        front = (front + 1) % items.length;
        count--;
        return value;
    }
    @Override
    public int peek(){
        if(isEmpty()){
            System.out.println("Queue empty!");
            return -1;
        }
        return items[front];
    }
    @Override
    public String getName() {return "Queue";}
}
