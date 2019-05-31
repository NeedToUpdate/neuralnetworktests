class NeuralNetwork {
    constructor(layer) {
        this.num_of_inputs = layer;
        this.layers = [];
        this.layer_nodes = [];
        this.num_of_outputs = 0;
        this.output_layer = {};
        this.num_of_layers = arguments.length - 1;
        this.initialized = false;
        this.training = false;
        this.sequence_training = false;
        this.exploded = false;
        //this.batch_training = false; 
        this.sequence = {
            targets: [],
            outputs: [],
        };
        // this.batch = {
        //     targets: [],
        //     outputs: [],
        // };
        if (arguments.length < 1) {
            console.error('minimum 1 layer');
        }

        this.config = {
            default_type: 'dense',
            activation_fn: 'default',
            learning_rate: 0.01,
            output_activation_fn: 'default',
            default_activation_fn: 'relu',
            weights_start: 'default', //default, random, narrow is closer to 0, or num
            biases_stat: 'default',
            autoinit: false,
            output_fn: '',
            sequence_size: 0, //for sequence training
            batch_size: 0, //for batch training
            loss_fn: 'default', //can be mean_squared or cross_entropy
            saved_losses: 1000,
            learning_fn: 'default', //could be default or SGD, will multiply the learning rate by the loss
            learning_alpha: 1, //will be multiplied by the learning rate over time
            skip_alpha_steps: 100, //wont start lowering the learning rate until this many steps have passed
            is_alpha_calculated: false,
            //genetic stuff
            mutationAmount: 0.01,
            mutationRate: 0.05,
        };
        this.error_vals = [];
        this.training_times = 0;
        if (typeof arguments[arguments.length - 1] === 'boolean' && arguments[arguments.length - 1]) {
            //autoinit
            this.num_of_layers--;
            this.config.autoinit = true;
        }
        if (arguments.length >= 2) {
            for (let i = 0; i < this.num_of_layers; i++) {
                this.layer_nodes.push(arguments[i]);
                this.layers.push(new Layer(arguments[i], arguments[i + 1]));
            }
            this.layer_nodes.push(arguments[arguments.length - 1]);
            this.num_of_outputs = this.layers[this.num_of_layers - 1].num_of_outputs;
        } else {
            this.layer_nodes.push(layer);
        }
        if (this.config.autoinit) {
            this.initdefault();
        }
    }

    initdefault() {
        this.layers.forEach(layer => {
            Object.assign(layer.config, {
                activation_fn: this.config.activation_fn,
                learning_rate: this.config.learning_rate,
                weights_start: this.config.weights_start,
                biases_start: this.config.biases_start,
                type: this.config.default_type,
            });
        });
        this.layers[this.num_of_layers - 1].config.activation_fn = this.config.output_activation_fn;
        this.layers[this.num_of_layers - 1].config.output_layer = true;

        this.layers.forEach(x => x.init());
    }

    addLayer(output_nodes, type, config, is_output) {
        let l = new Layer(this.layer_nodes[this.num_of_layers], output_nodes);
        this.layers.push(l);
        if (arguments.length < 2) console.log(`%cdon't forget to set config of this layer!`, 'color:teal');
        if (type) l.config.type = type;

        Object.assign(l.config, config);
        if (typeof is_output === 'boolean') l.config.output_layer = is_output;
        this.num_of_layers++;
        this.layer_nodes.push(output_nodes);
        if (is_output) {
            this.num_of_outputs = output_nodes;
            this.output_layer = l;
        }
        return l;
    }

    init() {
        //assumes all settings are finished
        this.training_times = 0;
        this.error_vals = [];
        Object.keys(this.sequence).forEach(key => (this.sequence[key] = []));
        this.layers.forEach(x => x.init());
        if (Object.keys(this.output_layer) < 1) {
            this.num_of_outputs = this.layers[this.num_of_layers - 1].num_of_outputs;
            this.output_layer = this.layers[this.num_of_layers - 1];
        }
        this.exploded = false;
        this.initialized = true;
    }

    removeLayer(index) {
        if (index > this.num_of_layers - 1 || index < 0) {
            console.log('out of bounds, cant remove');
            return undefined;
        }
        this.num_of_layers--;
        this.layers.splice(index, 1);
        this.layer_nodes.splice(index, 1);
        this.layers[index - 1].num_of_outputs = this.layers[index].num_of_inputs;
        this.init();
    }

    randomizeAll() {
        this.layers.forEach(x => x.randomize());
    }

    predict(input_array) {
        if (!this.initialized) {
            this.init();
        }
        //input is array
        if (input_array.length !== this.num_of_inputs) {
            console.error(`input (${input_array.length}) must match input nodes (${this.num_of_inputs})`);
            return undefined;
        }

        //let inputLayer = new Matrix(input_array);
        let next_layer = input_array;
        this.layers.forEach(x => {
            //inputs goes into the layer
            if (this.training) {
                x.training = true;
            }
            if (this.sequence_training) {
                x.sequence_training = true;
            }
            next_layer = x.feedForward(next_layer);
            // console.log(next_layer)
            //move to next step
        });

        if (this.config.output_fn) {
            next_layer = next_layer.map(outputs[this.config.output_fn]);
        }

        return next_layer;
    }
    // setBatchTrain(num){
    //     if(this.sequence_training){
    //         console.error('cant sequence and batch train at the same time right now sorry');
    //         return;
    //     }
    //     this.batch_training = true;
    //     this.config.batch_size = num;
    //     //no need to tell the layers can be handled here.
    // }
    setSequenceTrain(num) {
        // if(this.batch_training){
        //     console.error('cant sequence and batch train at the same time right now sorry');
        //     return;
        // }
        this.sequence_training = true;
        this.config.sequence_size = num;
        this.layers.forEach((x, i) => {
            i = this.num_of_layers - 1 - i;
            // through each layer
            if (this.layers[i].config.type === 'lstm') {
                this.layers[i].config.sequence_size = num;
                this.layers[i].sequence_training = true;
            }
        });
    }

    async asynctrain(input_array, targets) {
        return new Promise(resolve => {
            this.train(input_array, targets, resolve);
        });
    }

    train(input_array, targets, callback) {
        if (!this.initialized) {
            console.error('Neural Network not initialized, run nn.init()');
            return;
        }
        if (input_array.length !== this.num_of_inputs) {
            console.error(`input (${input_array.length}) must match input nodes (${this.num_of_inputs})`);
            return undefined;
        }
        if (targets.length !== this.num_of_outputs) {
            console.error(`target must match output nodes (${this.num_of_outputs})`);
            return undefined;
        }
        if (this.config.learning_fn === 'SGD') {
            if (this.config.is_alpha_calculated) {
                this.setLearningRate(this.config.learning_alpha * this.calc_loss(), true);
            } else {
                //first hundred or so steps will have insane loss numbers
                if (this.training_times > this.config.skip_alpha_steps) {
                    this.config.learning_alpha = this.config.learning_rate / this.calc_loss();
                    this.config.is_alpha_calculated = true;
                }
            }
        }
        let outputM;
        let targetM;

        this.training = true;
        this.training_times++;
        outputM = new Matrix(this.predict(input_array));
        targetM = new Matrix(targets);
        let error_array = [];
        if (this.sequence_training) {
            if (this.sequence.outputs.length < this.config.sequence_size - 1) {
                this.sequence.outputs.push(outputM);
                this.sequence.targets.push(targetM);
                return;
            }
            this.sequence.outputs.push(outputM);
            this.sequence.targets.push(targetM);
            error_array = this.sequence.outputs.map((matrix, index) => {
                if (this.config.loss_fn !== 'default') {
                    this.error_vals.push(loss_fn[this.config.loss_fn](matrix.flatten(), this.sequence.targets[index].flatten()));
                }

                return matrix.sub(this.sequence.targets[index]).flatten();
            });
            Object.keys(this.sequence).forEach(key => (this.sequence[key] = []));
        }
        let prev_error;
        if (!this.sequence_training) {
            if (this.config.loss_fn !== 'default') {
                let loss = loss_fn[this.config.loss_fn](outputM.flatten(), targetM.flatten());
                if (loss !== Infinity && !isNaN(loss)) {
                    this.error_vals.push(loss);
                }

                if (this.error_vals.length > this.config.saved_losses) {
                    this.error_vals.splice(0, 1);
                }
            }
            prev_error = outputM.sub(targetM).flatten();
            //needs replacement with loss function
        } else {
            prev_error = error_array;
        }

        this.layers.forEach((x, i) => {
            i = this.num_of_layers - 1 - i;
            // backpropagate through each layer
            if (this.sequence_training) {
                if (this.layers[i].config.type !== 'lstm') {
                    //lazy reverse
                    prev_error.reverse();
                    prev_error = prev_error.map(x => this.layers[i].backPropagate(x));
                    if (prev_error[0] instanceof SomethingElse) {
                        if (prev_error[0].name === 'exploded') {
                            this.exploded = true;
                        }
                    }
                    prev_error.reverse();
                } else {
                    prev_error = this.layers[i].backPropagate(prev_error);
                    if (prev_error[0] instanceof SomethingElse) {
                        if (prev_error[0].name === 'exploded') {
                            this.exploded = true;
                        }
                    }
                }
            } else {
                prev_error = this.layers[i].backPropagate(prev_error);
                if (prev_error instanceof SomethingElse) {
                    if (prev_error.name === 'exploded') {
                        this.exploded = true;
                    }
                }
            }

            this.layers[i].training = false;
            //move to next step
        });
        //arbitrary value
        if (this.error_vals.length > 3000) {
            this.error_vals.splice(0, this.error_vals.length - 3000);
        }
        this.training = false;
        if (callback) {
            callback();
        }
    }

    setLearningRate(num, dontaffectalpha) {
        if (this.config.is_alpha_calculated && !dontaffectalpha) {
            this.config.learning_alpha = this.config.learning_alpha * (num / this.config.learning_rate);
        }
        this.layers.forEach(x => (x.config.learning_rate = num));
        this.config.learning_rate = num;
    }

    log() {
        console.groupCollapsed('Neural Net:');
        console.log(`%c=========================`, 'color:blue');
        console.log(`%cinputs:  ${this.num_of_inputs}  | outputs:  ${this.output_layer.num_of_outputs}`,'color:darkblue');
        
        this.layers.forEach(x => {
            console.log(`%c-------------------------`, 'color:blue')
            x.log();
        });
        console.log(`%c=========================`, 'color:blue');
        console.groupEnd();
    }

    calc_loss() {
        if (this.config.loss_fn === 'default') {
            console.error('No loss function set');
            return null;
        }
        if (this.error_vals.length < 1) {
            console.log('never trained');
            return undefined;
        }
        return this.error_vals.reduce((a, b) => a + b) / this.error_vals.length;
    }

    //============ Genetic Neuroevolution Stuff ===============

    map(fn) {
        this.layers.forEach(layer => {
            layer.weight_array.forEach((group, l) => {
                group.forEach((W, m) => {
                    W.map(fn);
                });
            });
            layer.bias_array.forEach((group, l) => {
                group.forEach((B, m) => {
                    B.map(fn);
                });
            });
        });
    }
    mutate(rate, amount) {
        let r = rate || this.config.mutationRate;
        let a = amount || this.config.mutationAmount;
        function mut(x) {
            let b = Math.random() < r;
            let val = (1 - Math.random() * 2) * a;
            if (x + val > 1 || x + val < -1) {
                if (val > 0) {
                    val = 1 - x;
                } else {
                    val = -1 - x;
                }
            }
            return b ? x + val : x;
        }
        this.map(mut);
        return this;
    }
    mix(nnB, rate) {
        let r = rate || 0.5;
        function pick(a, b) {
            return Math.random() < r ? a : b;
        }
        let nnA = this.copy();
        nnA.layers.forEach((layer, k) => {
            layer.weight_array.forEach((group, l) => {
                group.forEach((W, m) => {
                    W.map((x, i, j) => pick(x, nnB.layers[k].weight_array[l][m].values[i][j]));
                });
            });
            layer.bias_array.forEach((group, l) => {
                group.forEach((B, m) => {
                    B.map((x, i, j) => pick(x, nnB.layers[k].bias_array[l][m].values[i][j]));
                });
            });
        });
        return nnA;
    }
    copy() {
        let newNN = new NeuralNetwork(this.num_of_inputs);
        newNN.layers = this.layers.map(layer => {
            return layer.copy();
        });
        newNN.config = Object.assign({}, this.config);
        newNN.layer_nodes = Array.from(this.layer_nodes);
        newNN.num_of_outputs = this.num_of_outputs;
        newNN.num_of_layers = this.num_of_layers;
        newNN.output_layer = newNN.layers[newNN.num_of_layers - 1];
        newNN.initialized = true;
        return newNN;
    }

    static fromJSON(json) {
        let temp = JSON.parse(json);
        let brain = new NeuralNetwork(temp.num_of_inputs);
        temp.layers.forEach(layer => {
            brain.addLayer(layer.num_of_outputs, layer.config.type, {activation_fn: layer.config.activation_fn}, layer.config.output_layer);
        });
        Object.assign(brain.config, temp.config);
        brain.training_times = temp.training_times;
        brain.layers.forEach((layer, i) => {
            Object.assign(layer.config, temp.layers[i].config);
            layer.weight_array = temp.layers[i].weight_array.map(group => {
                return group.map(W => {
                    let m = new Matrix(W.values);
                    m.label = W.label;
                    if (W.maxpoolhack) {
                        m.maxpoolhack = W.maxpoolhack;
                    }
                    return m;
                });
            });
            layer.bias_array = temp.layers[i].bias_array.map(group => {
                return group.map(B => {
                    let b = new Matrix(B.values);
                    b.label = B.label;
                    return b;
                });
            });
            layer.initialized = true;
        });
        brain.error_vals = temp.error_vals;
        brain.initialized = true;
        return brain;
    }
}

loss_fn = {
    cross_entropy: (output, target) => {
        let err = 0;
        output.forEach((out, i) => {
            err += target[i] * Math.log(out) + (1 - target[i]) * Math.log(1 - out);
        });
        return -err;
    },
    mean_squared: (output, target) => {
        let err = [];
        output.forEach((out, i) => {
            let e = out - target[i];
            err.push(e * e);
        });
        return err.reduce((a, b) => a + b) / output.length;
    },
}; //i really dont know if this is right
activations = {
    softmax: new SomethingElse('softmax'),
    sigmoid: x => 1 / (1 + Math.exp(-x)),
    relu: x => Math.max(x, 0),
    tanh: x => 2 / (1 + Math.exp(-2 * x)) - 1,
    linear: x => x,
    lrelu: x => (x >= 0 ? x : x * 0.01),
    crelu: x => (x >= 0 ? Math.min(x, 1) : 0),
    swish: x => x / (1 + Math.exp(-x)),
};
outputs = {
    sign: x => (x >= 0 ? 1 : 0),
    round: x => (x >= 0.5 ? 1 : 0),
    push: x => (x >= 0.9 ? 1 : x <= 0.1 ? 0 : x),
    relu: x => Math.max(x, 0),
};
d_activations = {
    softmax: new SomethingElse('dsoftmax'), //TODO no idea honestly
    sigmoid: x => activations['sigmoid'](x) * (1 - activations['sigmoid'](x)),
    relu: x => (x > 0 ? 1 : 0),
    tanh: x => 1 - activations['tanh'](x) * activations['tanh'](x),
    linear: y => 1,
    lrelu: y => (y >= 0 ? 1 : 0.01),
    crelu: y => (y >= 0 ? 1 : 0),
    swish: x => x + activations['sigmoid'](x) * (1 - x),
};

class Layer {
    constructor(input_nodes, output_nodes, autoinit) {
        this.num_of_inputs = input_nodes;
        this.num_of_outputs = output_nodes;
        if (this.num_of_inputs === 0 || this.num_of_outputs === 0) {
            console.error('layer has 0 nodes, will cause issues.');
        }

        this.config = {
            type: 'dense', //can be dense, recurrent or lstm, or conv, maxpool
            time_steps: 2, //time steps to backpropagate through
            num_of_rns: undefined, //num of recurrrent nodes, if blank will default to full
            rn_offset: undefined, //dont think this has any value
            biases_start: 'default',
            weights_start: 'default',
            activation_fn: 'default',
            default_activation_fn: 'relu',
            learning_rate: 0.1,
            output_layer: false, //if this is the last layer
            sequence_size: 10, //for sequence training, will be set by nn train function
            color_depth: 'w', //can be rgb, rgba or w //TODO fix rgb, only b/w works right now
            kernel_size: 1,
            step_size: 1,
            feature_maps: 1,
            flatten_layer: false, //if true, will flatten the output to an array
            norm_gradient_val: undefined,
            norm_weight_val: undefined, //clipping of weights and gradients if set
            output_dropout_rate: 0, //if 0 = 0% chance, 1 = 100% chance
            input_dropout_rate: 0,
        };
        this.training = false; //used to store values if needed
        this.sequence_training = false; //used for lstm

        this.weight_array = []; //all the weights should be here
        this.bias_array = []; //all the biases should be here

        this.input_values = {}; //should always be the last input
        this.outputs_calcd = {}; //should be output values before activation fn
        this.output_values = {}; //should always be the last output

        //for LTSM

        this.cellstate_raw_inputs = {};
        this.cellstate_outputs = {};

        this.hidden_error_cache = [];
        this.cellstate_error_cache = [];
        this.cellstate_output_cache = [];
        this.forget_output_cache = [];
        this.i_output_cache = []; //input gate sigm half
        this.a_output_cache = []; //input gate tanh half

        //for recurrent
        this.hidden_cache = [];
        this.input_value_cache = [];
        this.outputs_calcd_cache = []; //also used for o_output_cache
        this.output_value_cache = [];

        this.initialized = false;

        if (autoinit) {
            this.init();
        }
    }

    init() {
        //clear the stuff just in case
        if (this.config.activation_fn === 'default' && !/^conv|lstm|maxpool$/.test(this.config.type)) {
            console.log(`%cno activation function selected for layer, using default: (${this.config.default_activation_fn})`, 'color:orange');
            this.config.activation_fn = this.config.default_activation_fn;
        }
        this.weight_array = [];
        this.bias_array = [];
        if (this.weights) {
            this.input_values = this.raw_outputs = this.outputs_calcd = this.output_values = {};
        }
        if (this.config.type === 'lstm') {
            this.hidden_error_cache = [];
            this.cellstate_error_cache = [];
            this.cellstate_output_cache = [];
            this.forget_output_cache = [];
            this.i_output_cache = []; //input gate sigm half
            this.a_output_cache = []; //input gate tanh half
        }
        //sanity check
        if (typeof this.config.kernel_size !== 'number') {
            this.config.kernel_size = parseInt(this.config.kernel_size);
        }
        //create weight matrix
        switch (this.config.type) {
            case 'lstm':
                if (this.sequence_training) {
                    this.config.time_steps = this.config.sequence_size;
                }
                if (!this.config.num_of_rns || this.config.num_of_rns > this.num_of_outputs) {
                    this.config.num_of_rns = this.num_of_outputs;
                }
                this.weight_array.push([
                    new Matrix(this.num_of_outputs, this.num_of_inputs + this.config.num_of_rns), //forget gate
                    new Matrix(this.num_of_outputs, this.num_of_inputs + this.config.num_of_rns), //sigm half of input
                    new Matrix(this.num_of_outputs, this.num_of_inputs + this.config.num_of_rns), //tanh half of input
                    new Matrix(this.num_of_outputs, this.num_of_inputs + this.config.num_of_rns), //output gate
                ]);
                this.bias_array.push([
                    new Matrix(this.num_of_outputs, 1), //f
                    new Matrix(this.num_of_outputs, 1), //i
                    new Matrix(this.num_of_outputs, 1), //a
                    new Matrix(this.num_of_outputs, 1), //o
                ]);

                //fill caches

                let caches = [
                    this.hidden_error_cache,
                    this.cellstate_error_cache,
                    this.cellstate_output_cache,
                    this.forget_output_cache,
                    this.i_output_cache,
                    this.a_output_cache,
                    this.outputs_calcd_cache,
                ];

                caches.forEach(cache => {
                    while (cache.length < this.config.time_steps + 1) {
                        cache.push(new Matrix(Array(this.config.num_of_rns).fill(0)));
                    }
                });
                while (this.input_value_cache.length < this.config.time_steps + 1) {
                    this.input_value_cache.push(new Matrix(Array(this.config.num_of_rns + this.num_of_inputs).fill(0)));
                }

                break;
            case 'dense':
                this.weight_array.push([new Matrix(this.num_of_outputs, this.num_of_inputs)]);
                this.bias_array.push([new Matrix(this.num_of_outputs, 1)]);
                break;
            case 'recurrent':
                this.input_value_cache = [];
                this.output_value_cache = [];
                this.outputs_calcd_cache = [];
                this.hidden_cache = [];
                this.bias_array.push([new Matrix(this.num_of_outputs, 1)]);
                if (!this.config.num_of_rns || this.config.num_of_rns > this.num_of_outputs) {
                    this.config.num_of_rns = this.num_of_outputs;
                }
                this.weight_array.push([new Matrix(this.num_of_outputs, this.num_of_inputs + this.config.num_of_rns)]);
                break;
            case 'maxpool':
                this.config.feature_maps = 1;
                let group = [];
                Array.from(this.config.color_depth).forEach(label => {
                    let m = new Matrix(this.config.kernel_size, this.config.kernel_size);
                    group.push(m.name(label));
                });
                this.weight_array.push(group);
                this.bias_array.push([new Matrix(1, 1)]);
                break;
            case 'conv':
                this.config.feature_maps = this.num_of_outputs / this.num_of_inputs;
                for (let i = 0; i < this.config.feature_maps; i++) {
                    let group = [];
                    Array.from(this.config.color_depth).forEach(label => {
                        let m = new Matrix(this.config.kernel_size, this.config.kernel_size);
                        group.push(m.name(label));
                    });
                    this.weight_array.push(group);
                    this.bias_array.push([new Matrix(1, 1)]);
                }
                break;
            case 'empty':
                break;
            default:
                console.error('using the default case, maybe a typo for layer type');
        }

        //initialize starting weight values
        if (/^random|default/.test(this.config.weights_start)) {
            //this.weights.randomize();
            this.weight_array.forEach(group => {
                group.forEach(W => {
                    W.randomize();
                });
            });
        } else if (/^narrow/.test(this.config.weights_start)) {
            this.weight_array.forEach(group => {
                group.forEach(W => {
                    W.randomize(true, 20).norm(-0.01, 0.01);
                });
            });
        } else if (/^calculated/.test(this.config.weights_start)) {
            let num = Math.sqrt(6 / ((this.num_of_inputs + this.num_of_outputs) * this.config.kernel_size ** 2));
            this.weight_array.forEach(group => {
                group.forEach(W => {
                    W.randomize(true, 20).norm(-num, num);
                });
            });
        } else if (typeof this.config.weights_start === 'number') {
            this.map(x => this.config.weights_start);
        }

        if (/^random|default/.test(this.config.biases_start)) {
            this.bias_array.forEach(group => {
                group.forEach(W => {
                    W.randomize();
                });
            });
        } else if (/^narrow/.test(this.config.biases_start)) {
            this.bias_array.forEach(group => {
                group.forEach(W => {
                    W.randomize(true, 20).norm(-0.01, 0.01);
                });
            });
        } else if (typeof this.config.biases_start === 'number') {
            this.map_biases(x => this.config.biases_start);
        }
        this.input_values = new Matrix(Array(this.num_of_inputs).fill(0));
        this.output_values = new Matrix(Array(this.num_of_outputs).fill(0));
        this.initialized = true;
    }

    feedForward(input_array) {
        if (!this.initialized) {
            console.error(this.config.type + ' layer isnt initialized, run .init()');
        }
        if (input_array.length !== this.num_of_inputs) {
            console.error('from: ', this.config.type);
            console.error(`input (${input_array.length}) must match input nodes (${this.num_of_inputs})`);
            return undefined;
        }

        //prep the inputs for rnn and others
        switch (this.config.type) {
            case 'lstm':
                while (this.hidden_cache.length < this.config.time_steps + 1) {
                    this.hidden_cache.push(Array(this.config.num_of_rns).fill(0));
                }
                //input array dropout
                if (this.config.input_dropout_rate > 0 && this.training) {
                    input_array.forEach((x, i) => {
                        if (Math.random() < this.config.input_dropout_rate) {
                            input_array[i] = 0;
                        }
                    });
                }
                input_array = input_array.concat(this.hidden_cache[this.config.time_steps]);
                if (this.training) {
                    this.input_value_cache.push(new Matrix(input_array));
                    if (this.input_value_cache.length > this.config.time_steps + 1) {
                        this.input_value_cache.splice(0, 1);
                    }
                }
                return this.feedForwardLSTM(input_array);
            case 'recurrent':
                while (this.hidden_cache.length < this.config.time_steps + 1) {
                    this.hidden_cache.push(Array(this.config.num_of_rns).fill(0));
                }

                input_array = input_array.concat(this.hidden_cache[this.config.time_steps]);
                if (this.training) {
                    this.input_value_cache.push(new Matrix(input_array));
                    if (this.input_value_cache.length > this.config.time_steps + 1) {
                        this.input_value_cache.splice(0, 1);
                    }
                }
                break;
            case 'conv':
            case 'maxpool':
                if (this.training) {
                    this.input_value_cache.push(input_array);
                    if (this.input_value_cache.length > 1) {
                        this.input_value_cache.splice(0, 1);
                    }
                }
                return this.feedForwardCNN(input_array);
                break;
            case 'empty':
                if (this.training) {
                    this.input_value_cache.push(input_array);
                    if (this.input_value_cache.length > 1) {
                        this.input_value_cache.splice(0, 1);
                    }
                }
                let output;
                let drop = function(val) {
                    //high order fn that returns a mapping function that can be ovverriden in the .activate function
                    return function(x) {
                        return Math.random() < val ? 0 : x;
                    };
                };
                if (this.config.input_dropout_rate > 0 && this.training) {
                    //if input is set, drop some values before applying the activation fn
                    output = this.activate(input_array, drop(this.config.input_dropout_rate));
                }
                output = this.activate(output || input_array);
                if (this.config.output_dropout_rate > 0 && this.training) {
                    //but if its output, do it after. cause things like sigmoid do 0=>0.5
                    output = this.activate(output, drop(this.config.output_dropout_rate));
                }
                return output;
            case 'dense':
            // dense is default anyway for now
            default:
                //nothing
                break;
        }
        //input array dropout
        if (this.config.input_dropout_rate > 0 && this.training) {
            input_array.forEach((x, i) => {
                if (Math.random() < this.config.input_dropout_rate) {
                    input_array[i] = 0;
                }
            });
        }
        this.input_values = new Matrix(input_array);

        //apply weights to each node in the layer
        let weights = this.weight_array[0][0];
        //if dropout rate was set, the weights need to be adjusted based on the rate.
        if ((this.config.output_dropout_rate > 0 || this.config.input_dropout_rate > 0) && !this.training) {
            weights = this.weight_array[0][0].copy().mult(Math.max(this.config.output_dropout_rate, this.config.input_dropout_rate));
        }
        this.raw_outputs = Matrix.multiply(weights, this.input_values);
        //add the biases
        this.outputs_calcd = this.raw_outputs.copy().add(this.bias_array[0][0]);

        if (this.config.type === 'recurrent' && this.training) {
            this.outputs_calcd_cache.push(this.outputs_calcd);
            if (this.outputs_calcd_cache.length > this.config.time_steps + 1) {
                this.outputs_calcd_cache.splice(0, 1);
            }
        }
        //apply activation function
        this.output_values = this.outputs_calcd.copy().map(activations[this.config.activation_fn]);

        if (this.config.type === 'recurrent' && this.training) {
            this.output_value_cache.push(this.output_values);
            if (this.output_value_cache.length > this.config.time_steps + 1) {
                this.output_value_cache.splice(0, 1);
            }
        }

        //deal with data for rnns
        let final_output = this.output_values.flatten();
        switch (this.config.type) {
            case 'recurrent':
                let rn_offset = 0;
                if (this.config.rn_offset) {
                    rn_offset = this.config.rn_offset;
                }
                this.hidden_cache.push(final_output.slice(rn_offset, this.config.num_of_rns));
                if (this.hidden_cache.length > this.config.time_steps + 1) {
                    this.hidden_cache.splice(0, 1);
                }
                break;
            case 'dense':
            // dense is default anyway for now
            default:
                //nothing
                break;
        }
        if (this.config.output_dropout_rate > 0 && this.training) {
            final_output.forEach((x, i) => {
                if (Math.random() < this.config.output_dropout_rate) {
                    final_output[i] = 0;
                }
            });
        }
        return final_output;
    }
    feedForwardCNN(input_array) {
        //input array dropout
        if (this.config.input_dropout_rate > 0) {
            input_array.forEach(arr => {
                arr.forEach(mat => {
                    mat.map(x => (Math.random() < this.config.input_dopout_rate ? 0 : x));
                });
            });
        }
        let output = [];
        let outputmult = this.config.feature_maps;
        for (let input_index = 0; input_index < input_array.length; input_index++) {
            for (let i = 0; i < outputmult; i++) {
                let output_section = [];
                Array.from(this.config.color_depth).forEach((label, j) => {
                    let input = input_array[input_index][j];

                    if (this.weight_array[i][j].label !== label) {
                        console.error('oh no something wrong with the kernels');
                    }
                    let m;
                    if (this.config.type === 'maxpool') {
                        m = Matrix.convolute(input, this.weight_array[i][j], new SomethingElse('maxpool'));
                    } else {
                        let weights = this.weight_array[i][j];
                        //if dropout rate was set, the weights need to be adjusted during regular use
                        if ((this.config.output_dropout_rate > 0 || this.config.input_dropout_rate > 0) && !this.training) {
                            weights = this.weight_array[i][j].copy().mult(Math.max(this.config.output_dropout_rate, this.config.input_dropout_rate));
                        }
                        m = Matrix.convolute(input, weights);
                    }

                    output_section.push(m);
                });
                let o = output_section.reduce((a, b) => a.add(b));

                if (this.config.type === 'conv') {
                    output.push([o.add(this.bias_array[i][0].values[0][0])]);
                } else {
                    output.push([o]);
                }
            }
        }
        if (this.training) {
            this.output_value_cache.push(output.map(arr => arr.map(mat => mat.copy())));
            if (this.output_value_cache.length > 1) {
                this.output_value_cache.splice(0, 1);
            }
        }
        //dropout layer options
        if (this.config.output_dropout_rate > 0 && this.training) {
            output.forEach(arr => {
                arr.forEach(mat => {
                    mat.map(x => (Math.random() < this.config.output_dropout_rate ? 0 : x));
                });
            });
        }
        if (this.config.flatten_layer) {
            output = output
                .map(mat => {
                    return mat[0].flatten();
                })
                .flat();
            if (this.config.activation_fn !== 'default') {
                output = output.map(activations[this.config.activation_fn]);
            }
        }

        return output;
    }
    feedForwardLSTM(input_array) {
        //combine hidden and input
        if (this.sequence_training) {
            this.config.time_steps = this.config.sequence_size;
        }

        let combined = new Matrix(input_array);
        //combine into forget layer + bias + sigmoid

        let weights = this.weight_array[0];
        //if dropout rate was set, the weights need to be adjusted during regular use
        if ((this.config.output_dropout_rate > 0 || this.config.input_dropout_rate > 0) && !this.training) {
            weights = this.weight_array[0].map(mat => mat.copy().mult(Math.max(this.config.output_dropout_rate, this.config.input_dropout_rate)));
        }

        let forget = Matrix.multiply(weights[0], combined).add(this.bias_array[0][0]);
        if (this.training) {
            this.forget_output_cache.push(forget.copy());
            if (this.forget_output_cache.length > this.config.time_steps + 1) {
                this.forget_output_cache.splice(0, 1);
            }
        }
        forget.map(activations['sigmoid']);

        //combine into input layer x2 multiplied
        let inputS = Matrix.multiply(weights[1], combined).add(this.bias_array[0][1]);
        if (this.training) {
            this.i_output_cache.push(inputS.copy());
            if (this.i_output_cache.length > this.config.time_steps + 1) {
                this.i_output_cache.splice(0, 1);
            }
        }
        inputS.map(activations['sigmoid']);
        let inputT = Matrix.multiply(weights[2], combined).add(this.bias_array[0][2]);
        if (this.training) {
            this.a_output_cache.push(inputT.copy());
            if (this.a_output_cache.length > this.config.time_steps + 1) {
                this.a_output_cache.splice(0, 1);
            }
        }
        inputT.map(activations['tanh']);
        let inputST = inputS.copy().multiply(inputT);

        //combine into output layer
        let o_output = Matrix.multiply(weights[3], combined).add(this.bias_array[0][3]);

        if (this.training) {
            this.outputs_calcd_cache.push(o_output.copy());
            if (this.outputs_calcd_cache.length > this.config.time_steps + 1) {
                this.outputs_calcd_cache.splice(0, 1);
            }
        }
        o_output.map(activations['sigmoid']);

        //step 2 * cell state
        //step 3 + step 5  --> new cellstate
        if (Object.keys(this.cellstate_raw_inputs).length < 1) {
            this.cellstate_raw_inputs = new Matrix(Array(this.config.num_of_rns).fill(0));
        }
        this.cellstate_outputs = this.cellstate_raw_inputs
            .copy()
            .multiply(forget)
            .add(inputST);

        //step 6 tanh's pointwise and * step 4 ---> new hidden + output
        this.output_values = this.cellstate_outputs
            .copy()
            .map(activations['tanh'])
            .multiply(o_output);

        this.hidden_cache.push(this.output_values.flatten());
        if (this.hidden_cache.length > this.config.time_steps + 1) {
            this.hidden_cache.splice(0, 1);
        }
        if (this.training) {
            this.cellstate_output_cache.push(this.cellstate_outputs.copy());
            if (this.cellstate_output_cache.length > this.config.time_steps + 1) {
                this.cellstate_output_cache.splice(0, 1);
            }
        }
        this.cellstate_raw_inputs = this.cellstate_outputs;
        let final_output = this.output_values.flatten();
        if (this.config.output_dropout_rate > 0 && this.training) {
            final_output.forEach((x, i) => {
                if (Math.random() < this.config.output_dropout_rate) {
                    final_output[i] = 0;
                }
            });
        }
        return final_output;
    }

    backPropagate(error_array) {
        //console.log(this.config.type + ' recieved error: ', error_array)
        if (this.config.type !== 'empty') {
            if (this.weight_array[0][0].absmax() > 1000) {
                return new SomethingElse('exploded');
            }
        }

        if (this.config.type === 'recurrent') {
            return this.backPropagateThroughTime(error_array);
        }
        if (this.config.type === 'lstm') {
            return this.backPropagateThroughTimeLSTM(error_array);
        }
        if (/^conv|maxpool$/.test(this.config.type)) {
            return this.backpropagateCNN(error_array);
        }
        if (this.config.type === 'empty') {
            let next_error = [];
            let gradients = this.activate(this.input_value_cache[0], true);
            if (gradients[0][0] instanceof Array) {
                next_error = gradients.map((x, i) => x[0] * error_array[i]);
            } else if (gradients[0][0] instanceof Matrix) {
                next_error = gradients.map((x, i) => {
                    return x[0].mult(error_array[i]);
                });
            } else {
                console.error('something wrong with the empty layer backprop');
            }
            return next_error;
        }
        //difference of the target - output is the main error that needs to be split up
        let errors = new Matrix(error_array);
        //need to get the change over time of the nodes, so get derivative first
        let gradients = this.outputs_calcd.copy();
        gradients.map(d_activations[this.config.activation_fn]); //here
        //multiplied by the error, this gets the errors adjusted for the weight amounts
        gradients.multiply(errors);
        //dont overfit, so we scale down the errors
        gradients.multiply(this.config.learning_rate);
        //if gradients are too big and need to be clipped
        if (this.config.norm_gradient_val && gradients.absmax() > this.config.norm_gradient_val) {
            gradients.norm(-this.config.norm_gradient_val, this.config.norm_gradient_val);
        }

        //since we need to use the weights to calculate the error, we do that first
        //before adjusting the weights
        //by multiplying the errors by weights, we distribute the weights proportionally
        let wT = this.weight_array[0][0].transpose(true);
        //we can now calclulate the next errors proportionally
        let nexterror = Matrix.multiply(wT, errors);
        //now that were done with the weights, we can use them to calculate the delta and add them to the weights
        let weights_deltas = Matrix.multiply(gradients, this.input_values.transpose(true));
        //console.log(weights_deltas)
        this.bias_array[0][0].sub(gradients);
        this.weight_array[0][0].sub(weights_deltas);
        //also weight clipping if set
        if (this.config.norm_weight_val && this.weight_array[0][0].absmax() > this.config.norm_weight_val) {
            console.log('normalizing weights');
            this.weight_array[0][0].norm(-this.config.norm_weight_val, this.config.norm_weight_val);
        }
        //changed to sub cause the error is now flipped to match cross-entropy
        return nexterror.flatten();
    }
    backpropagateCNN(input_errors) {
        //console.log(input_errors, '| error given to: ' + this.config.type);
        let incoming_errors = input_errors;
        let next_error = [];
        //for reshaping and to save space
        let out_w = this.output_value_cache[0][0][0].cols;
        let out_h = this.output_value_cache[0][0][0].rows;

        let in_w = this.input_value_cache[0][0][0].cols;
        let in_h = this.input_value_cache[0][0][0].rows;

        if (this.config.flatten_layer) {
            //this array would be the wrong type, so we should remake it
            incoming_errors = [];
            //reshape the incoming array of numbers into an array of Matricies sized as the output of this layer
            for (let i = 0; i < this.num_of_inputs; i++) {
                let newmat = Matrix.fromArray(input_errors.splice(0, out_w * out_h), out_h, out_w);
                incoming_errors.push(newmat);
            }
            //console.log('error_arrays from last layer', error_arrays)
        }

        if (this.config.type === 'maxpool') {
            //go through all the error matricies and reshape them
            //using the stored indicies in .maxpoolhack, can find the value locations much faster
            incoming_errors.forEach((mat, i) => {
                let output = this.output_value_cache[0][i][0];
                let newmat = new Matrix(in_h, in_w);
                for (let j = 0; j < out_h; j++) {
                    for (let k = 0; k < out_w; k++) {
                        let index = j * out_h + k;
                        newmat.values[output.maxpoolhack[index][0]][output.maxpoolhack[index][1]] = mat.values[j][k];
                    }
                }
                if (this.config.flatten_layer) {
                    //if this was the output layer, it can have an activation fn, so here you can apply the derivative of it
                    newmat.mult(this.input_value_cache[0][i][0].copy().map(d_activations[this.config.activation_fn]));
                }
                next_error.push(newmat);
            });
            //console.log('maxpool sends ', next_error, 'should send out ' + this.num_of_inputs);
            return next_error;
        }

        // inputs convd with the incoming errors from the upper layer
        let gradients = [];
        for (let i = 0; i < this.config.feature_maps; i++) {
            let grad_sum = [];
            let err_sum = [];
            for (let j = 0; j < this.num_of_inputs; j++) {
                let index = i + j * this.config.feature_maps;
                let inp = this.input_value_cache[0][j][0]
                    .copy()
                    .flipX()
                    .flipY();
                let err = incoming_errors[index];
                // if(Math.abs(err.values[0][0])>1000){
                //     console.log(err.values[0][0])
                //     console.log(err)
                // }
                // if(Math.abs(inp.values[0][0])>1000){
                //     console.log(inp.values[0][0])
                //     console.log(inp)
                // }
                let gr = Matrix.convolute(inp, err, 1);
                // if(Math.abs(gr.values[0][0])>1000){
                //     console.log(gr.values[0][0])
                //     console.log(inp,err,'=',gr)
                // }
                err_sum.push(err.copy());
                grad_sum.push(gr);
            }
            grad_sum = grad_sum.reduce((a, b) => a.add(b)).div(this.num_of_inputs);
            err_sum = err_sum.reduce((a, b) => a.add(b)).sum();
            gradients.push(grad_sum);
            //bias is updated by just subbing the sum of all values from the incoming error
            //bias can be updated here to save on loops
            this.bias_array[i][0].sub(err_sum * this.config.learning_rate);
        }
        //console.log(gradients[0].copy())
        for (let i = 0; i < this.num_of_inputs; i++) {
            let back_err = [];
            for (let j = 0; j < this.config.feature_maps; j++) {
                let index = i * this.config.feature_maps + j;
                Array.from(this.config.color_depth).forEach((color, k) => {
                    //not sure if the color channels are being handled properly here
                    let err = incoming_errors[index].copy().pad(this.config.kernel_size - 1, 0);
                    let weight = this.weight_array[j][k].copy();
                    //full convolution between the incoming errors and the kernel flipped
                    back_err.push(Matrix.convolute(err, weight.flipX().flipY()));
                });
            }
            back_err = back_err.reduce((a, b) => a.add(b)).div(this.config.feature_maps);
            next_error.push(back_err);
        }

        gradients.forEach((grad, i) => {
            //gradient clipping
            if (this.config.norm_gradient_val && grad.absmax() > this.config.norm_gradient_val) {
                grad.norm(-this.config.norm_gradient_val, this.config.norm_gradient_val);
            }

            Array.from(this.config.color_depth).forEach((color, k) => {
                this.weight_array[i][k].sub(grad.mult(this.config.learning_rate));
                //weight clipping
                if (this.config.norm_weight_val && this.weight_array[i][k].absmax() > this.config.norm_weight_val) {
                    this.weight_array[i][k].norm(-this.config.norm_weight_val, this.config.norm_weight_val);
                }
            });
        });

        return next_error;
    }
    backPropagateThroughTime(error_array) {
        //first error
        let errors;
        let nexterrors = error_array;
        let wT = this.weight_array[0][0].transpose(true);
        let deltaWTT = [];
        let gradientsTT = [];

        for (let i = this.input_value_cache.length; i > 0; i--) {
            errors = new Matrix(nexterrors);
            let gradients = this.outputs_calcd_cache[i - 1].copy();
            gradients.map(d_activations[this.config.activation_fn]);
            //multiplied by the error, this gets the errors adjusted for the weight amounts
            gradients.multiply(errors);
            //dont overfit, so we scale down the errors
            gradients.multiply(this.config.learning_rate);
            gradientsTT.push(gradients);
            deltaWTT.push(Matrix.multiply(gradients, this.input_value_cache[i - 1].transpose(true)));
            nexterrors = Matrix.multiply(wT, errors)
                .flatten()
                .slice(this.num_of_inputs);
            while (nexterrors.length < this.num_of_outputs) {
                nexterrors = nexterrors.concat([0]);
            }
        }
        //we can now calculate the next errors proportionally

        let deltaG = gradientsTT.reduce((tot, g) => tot.add(g));
        let deltaW = deltaWTT.reduce((tot, w) => tot.add(w));
        if (this.config.norm_gradient_val && deltaW.absmax() > this.config.norm_gradient_val) {
            deltaW.norm(-this.config.norm_gradient_val, this.config.norm_gradient_val);
        }
        this.bias_array[0][0].sub(deltaG);
        this.weight_array[0][0].sub(deltaW);
        if (this.config.norm_weight_val && weight_array[0][0].absmax() > this.config.norm_weight_val) {
            weight_array[0][0].norm(-this.config.norm_weight_val, this.config.norm_weight_val);
        }
        return Matrix.multiply(wT, errors)
            .flatten()
            .slice(0, this.num_of_inputs);
    }

    backPropagateThroughTimeLSTM(error_array) {
        //TODO reduce this whole function with another loop, since im doin the same thing 4 timesin a row mostly
        let n = this.config.time_steps; //n === t1
        let next_error = error_array;
        let output_errors = [];
        let final_tanh = [];
        let final_sigm = [];
        let final_forg = [];
        let final_outp = [];
        let final_tanh_b = [];
        let final_sigm_b = [];
        let final_forg_b = [];
        let final_outp_b = [];
        for (n; n > 0; n--) {
            let errors = new Matrix(this.sequence_training ? error_array[n - 1] : next_error);
            let new_hidden_errors = (this.hidden_error_cache[n + 1] || new Matrix(Array(this.num_of_outputs).fill(0))).copy();
            new_hidden_errors.add(errors);

            let c = new_hidden_errors
                .copy() //this is right apparently
                .multiply(this.outputs_calcd_cache[n].copy().map(activations['sigmoid']))
                .multiply(this.cellstate_output_cache[n].copy().map(d_activations['tanh']))
                .add(
                    (this.cellstate_error_cache[this.config.time_steps] || new Matrix(Array(this.config.num_of_rns).fill(0))).multiply(
                        (this.forget_output_cache[n + 1] || new Matrix(Array(this.config.num_of_rns).fill(0))).map(activations['sigmoid'])
                    )
                );
            this.cellstate_error_cache.push(c.copy());
            if (this.cellstate_error_cache.length > this.config.time_steps + 1) {
                this.cellstate_error_cache.splice(0, 1);
            }

            let error_tanh_i = c
                .copy()
                .multiply(this.i_output_cache[n].copy().map(activations['sigmoid']))
                .multiply(this.a_output_cache[n].copy().map(d_activations['tanh']));
            let error_sigm_i = c
                .copy()
                .multiply(this.a_output_cache[n].copy().map(activations['tanh']))
                .multiply(this.i_output_cache[n].copy().map(d_activations['sigmoid']));
            let error_forget = c
                .copy()
                .multiply(this.cellstate_output_cache[n - 1] || new Matrix(Array(this.num_of_outputs).fill(0)))
                .multiply(this.forget_output_cache[n].copy().map(d_activations['sigmoid']));
            let error_output = new_hidden_errors
                .copy()
                .multiply(this.cellstate_output_cache[n].copy().map(activations['tanh']))
                .multiply(this.outputs_calcd_cache[n].copy().map(d_activations['sigmoid']));

            final_forg_b.push(error_forget);
            final_sigm_b.push(error_sigm_i);
            final_tanh_b.push(error_tanh_i);
            final_outp_b.push(error_output);

            let next_forg = Matrix.multiply(this.weight_array[0][0].transpose(true), error_forget);
            let next_sigm = Matrix.multiply(this.weight_array[0][1].transpose(true), error_sigm_i);
            let next_tanh = Matrix.multiply(this.weight_array[0][2].transpose(true), error_tanh_i);
            let next_outp = Matrix.multiply(this.weight_array[0][3].transpose(true), error_output);

            let input_vals = this.input_value_cache[n].copy().flatten();

            let inputM = new Matrix(input_vals).transpose();

            let delta_forg = Matrix.multiply(error_forget, inputM);
            let delta_sigm = Matrix.multiply(error_sigm_i, inputM);
            let delta_tanh = Matrix.multiply(error_tanh_i, inputM);
            let delta_outp = Matrix.multiply(error_output, inputM);

            final_forg.push(delta_forg);
            final_sigm.push(delta_sigm);
            final_tanh.push(delta_tanh);
            final_outp.push(delta_outp);

            let next_errorM = next_tanh
                .copy()
                .add(next_sigm)
                .add(next_forg)
                .add(next_outp);

            let temp_error = next_errorM.flatten();
            let next_hidden_error = temp_error.splice(this.num_of_inputs + this.config.num_of_rns - this.num_of_outputs, this.num_of_outputs);

            this.hidden_error_cache.push(new Matrix(next_hidden_error));
            if (this.hidden_error_cache.length > this.config.time_steps) {
                this.hidden_error_cache.splice(0, 1);
            }

            if (n !== 1 && !this.sequence_training) {
                next_error = Array(this.num_of_outputs).fill(0);
            }
            if (this.sequence_training) {
                output_errors.push(temp_error);
            } else {
                next_error = temp_error;
            }
        }
        let gradient_sums = [
            final_forg.reduce((tot, x) => tot.add(x)).mult(this.config.learning_rate),
            final_sigm.reduce((tot, x) => tot.add(x)).mult(this.config.learning_rate),
            final_tanh.reduce((tot, x) => tot.add(x)).mult(this.config.learning_rate),
            final_outp.reduce((tot, x) => tot.add(x)).mult(this.config.learning_rate),
        ];
        gradient_sums.forEach(grad => {
            if (this.config.norm_gradient_val && grad.absmax() > this.config.norm_gradient_val) {
                grad.norm(-this.config.norm_gradient_val, this.config.norm_gradient_val);
            }
        });
        for (let i = 0; i < 4; i++) {
            this.weight_array[0][i].sub(gradient_sums[i]);
            if (this.config.norm_weight_val && this.weight_array[0][i].absmax() > this.config.norm_weight_val) {
                this.weight_array[0][i].norm(-this.config.norm_weight_val, this.config.norm_weight_val);
            }
        }

        this.weight_array[0].forEach(W => {});

        this.bias_array[0][0].sub(final_forg_b.reduce((tot, x) => tot.add(x)));
        this.bias_array[0][1].sub(final_sigm_b.reduce((tot, x) => tot.add(x)));
        this.bias_array[0][2].sub(final_tanh_b.reduce((tot, x) => tot.add(x)));
        this.bias_array[0][3].sub(final_outp_b.reduce((tot, x) => tot.add(x)));

        if (this.sequence_training) {
            return output_errors;
        } else {
            return next_error;
        }
    }

    randomize() {
        this.weight_array[0][0].randomize();
        this.bias_array[0][0].randomize();
        return this;
    }

    isSpecial() {
        let c = this.config.type;
        if (c === 'lstm' || c === 'gru' || c === 'conv' || 'maxpool') {
            return this.config.type;
        } else {
            return false;
        }
    }
    copy() {
        let l = new Layer(this.num_of_inputs, this.num_of_outputs);
        l.config = Object.assign({}, this.config);
        l.init();

        l.weight_array = this.weight_array.map(group => {
            return group.map(W => {
                return W.copy();
            });
        });
        l.bias_array = this.bias_array.map(group => {
            return group.map(W => {
                return W.copy();
            });
        });
        return l;
    }
    map(fn) {
        this.weight_array.forEach(group => {
            group.forEach(W => {
                W.map(fn);
            });
        });
    }
    map_biases(fn) {
        this.bias_array.forEach(group => {
            if (group instanceof Array) {
                group.forEach(W => {
                    W.map(fn);
                });
            } else {
                group.map(fn);
            }
        });
    }
    activate(input, useDeriv) {
        //input can be an array of matricies, an array of arrays of matricies
        //array of values, or array of arrays of values
        //input array shouldnt be modified
        let output = [];
        let fn;
        if (useDeriv && typeof useDeriv === 'boolean') {
            fn = d_activations[this.config.activation_fn];
        } else if (useDeriv && typeof useDeriv === 'function') {
            fn = useDeriv;
        } else {
            fn = activations[this.config.activation_fn];
        }
        output = input.map((layer, i) => {
            if (layer instanceof Array) {
                return layer.map((val, j) => {
                    if (val instanceof Matrix) {
                        return val.copy().map(fn);
                    } else {
                        return fn(layer[j]);
                    }
                });
            } else {
                if (layer instanceof Matrix) {
                    return layer.copy().map(fn);
                } else {
                    return fn(layer);
                }
            }
        });
        return output;
    }
    log(){
        console.groupCollapsed( `%c == ${this.config.type} layer ==`.padStart((24 +((this.config.type.length-4)/2)), ' '), 'color:purple')
        console.log('  config: ', this.config)
        this.weight_array.forEach((arr,i)=>{
            console.groupCollapsed(' -- weight ' + i + ' -- ')
            arr.forEach(mat=>{
                console.log(mat);
            })
            console.log(' -- bias '+ i+ ' -- ')
            console.log(this.bias_array[i])
            console.groupEnd()
        })
        console.groupEnd()
    }
}
