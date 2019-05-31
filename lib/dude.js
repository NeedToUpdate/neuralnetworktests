class Dude {
    constructor(x, y, brain) {
        this.dt = 10;
        this.SL = 0.1; //speed limit
        this.decay = 0.1;
        this.amult = 0.1;
        this.rotmult = 0.5;
        this.canvasSize = { x: 500, y: 500 };
        this.width = this.canvasSize.x;
        this.height = this.canvasSize.y;
        this.penalty = 2;
        this.drawn = true;

        this.fw = new Vector(1, 0);
        this.p = new Vector(x || this.width / 2, y || this.height / 2);
        this.v = new Vector(0, 0);
        this.oldv = new Vector(0, 0);
        this.a = new Vector(0, 0);
        this.r = 0;

        this.life = 100;
        this.points = 0;
        this.dist = 0; //distance travelled
        this.brain = brain || new NeuralNetwork(6, 8, 3);

        this.brain.init();
        //p.x p.y v.x v.y r seen
        this.sensors = [];
        this.actions = {
            0: num => this.turnLeft(num),
            1: num => this.turnRight(num),
            2: num => this.goForeward(num),
            3: num => this.goBackward(num),
            4: num => this.strafeLeft(num),
            5: num => this.strafeRight(num),
        };

        /* this.seen = {
            front:false,
            left:false,
            right:false  
        };+m*/
        this.body = {
            head: "",
            eye1: "",
            eye2: "",
            vision: {
                front: "",
                left: "",
                right: "",
            },
        };
        this.config = {
            output: "dualwithsteer",
            //compared: 4 outputs, which is bigger flips direction
            //dual: 2 outputs, 0-0.5 = negative, 0.5-1 = positive
            //difference: 4 outputs, forward-backward= direction
            //dualwithsteer: much more advanced, like car driving physics 2 outputs to steer, 1 for velocity
        };
    }

    init() {
        this.body.head = new Div(this.p.x, this.p.y, "white", 10);
        this.body.eye1 = new Div(7, 5, "white", 2);
        this.body.eye2 = new Div(13, 5, "white", 2);
        this.body.head.add(this.body.eye1);
        this.body.head.add(this.body.eye2);
        document.body.appendChild(this.body.head.shape);
        this.initSensors();
    }
    initSensors() {
        let front = new Sensor(
            this,
            new Rect(this.p.x - 21, this.p.y - 99, 40, 90),
            "front"
        );
        let left = new Sensor(
            this,
            new Rect(this.p.x - 51, this.p.y - 29, 40, 40),
            "left"
        );
        let right = new Sensor(
            this,
            new Rect(this.p.x + 7, this.p.y - 29, 40, 40),
            "right"
        );
        this.sensors.push(left, front, right);
    }

    checkBounds() {
        if (this.p.y > this.canvasSize.y - 20) {
            this.p.y = this.canvasSize.y - 20;
            this.life -= this.penalty;
        }
        if (this.p.x > this.canvasSize.x - 20) {
            this.p.x = this.canvasSize.x - 20;
            this.life -= this.penalty;
        }
        if (this.p.y < 0) {
            this.p.y = 0;
            this.life -= this.penalty;
        }
        if (this.p.x < 0) {
            this.p.x = 0;
            this.life -= this.penalty;
        }
        if (this.points < 0) {
            this.points = 0;
        }
    }

    move(arr) {
        let f = new Vector(0, 0);

        switch (this.config.output) {
            case "compared":
                if (arr[0] > arr[1]) {
                    f.x += 0.02;
                } else {
                    f.x += -0.02;
                }
                if (arr[2] > arr[3]) {
                    f.y += 0.02;
                } else {
                    f.y += -0.02;
                }
                break;
            case "difference":
                break;
            case "dual":
                f.x += arr[0] * this.amult || 0;
                f.y += arr[1] * this.amult || 0;
                break;
            case "linearwithsteer":
                let dsteer = arr[0] * 6;
                this.fw.rotate(dsteer);
                let lat = this.fw.copy().perp();
                let fric = this.v.copy().mult(0.1);
                lat.mult(Vector.dot(lat, this.fw));
                // f = lat.mult(-1)
                this.v.sub(lat);
                this.v.sub(fric);
                f = this.fw.copy().mult(Math.max(arr[1], 0));
                break;
            case "dualwithsteer":
                let dsteer2;
                if (arr[0] - arr[1] > 0.05) {
                    dsteer2 = -40 * (arr[0] - arr[1]) * this.rotmult;
                } else if (arr[1] - arr[0] > 0.05) {
                    dsteer2 = 40 * (arr[1] - arr[0]) * this.rotmult;
                } else {
                    dsteer2 = 0;
                }
                this.fw.rotate(dsteer2);
                let lat2 = this.fw.copy().perp();
                let fric2 = this.v.copy().mult(0.1);
                lat2.mult(Vector.dot(lat2, this.fw));
                this.v.sub(lat2);
                this.v.sub(fric2);
                f = this.fw.copy().mult(Math.max(arr[2], 0));
                break;
            case "custom":
                f.add(arr);
                break;
            case "newtest":
                arr.forEach((x, i) => {
                    if (x > 0.1) {
                        f.add(this.actions[i](x > 0.1 ? x : 0));
                    }
                });
                break;
            default:
            //none
        }
        let lat = this.fw.copy().perp();
        let fric = this.v.copy().mult(0.1);
        lat.mult(Vector.dot(lat, this.fw));
        // f = lat.mult(-1)
        this.v.sub(lat.mult(0.8));
        this.v.sub(fric);

        this.a = f.mult(this.amult);
        this.v.add(this.a.mult(this.dt));
        this.v.limit(this.SL);
        this.r = this.fw.getAngle();
        this.a.clear();
        let dv = this.v
            .copy()
            .add(this.oldv)
            .div(2);
        this.oldv = dv.copy();
        this.p.add(this.v.copy().mult(this.dt));
    }

    update() {
        if (this.life <= 0) {
            return;
        }
        let inputs = this.getInputs();
        let thoughts = this.brain.predict(inputs);
        this.move(thoughts);
        this.checkBounds();
        this.updateSensors();
        this.life -= this.decay;
        if (this.drawn) {
            this.draw();
        }
    }

    getInputs() {
        return [
            // 1-((this.p.x*2)/this.width),
            //  1-((this.p.y*2)/this.height),
            this.p.x > this.canvasSize.x - 40 ||
            this.p.x < 20 ||
            this.p.y > this.canvasSize.y - 40 ||
            this.p.y < 20
                ? 1
                : 0,
            //    1-Math.random()*2,
            1 - Math.random() * 2,
            this.v.mag() / this.SL,
            //(this.v.y/this.SL),
            //   ((this.r)/360)%1,
            ...this.sensors.map(s => {
                return s.active ? 1 : 0;
            }),
        ];

        // inputs.forEach(x => {
        //     if (x > 1 || x < -1) {
        //         console.log(inputs);
        //         this.v.log();
        //     }
        // });

        // return inputs;
    }

    draw() {
        let h = this.body.head;
        h.moveTo(this.p);
        h.rotateTo(this.r);
    }

    turnLeft(num) {
        this.fw.rotate(-40 * num * this.rotmult);
        return new Vector(0, 0);
    }

    turnRight(num) {
        this.fw.rotate(40 * num * this.rotmult);
        return new Vector(0, 0);
    }
    goForeward(num) {
        return this.fw.copy().mult(num);
    }
    goBackward(num) {
        return this.fw
            .copy()
            .mult(-0.1)
            .mult(num);
    }
    strafeLeft(num) {
        return this.fw
            .copy()
            .perp()
            .mult(0.5)
            .mult(num);
    }
    strafeRight(num) {
        return this.fw
            .copy()
            .perp()
            .mult(-0.5)
            .mult(num);
    }

    eat() {
        this.points += 2;
        this.life += 10;
        //this.body.head.style.border = 'solid green 2px'
    }

    getFitness() {
        return this.points ** 2;
    }

    updateSensors() {
        if (this.sensors.length) {
            this.sensors.forEach(s => {
                s.moveTo(this.p).rotateTo(
                    this.fw.getAngle(),
                    this.p.x - 2,
                    this.p.y - 2
                );
            });
        }
    }
    remove() {
        this.body.head.remove();
        if (this.sensors.length) {
            this.sensors.forEach(s => {
                s.destroy();
            });
        }
    }
    attach(obj) {
        if (obj instanceof Sensor) {
            this.sensors.push(obj);
        }
    }
}
class Sensor {
    constructor(parent, obj, label) {
        this.obj = obj;
        this.parent = parent;
        //must be something you can do
        // .contains(point) on
        this.label = label;
        this.active = false;
        this.timeout = 100;
    }

    use(p) {
        let bool = this.obj.contains(p);
        if (!this.active && bool) {
            this.active = true;
            setTimeout(() => (this.active = false), this.timeout);
        }
        return bool;
    }

    read(p) {
        //return a value?
    }
    moveTo(p) {
        this.obj.moveTo(p);
        return this;
    }
    rotateTo(angle, rx, ry) {
        this.obj.rotateTo(angle, rx, ry);
        return this;
    }
    destroy() {
        if (this.obj.shape) {
            this.obj.shape.remove();
        }
        this.obj = {};
    }
}
