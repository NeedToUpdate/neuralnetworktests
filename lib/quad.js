class Quad{
    constructor(width, height,x,y){
        this.x = x || 0;
        this.y = y || 0;
        this.w = width;
        this.hw = this.w/2;
        this.h = height;
        this.hh = this.h/2;
        this.x2 = this.x+this.hw;
        this.x3 = this.x+this.w;
        this.y2 = this.y+this.hh;
        this.y3 = this.y+this.h;
        this.cap = 4;
        this.curr = 0;
        this.inner = [];
        this.points = [];
        this.divided = false;
        this.draw = false;
        this.b =document.createElement('div')
        if(this.draw)document.body.append(this.b)
        Object.assign(this.b.style,{
            height: this.h + 'px',
            width: this.w + 'px',
            position: 'absolute',
            border: 'white solid 1px',
            top: this.y+'px',
            left: this.x+'px',
            
        })
 
        //console.log(JSON.stringify(this))
    }
    
    
    split(){
        this.inner = Array(4).fill(0).map((e,i)=>{
             let x,y = 0;
             switch(i){
            case 0:
                x= this.x;
                y= this.y;
                break;
            case 1:
                x = this.x2;
                y = this.y
                break;
            case 2:
                x = this.x
                y = this.y2
                break;
            case 3:
                x= this.x2
                y= this.y2
                break;
            }
            return new Quad(this.hw,this.hh,x,y)
            
        })
        this.divided = true;
        
        this.points.forEach(p=>{
            if(this.addItem(p)){
                this.curr--
            }
        })
        
    }
    
    addItem(p,data){
        if(!this.contains(p)){
            return false;
        }
        if(!p.data){
         p.data = data;
        }
        if(!this.divided){
                 if(this.points.length>=this.cap){
                      this.points.push(p);
                      this.split();
                 }else{
                      this.points.push(p);
                      this.curr++;
                      //console.log(JSON.stringify(this))
                      return true;
            }
        }else{
            return this.inner[this.whichQuad(p)].addItem(p)
        }
    }
    
    contains(p){
        return (p.x>this.x && p.x<this.x3) &&
               (p.y>this.y && p.y<this.y3)
    }
    
    whichQuad(p){
        if(p.x<this.x2){
            if(p.y<this.y2){
                return 0;
            }else{
                return 2;
            }
        }else{
            if(p.y<this.y2){
                return 1;
            }else{
                return 3;
            }    
        }
    }
    
    getChildNum(){
        let n = this.inner.length;
        if(this.divided){
            this.inner.forEach(x=>n+=x.getChildNum())
        }
        return n;
    }
    getCurr(){
        let n = this.curr;
        if(this.divided){
            this.inner.forEach(x=>n+=x.getCurr())
        }
        return n;
    }
    
    query(x,y,r,r2,isSquare){
    if(!r2){
     r2 = r*r;
    }
    if(!this.intersects(x,y,r,r2,isSquare)){
        return []
    }
        let arr = [];
        //todo if fully intersects
        if(this.divided){
             this.inner.forEach(qt=>{
                 arr = arr.concat(qt.query(x,y,r,r2,isSquare))   
             })
        }else{
            this.points.forEach(p=>{
                 if(isSquare){
                 if(p.x<r && p.y<r2 && p.x>x && p.y>y){
                     arr.push(p)
                 }
                 }else{
                 let dx = p.x - x;
                 let dy = p.y - y;
                 
                 if (dx*dx+dy*dy < r2){
                     arr.push(p)
                 }
                 }
            })
        }
            //return all points near it
    
    
    
        return arr;
    }
    getHnb(n){
      //get horizontal neighbour
      if(n===0||n===2){
         return n+1
         }else{
         return n-1}
    }
    getVnb(n){
       if(n===0||n===1){
           return n+2
       }else{
           return n-2
       }
    }
    getAllPoints(){
        let p = Array.from(this.points);
        if(this.divided){
            this.inner.forEach(x=>p= p.concat(x.getAllPoints()))
        }
        return p;
    }
    
    intersects(x,y,r,r2,isSquare){
       if(isSquare){
           let x2=r;
           let y2 = r2;
           
           return !(this.x>x2 || this.y>y2 || this.x3<x || this.y3<y)
       }else{
       let dx = Math.abs(x - this.x2);
       let dy = Math.abs(y - this.y2);
       
       if (!(dx > (this.hw + r)) || !(dy > (this.hh + r)) || dx <= this.hw || dy <= this.hh) { return true; }
       
       dx-=this.hw;
       dy-=this.hh;
       return (dx*dx+dy*dy<=(r2));
       }
        
    }
    clear(){
        if(this.divided){
            this.inner.forEach(x=>{
                 x.clear()
            })
        }
        if(this.draw){
        window.requestAnimationFrame(()=>{
            window.requestAnimationFrame(()=>{
        document.body.removeChild(this.b);
        })})}
        this.points = [];
    }
    
    removeItem(p){
        if(this.divided){
            this.inner[this.whichQuad(p)].removeItem(p)
        }else{
            this.points.splice(this.points.indexOf(p))
        }
        return p
    }
}