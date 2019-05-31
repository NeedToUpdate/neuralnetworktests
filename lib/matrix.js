class Matrix {
    constructor(rows, cols) {
        if (rows instanceof Array) {
            this.label = '';
            this.rows = rows.length;
            if (typeof rows[0] === 'number') {
                //console.log(rows);
                this.cols = 1;
                this.values = rows.map(x => [x]);
            } else {
                this.cols = rows[0].length;
                this.values = [];

                //deep copy the values
                Array(this.rows)
                    .fill()
                    .forEach((x, i) => {
                        this.values[i] = [];
                        Array(this.cols)
                            .fill()
                            .forEach((x, j) => {
                                this.values[i][j] = rows[i][j];
                            });
                    });
            }

            //console.log(`Made new matrix with ${this.rows} rows and ${this.cols} columns`)
        } else {
            this.cols = cols;
            this.rows = rows;
            this.values = [];
            this.label = '';
            Array(rows)
                .fill()
                .forEach((x, i) => {
                    this.values[i] = [];
                    Array(cols)
                        .fill()
                        .forEach((x, j) => {
                            this.values[i][j] = 0;
                        });
                });
        }
    }

    log() {
        //nicely prints to console
        console.table(this.values);
    }

    map(func) {
        //applies a function to each value in the matrix
        //not sure if i can do softmax here so need exception
        if (func instanceof SomethingElse) {
            //dont want it to check too many things
            switch (func.name) {
                case 'softmax':
                    return this.softmax();
                case 'dsoftmax':
                    return this.d_softmax();
                default:
                    console.error(`no handler for this exception: ${func.name}`);
                    return this;
            }
        }
        this.values.forEach((arr, i) => {
            arr.forEach((x, j) => {
                this.values[i][j] = func(x, i, j);
            });
        });
        return this;
    }

    softmax() {
        let sumArr = this.flatten();
        let max = sumArr.reduce((a, b) => Math.max(a, b));
        let sum = sumArr.reduce((tot, x) => (tot += Math.exp(x - max)), 0);
        this.values.forEach((arr, i) => {
            arr.forEach((x, j) => {
                this.values[i][j] = Math.exp(this.values[i][j] - max) / sum;
            });
        });
        return this;
        // return arr.map(x=>(Math.exp(x-max)/sum));
    }
    static softmax(arr) {
        let sumArr = arr;
        let max = sumArr.reduce((a, b) => Math.max(a, b));
        let sum = sumArr.reduce((tot, x) => (tot += Math.exp(x - max)), 0);
        return arr.map(x => Math.exp(x - max) / sum);
    }
    static d_softmax(arr) {
        let sumArr = arr;
        let max = sumArr.reduce((a, b) => Math.max(a, b));
        let sum = sumArr.reduce((tot, x) => (tot += Math.exp(x - max)), 0);
        return arr.map(x => {
            let e0 = Math.exp(x - max);
            return (e0 * (sum - e0)) / (sum * sum);
        });
    }
    d_softmax() {
        let sumArr = this.flatten();
        let max = sumArr.reduce((a, b) => Math.max(a, b));
        let e_sum = sumArr.reduce((tot, x) => (tot += Math.exp(x - max)), 0);
        this.values.forEach((arr, i) => {
            arr.forEach((x, j) => {
                let e0 = Math.exp(this.values[i][j] - max);
                this.values[i][j] = (e0 * (e_sum - e0)) / (e_sum * e_sum);
            });
        });
        return this;
    }

    flatten() {
        let sumArr = [];
        this.values.forEach(arr => {
            sumArr = sumArr.concat(arr);
        });
        return sumArr;
    }

    sum() {
        return this.flatten().reduce((a, b) => a + b);
    }

    mapOne(func, i, j) {
        //applies function to one value in the matrix
        //function must take in one value and return one value
        this.values[i][j] = func(this.values[i][j]);
        return this;
    }

    add(n) {
        //elemntwise add
        if (n instanceof Matrix) {
            if (this.cols !== n.cols || this.rows !== n.rows) {
                console.error('Matrices must have same number of rows and columns to add pointwise');
                return undefined;
            }
            this.values.forEach((col, i) => {
                col.forEach((x, j) => {
                    this.values[i][j] += n.values[i][j];
                });
            });
            return this;
        } else {
            return this.map(x => x + n);
        }
    }

    static add(matrixA, matrixB) {
        //matrix add
        if (matrixA.cols !== matrixB.cols || matrixA.rows !== matrixB.rows) {
            console.error('Matrices must have same number of rows and columns');
            return undefined;
        }

        let a = matrixA.values;
        let b = matrixB.values;
        let c = [];
        a.forEach((arr, i) => {
            c[i] = [];
            arr.forEach((x, j) => {
                c[i][j] = a[i][j] + b[i][j];
            });
        });

        return new Matrix(c);
    }

    randomize(min, max) {
        //generates random numbers for each value wiht gaussian distribution
        //if none is set, then just random values from -1 to 1
        //if min-max is set then its bound to those
        //if only one number then limit to that number
        //if number is set plus true, then the number is the squish factor and produces more squished values
        function getRandomInt(min_, max_) {
            min_ = Math.ceil(min_);
            max_ = Math.floor(max_);
            return Math.floor(Matrix.gaussRand() * (max_ + 1 - min_)) + min_;
        }

        if (!arguments.length) {
            this.map(x => 1 - Matrix.gaussRand() * 2);
        } else if (arguments.length === 1 && typeof arguments[0] === 'number') {
            this.map(x => Math.floor(Matrix.gaussRand() * (min + 1)));
        } else if (arguments.length === 2 && typeof arguments[0] !== 'boolean') {
            this.map(x => getRandomInt(min, max));
        } else if (typeof arguments[1] !== 'boolean') {
            this.map(x => 1 - Matrix.gaussRand(arguments[1]) * 2);
        }
        return this;
    }
    static gaussRand(constraint) {
        constraint = constraint || 6;
        let rand = 0;
        for (let i = 0; i < constraint; i += 1) {
            rand += Math.random();
        }
        return rand / constraint;
    }

    //elementwise functions
    mult(n) {
        return this.multiply(n);
    }

    multiply(n) {
        if (n instanceof Matrix) {
            if (this.cols !== n.cols || this.rows !== n.rows) {
                console.error('Matrices must have same number of rows and columns to multiply pointwise');
                return undefined;
            }
            this.values.forEach((col, i) => {
                col.forEach((x, j) => {
                    this.values[i][j] *= n.values[i][j];
                });
            });
            return this;
        } else {
            return this.map(x => x * n);
        }
    }

    sub(n) {
        return this.subtract(n);
    }

    subtract(n) {
        if (n instanceof Matrix) {
            if (this.cols !== n.cols || this.rows !== n.rows) {
                console.error('Matrices must have same number of rows and columns to subtract pointwise');
                return undefined;
            }
            this.values.forEach((col, i) => {
                col.forEach((x, j) => {
                    this.values[i][j] -= n.values[i][j];
                });
            });
            return this;
        } else {
            return this.map(x => x - n);
        }
    }

    static subtract(matrixA, matrixB) {
        return this.add(matrixA, matrixB.copy().mult(-1));
    }
    div(n) {
        return this.divide(n);
    }
    divide(n) {
        if (n === 0) {
            return undefined;
        }
        return this.multiply(1 / n);
    }

    transpose(copy) {
        let tmp = new Matrix(this.cols, this.rows);

        tmp.values.forEach((row, i) => {
            row.forEach((x, j) => {
                tmp.values[i][j] = this.values[j][i];
            });
        });

        if (copy) {
            return tmp;
        } else {
            this.cols = tmp.cols;
            this.rows = tmp.rows;
            this.values = tmp.values;
            return this;
        }
    }

    static multiply(matrixA, matrixB) {
        if (matrixA.cols !== matrixB.rows) {
            console.error("matrix A's cols must match matrix B's rows");
            return undefined;
        }
        let result = new Array(matrixA.rows).fill(0).map(row => new Array(matrixB.cols).fill(0));
        let multd = result.map((row, i) => {
            return row.map((val, j) => {
                return matrixA.values[i].reduce((tot, a, k) => tot + a * matrixB.values[k][j], 0);
            });
        });
        return new Matrix(multd);
    }

    static dot(a, b) {
        let c = [];
        a.forEach((x, i) => {
            c[i] = x * b[i];
        });
        return c.reduce((t, x) => t + x);
    }

    copy() {
        //return an new copy
        let m = new Matrix(this.values);
        m.label = this.label;
        if (this.maxpoolhack) {
            m.maxpoolhack = this.maxpoolhack;
        }
        return m;
    }
    //todo add broadcasting (expand aray to fit size)

    static fromArray(arr, rows, cols) {
        arr = Array.from(arr);
        rows = rows || arr.length;
        cols = cols || 1;
        let rowsize = arr.length / rows;
        let newarr = [];
        for (let i = 0; i < rows; i++) {
            let row = arr.splice(0, cols);
            if (row.length < rowsize) {
                console.error('array doesnt fit this size');
            }
            newarr.push(row);
        }
        return new Matrix(newarr);
    }

    slice(x1, y1, x2, y2) {
        let colslice = x2 - x1;
        let rowslice = y2 - y1;
        let newarr = [];
        for (let i = y1; i < y2 + 1; i++) {
            newarr.push(this.values[i].slice(x1, x2 + 1));
        }
        return new Matrix(newarr);
    }

    static convolute(matrix, kernel, stepsize) {
        let fn = '';
        if (matrix.rows < kernel.rows) {
            console.error('kerner is bigger than the field');
            return undefined;
        }
        let newmat;
        if (stepsize instanceof SomethingElse) {
            fn = stepsize.name;
            stepsize = kernel.cols;
            newmat = new Matrix(matrix.rows / kernel.rows, matrix.cols / kernel.cols);
            newmat.maxpoolhack = [];
            if (newmat.rows !== Math.floor(newmat.rows)) {
                console.error('you cant maxpool this with this kernel');
                return undefined;
            }
        } else {
            stepsize = stepsize || 1;
            newmat = new Matrix(matrix.rows - kernel.rows + 1, matrix.cols - kernel.cols + 1);
        }
        let h = kernel.rows - 1;
        let w = kernel.cols - 1;
        let rows = [];

        for (let i = 0; i < matrix.rows - h; i += stepsize) {
            let row = [];
            for (let j = 0; j < matrix.cols - w; j += stepsize) {
                let sum;
                let slice = matrix.slice(j, i, h + j, w + i);
                let index = [];
                if (fn === 'maxpool') {
                    let temp = slice.flatten();
                    sum = temp.reduce((a, b) => Math.max(a, b));
                    let ii = temp.indexOf(sum);
                    index = [Math.floor(ii / slice.cols) + i, (ii % slice.rows) + j];
                    newmat.maxpoolhack.push(index);
                } else {
                    sum = slice.mult(kernel).sum();
                }
                row.push(sum);
            }
            rows.push(row);
        }
        newmat.values = rows;
        return newmat;
    }

    max() {
        return this.flatten().reduce((a, b) => Math.max(a, b));
    }
    min() {
        return this.flatten().reduce((a, b) => Math.min(a, b));
    }
    absmax() {
        //absolute of largest value in array
        return Math.max(Math.abs(this.max()), Math.abs(this.min()));
    }
    normalize(setmin, setmax) {
        //if no values then its just betwen 0 and 1
        let max = this.flatten().reduce((a, b) => Math.max(a, b));
        let min = this.flatten().reduce((a, b) => Math.min(a, b));
        if (!arguments[0]) {
            if (max === min) {
                return this;
            }
            return this.map(x => (x - min) / (max - min));
        } else {
            if (max === min) {
                return this.map(x => (x < 0 ? -setmin : x === 0 ? 0 : setmax));
            }
            return this.map(x => ((x - min) / (max - min)) * (setmax - setmin) + setmin);
        }
    }
    norm(setmin, setmax) {
        return this.normalize(setmin, setmax);
    }
    pad(num, val) {
        val = val || 0;
        for (let i = 0; i < num; i++) {
            this.rows += 2;
            this.cols += 2;
            this.values.forEach(row => {
                row.unshift(val);
                row.push(val);
            });
            this.values.push(Array(this.cols).fill(val));
            this.values.unshift(Array(this.cols).fill(val));
        }
        return this;
    }
    padTop(num, val) {
        val = val || 0;
        for (let i = 0; i < num; i++) {
            this.rows += 1;
            this.values.unshift(Array(this.cols).fill(val));
        }
        return this;
    }
    padLeft(num, val) {
        val = val || 0;
        for (let i = 0; i < num; i++) {
            this.cols += 1;
            this.values.forEach(row => {
                row.unshift(val);
            });
        }
        return this;
    }
    name(val) {
        this.label = val;
        return this;
    }
    flipX() {
        this.values.reverse();
        return this;
    }
    flipY() {
        this.values.forEach(row => {
            row.reverse();
        });
        return this;
    }
}

class SomethingElse {
    //used for functions that cant be solved by Matrix.map()
    //currently just softmax and dsoftmax
    //also used in maxpool
    constructor(string) {
        this.name = string;
    }
}
