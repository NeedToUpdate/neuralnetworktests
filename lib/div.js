class Div {
    constructor(x, y, color, r, h, isRect, rot, isLine) {
        this.x = x;
        this.y = y;
        this.r = r || 1; //if isRect then this is w
        this.w = isRect ? r : 0;
        this.h = h || 0;
        this.rot = rot || 0;
        this.shape = document.createElement('div');
        document.body.appendChild(this.shape);
        Object.assign(this.shape.style, {
            height: (isRect ? this.h : this.r * 2) + 'px',
            width: (isRect ? this.w : this.r * 2) + 'px',
            top: this.y - (isRect ? 0 : this.r+1) + 'px',
            left: this.x  - (isRect ? 0: this.r+1) + 'px',
            border: (color ? color : 'white') + ' solid 1px',
            transformOrigin: (isLine? '0% 50%':'center center'),
            //backgroundColor: 'white',
            borderRadius: isRect ? '' : '50%',
            position: 'absolute',
            transform: this.rot ? 'rotate(' + this.rot + 'deg)' : ''
        })

    }
    set(attr,val){
        this.shape.style[attr] = val;
    }
    moveTo(p){
    
       this.set('top',p.y-(this.isRect?0:this.r+1) + 'px');
       this.set('left',p.x-(this.isRect?0:this.r+1) + 'px');
    }
    rotateTo(num){
       this.set('transform','rotate('+num+'deg)')
    }
    add(div){
        if(div instanceof Div){
            this.shape.appendChild(div.shape)
        }else{
           this.shape.appendChild(div)
        }
    }
    remove() {
        //console.log(JSON.stringify(this.body))
        this.shape.parentNode.removeChild(this.shape)
    }
   
}
class P{
    constructor(string,x,y){
        this.x = x;
        this.y = y;
        this.string = string;
        this.shape = document.createElement('p')
        this.text = {}
        this.init()
    }
    
    init(){
        Object.assign(this.shape.style,{
            position:'absolute',
            top: this.y + 'px',
            left: this.x + 'px',
            color: 'white',
        })
       this.text = document.createTextNode(this.string)
       this.shape.appendChild(this.text)
       document.body.appendChild(this.shape)
    }
    remove(){
        this.shape.parentNode.removeChild(this.shape)
    }
    
}