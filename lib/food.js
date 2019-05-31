class Food {
    constructor(amount, width, height) {
        this.canvasSize = { x: width || 400, y: height || 400 };
        this.amount = amount || 20;
        this.pieces = [];
        this.eatenpieces = [];
        this.pieceDivs = [];
        this.drawing = true;
    }

    init() {
        for (let i = 0; i < this.amount; i++) {
            let point = new Vector(
                Math.floor(Math.random() * this.canvasSize.x),
                Math.floor(Math.random() * this.canvasSize.y)
            );
            let div = new Div(point.x, point.y, "pink", 1);
            this.pieces.push({ p: point, div: div });
        }
    }

    reinit() {
        let temp = this.pieces.map(x => x);
        this.pieces.forEach(x => {
            x.div.remove();
        });
        temp = temp.concat(this.eatenpieces);
        this.pieces = [];
        this.eatenpieces = [];
        //console.log(temp)
        temp.forEach(f => {
            let point = f.p.copy();
            let div;
            if (this.drawing) {
                div = new Div(point.x, point.y, "pink", 1);
            }
            this.pieces.push({ p: point, div: div });
        });
    }

    check2(vector, eat) {
        //using vectors

        for (let i = this.pieces.length - 1; i > 0; i--) {
            console.log(
                this.pieces[i][0]
                    .copy()
                    .sub(vector)
                    .mag()
            );
            if (
                this.pieces[i][0]
                    .copy()
                    .sub(vector.copy().add(10))
                    .mag() < 100
            ) {
                if (eat) {
                    document.body.removeChild(this.pieces[i][1]);
                    this.pieces.splice(i, 1);
                }
                return true;
            }
        }
    }

    checkOne(p, box, eat) {
        //using my rect class

        let isnear;
        if (box instanceof Rect) {
            isnear = box.contains(p.p);
        } else {
            isnear =
                box
                    .copy()
                    .sub(p.p)
                    .mag() < 13;
        }
        if (isnear) {
            //box.highlight()
            if (eat) {
                if (p.div) {
                    p.div.remove();
                    p.div = undefined;
                }
                this.eatenpieces.push(
                    this.pieces.splice(this.pieces.indexOf(p), 1)[0]
                );
            }
            return true;
        }
    }

    check(box, eat) {
        //using drawn divs
        for (let i = this.pieces.length - 1; i > 0; i--) {
            if (this.collide(this.pieces[i][1], box)) {
                if (eat) {
                    document.body.removeChild(this.pieces[i][1]);
                    this.eatenpieces.push(this.pieces.splice(i, 1)[0]);
                }
                return true;
            }
        }
    }

    collide(el1, el2) {
        //using drawin divs
        let rect1 = el1.getBoundingClientRect();
        let rect2 = el2.getBoundingClientRect();
        return !(
            rect1.top > rect2.bottom ||
            rect1.right < rect2.left ||
            rect1.bottom < rect2.top ||
            rect1.left > rect2.right
        );
    }

    static genStyle(x, y) {
        return {
            height: "3px",
            width: "3px",
            //border: 'green solid 1px',
            borderRadius: "50%",
            position: "absolute",
            top: y + "px",
            left: x + "px",
            backgroundColor: "pink",
        };
    }
}
