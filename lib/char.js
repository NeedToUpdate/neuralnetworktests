class Body{
    constructor(x,y){
        this.p = new Vector(x,y);
        this.v = new Vector(0,0);
        this.oldv = this.v.copy();
        this.a = new Vector();
        this.r = 0;
        this.forces = [];
        this.tempforces = [];
        this.sensors = [];
        this.body = {};
        this.drawn = true;
        this.config = {};
        this.funcs = [];
        this.dt;
        this.accel_mult = 0.001;
        this.speed_limit = 1;
        this.brain = {};
        this.create = {};
        this.life = 100;
        this.tick_damage = 0.01;
        this.penalty = 100
        this.canvaspadding = 0
        this.canvasSize ={
            x:window.innerWidth,
            y:window.innerHeight
        }
        this.dead = false
    }
    
    setBodyfn(fn){
        this.create.body = fn;
        this.body = this.create.body()
        return this;
    }
    
    init(){
        this.body = this.create.body();
    }
    addSensor(name,sensor){
        this.sensors[name] = sensor;
        return this;
    }
    addConstForce(force){
        if(!(force instanceof Vector)){
            console.log('not a vector')
            return
        }
        this.forces.push(force)
        return this;
    }
    addForce(force){
       if(!(force instanceof Vector)){
       console.log('not a vector')
       return
       }
       this.tempforces.push(force)
       return this;
    }
    
    attach(name,obj){
      this[name] = obj;
      return this;
    }
    
    update(){
      
      this.move();
      this.checkBounds();
      if(this.drawn){
          this.draw()
      }
      if(this.life<=0){
         this.dead = true;
      }
    }
    
    move(){
        if(Object.keys(this.brain)>0){
        let inputs = this.getInputs()
        this.a.add(this.think(inputs))
        }
        this.forces.forEach(f=>{
            this.a.add(f)
        })
        this.tempforces.forEach(f=>{
            this.a.add(f)
        })
        this.tempforces= []
        this.a.mult(this.accel_mult)
        this.oldv = this.v.copy();
        this.v.add(this.a)
        this.v.add(this.oldv).div(2)
        this.p.add(this.v); 
        this.a.clear();
    }
    
    getInputs(){
        let inputs = this.sensors
    }
    
    toggleDraw(){
       if(!this.drawn){
           this.drawn = true;
           this.draw();
       }else{
          this.drawn = false;
          this.destroy()
       }
    }
    draw(){
        let b = this.body;
        b.set('transform','rotate('+this.r+'deg)');
        b.set('top', this.p.y +'px');
        b.set('left' , this.p.x + 'px');  
    }
    destroy(){
        if(Object.keys(this.body).length>0){
            this.body.remove()
        }
        this.sensors.forEach(obj=>{
            obj.gfx.shape.remove();
        })
        
    }
    
    checkBounds(){
        if(this.p.y>this.canvasSize.y-this.canvaspadding){this.p.y=this.canvasSize.y-this.canvaspadding;  this.life-=this.penalty;}
        if(this.p.x>this.canvasSize.x-this.canvaspadding){this.p.x=this.canvasSize.x-this.canvaspadding;  this.life-=this.penalty;}
        if(this.p.y<0+this.canvaspadding){this.p.y=this.canvaspadding;  this.life-=this.penalty;}
        if(this.p.x<0+this.canvaspadding){this.p.x=this.canvaspadding;  this.life-=this.penalty;}
        if(this.points<0){
            this.points = 0; 
        }
    }
    copy(){
       let newbody = new Body(this.p.x,this.p.y);
       newbody.p = this.p.copy()
       newbody.v = this.v.copy()
       newbody.oldv = this.v.copy()
       return newbody
    }

}
