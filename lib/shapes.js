class Shape {
    constructor(args) {
        this.alpha = "abcdefghijklmnopqrstuvwxyz";
        if (arguments.length > 26) {
            console.error("too many points");
        }
        this.points = arguments.length;
        if (arguments[0] instanceof Array) {
            for (let i = 0; i < arguments.length - 1; i++) {
                this[this.alpha[i]] = new Vector(
                    arguments[i][0],
                    arguments[i][1]
                );
            }
        } else if (arguments[0] instanceof Object) {
            for (let i = 0; i < arguments.length - 1; i++) {
                this[this.alpha[i]] = new Vector(
                    arguments[i][0],
                    arguments[i][1]
                );
            }
        } else {
            for (let i = 0; i < arguments.length - 1; i += 2) {
                this[this.alpha[i / 2]] = new Vector(
                    arguments[i],
                    arguments[i + 1]
                );
            }
            this.points /= 2;
        }
        this.lines = [];
        this.draw();
    }
    draw() {
        for (let i = 0; i < this.points - 1; i++) {
            this.lines.push(
                new Line(
                    this[this.alpha[i]].x,
                    this[this.alpha[i]].y,
                    this[this.alpha[i + 1]].x,
                    this[this.alpha[i + 1]].y
                )
            );
        }
        this.lines.push(
            new Line(
                this[this.alpha[this.points - 1]].x,
                this[this.alpha[this.points - 1]].y,
                this[this.alpha[0]].x,
                this[this.alpha[0]].y
            )
        );
        //console.log(JSON.stringify(this.lines))
    }
    destroy() {
        this.lines.forEach(line => {
            line.destroy();
        });
        this.lines = [];
    }

    static makeTriangle(x, y, r) {
        return new Shape(x, y, x + r * 2, y, x + r, y + r * 2);
    }
    static makeRect(x, y, w, h) {
        return new Shape(x, y, x + w, y, x + w, y + h, x, y + h);
    }
}
