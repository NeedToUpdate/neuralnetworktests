class Vector {
    constructor(x, y) {
        if (x instanceof Vector) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x || 0;
            this.y = y || 0;
        }
    }

    add(v) {
        if (v instanceof Vector) {
            this.x += v.x;
            this.y += v.y;
        } else {
            this.x += v;
            this.y += v;
        }
        return this;
    }
    sub(vector) {
        return this.subtract(vector);
    }
    subtract(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    }
    getAngle(rads) {
        if (!rads) {
            return (Math.atan2(this.y, this.x) * 180) / Math.PI + 90;
        } else {
            return Math.atan2(this.y, this.x) + Math.PI / 2;
        }
    }

    clear() {
        this.x = 0;
        this.y = 0;
        return this;
    }

    div(scalar) {
        return this.divide(scalar);
    }

    divide(scalar) {
        return this.multiply(1 / scalar);
    }

    mult(scalar) {
        return this.multiply(scalar);
    }

    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    copy() {
        return new Vector(this);
    }

    map(fn) {
        this.x = fn(this.x);
        this.y = fn(this.y);
        return this;
    }

    mag() {
        return this.magnitude();
    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    log() {
        console.log(JSON.stringify(this));
    }
    static fromAngle(r, rads) {
        if (!rads) {
            r /= 180;
            r *= Math.PI;
            r -= Math.PI / 2;
            //console.log(r)
        }
        return new Vector(Math.cos(r), Math.sin(r));
    }
    rotate(r, rads) {
        if (!rads) {
            r = this.d2r(r);
            //r -= Math.PI/2;
        }
        let dx = this.x * Math.cos(r) - this.y * Math.sin(r);
        let dy = this.x * Math.sin(r) + this.y * Math.cos(r);
        this.x = dx;
        this.y = dy;
        return this;
    }
    d2r(r) {
        return (r / 180) * Math.PI;
    }
    limit(n) {
        let m = this.mag();
        if (m > n) {
            this.mult(n / m);
            return this;
        } else {
            return this;
        }
    }
    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }
    perp() {
        return this.perpendicular();
    }
    perpendicular() {
        let dx = this.y;
        let dy = this.x * -1;
        this.y = dy;
        this.x = dx;
        return this;
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    rotateAround(p, angle, rads) {
        if (!rads) {
            angle *= Math.PI / 180;
        }
        let c = Math.cos(-angle);
        let s = Math.sin(-angle);
        let nx = c * (this.x - p.x) + s * (this.y - p.y) + p.x;
        let ny = c * (this.y - p.y) - s * (this.x - p.x) + p.y;
        this.x = nx;
        this.y = ny;
        return this;
    }

    distance(v) {
        let x = this.x - v.x;
        let y = this.y - v.y;
        return Math.sqrt(x * x + y * y);
    }
    dist(v) {
        return this.distance(v);
    }
    set(n) {
        let m = this.mag();
        this.mult(n / m);
        return this;
    }
}
