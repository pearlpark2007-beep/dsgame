public class Main{
    static void fillAndEmpty(DataStructures ds){
        System.out.println("---"+ds.getName() + "---");
        for(int i =1; i<=3; i++){
            ds.insert(i*10);
        }
        System.out.print("Removed in order: ");
        while(!ds.isEmpty()){
            System.out.print(ds.remove()+ " ");
        }
        System.out.println();
    }
    public static void main(String[] args){
        fillAndEmpty(new Stack(5));
        fillAndEmpty(new Queue(5));
        Queue q = new Queue(3);
        q.insert(1);
        q.insert(2);
        q.insert(3);
        q.remove();
        q.remove();
        q.insert(4);
        q.insert(5);
        System.out.println("Front: " + q.peek() + "Size: "+ q.size());
    }
}