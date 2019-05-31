class nnOverlay {
    constructor(nn) {
        this.x = window.innerWidth - 190;
        this.y = 10;
        this.height = 90;
        this.width = 170;
        this.num_of_layers = nn.layer_nodes.length;
        this.layers = nn.layer_nodes.map(x => Array(x).fill(0));
        this.rect = new Div(this.x, this.y, 0, 0, true);
        this.rect.shape.style.borderRadius = '';
        this.rect.shape.style.width = this.width + 'px';
        this.rect.shape.style.height = this.height + 'px';
        this.circles = [];
        this.lines = [];
        this.nn = nn;
        this.initd = false;
    }
    init() {
        this.initd = true;
        let colRes = (this.width - 20) / (this.num_of_layers - 1);
        this.layers.forEach((arr, i) => {
            if (i !== this.num_of_layers - 1) {
                this.lines[i] = [];
            }
            let rowRes = this.height / (arr.length + 1);
            this.circles[i] = [];

            arr.forEach((x, j) => {
                if (i !== this.num_of_layers - 1) {
                    this.lines[i][j] = [];
                }
                if (i !== this.num_of_layers - 1) {
                    for (let k = 0; k < this.layers[i + 1].length; k++) {
                        let rowRes2 = this.height / (this.layers[i + 1].length + 1);
                        let h = rowRes2 * (k + 1) - rowRes * (j + 1);
                        let w = Math.sqrt(h * h + colRes * colRes);
                        let ang = Math.asin(h / w);
                        let r = new Div(
                            this.x + colRes * i + 10,
                            this.y + rowRes * (j + 1),
                            this.getCol(this.nn.layers[i].weight_array[0][0].values[k][j]),
                            w,
                            0,
                            true,
                            ang * (180 / Math.PI),
                            true
                        );
                        this.lines[i][j].push(r);
                    }
                }
                let c = new Div(this.x + colRes * i + 10, this.y + rowRes * (j + 1), 'blue', Math.sqrt(rowRes));
                this.circles[i].push(c);
            });
        });
    }
    draw() {
        this.circles.forEach((arr, i) => {
            arr.forEach((c, j) => {
                let val = 0;
                if (i === 0) {
                    val = (this.nn.layers[i].input_values.values[j][0] || 0) * 255;
                } else {
                    val = this.nn.layers[i - 1].output_values.values[j][0] * 255;
                }

                c.shape.style.background = 'rgb(' + val + ',' + val + ',' + val + ')';
            });
        });

        //console.log(JSON.stringify(this.nn.layerWeights[0].values))
    }
    destroy() {
        if (!this.initd) {
            return;
        }
        this.circles.forEach(arr => {
            arr.forEach(c => {
                document.body.removeChild(c.shape);
            });
        });
        this.lines.forEach((col, i) => {
            col.forEach((arr, j) => {
                arr.forEach((line, k) => {
                    document.body.removeChild(line.shape);
                });
            });
        });
        document.body.removeChild(this.rect.shape);
        this.initd = false;
    }
    getCol(n) {
        //-1<n<1
        let g = 0;
        let r = 0;
        if (n > 0) {
            g = 255 * n;
        } else {
            r = -255 * n;
        }
        return 'rgb(' + r + ',' + g + ',0)';
    }
}
