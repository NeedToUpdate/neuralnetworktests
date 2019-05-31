class Line{
	constructor(x1,y1,x2,y2,color){
	    this.a = new Vector(x1,y1)
	    this.b = new Vector(x2,y2)
	    this.length = Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2))
	    this.angle = this.b.copy().sub(this.a).perp().getAngle()
	    
		this.line = new Div(x1,y1,('none'),this.length,1,true,this.angle,true)
		this.line.shape.style.backgroundColor = color || 'rgba(255,255,255,255)'
		//this.line.shape.style.borderRadius = '6%'
	}
	
	draw(){
		
		
	}
	destroy(){
	if(this.line){
	   this.line.remove()
	   this.line = null;
	   }
	}
	
	
}