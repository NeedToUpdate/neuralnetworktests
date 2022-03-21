# Some Neural Network Tests

This is a library that was mostly written for fun, (completely from scratch with 0 copy pasted code (including the matrix library)), as a learning exercise, primarily to learn JavaScript, 
and how Machine Learning works. This library is not optimized at all, but its fairly flexible. But if you're looking for a new ml library for a real project, look elsewhere.

## Installation

All the machine learning code is in nn.js, but that file requires the matrix.js library as well. The other libraries in there are all just extra stuff for the example HTML files in the repo.

```html
    <script src="lib/matrix.js"></script>
    <script src="lib/nn.js"></script>
```

## Basic Usage

```javascript
//initialize a network, with the number of input nodes.
    let brain = new NeuralNetwork(784);
//add a layer, with number of nodes, a config object, and whether or not its the output layer
    brain.addLayer(16, 'dense', {
        activation_fn: 'sigmoid',
        weights_start: 4,
        norm_weight_val: 5
    });
    brain.addLayer(16, 'dense', {
        activation_fn: 'sigmoid'
    });
    brain.addLayer(10, 'dense', {
        activation_fn: 'softmax'
    }, true);
//the nn also has its own config object
    brain.config.loss_fn = 'cross_entropy';
    brain.config.learning_fn = 'SGD';
//this will run all the initialization like calculating the starting weights, nodes, etc.
    brain.init();

//brain.predict() will take the array of values, and give you the output
    let output = brain.predict(Array(784).fill(0));
//brain.train() will take the input and a target, and do the backpropagation, and calculate the loss with brain.calc_loss()
    brain.train(Array(784).fill(0), Array(10).fill(1));
```

## Features

**Available ML Layers:**  
Dense, Reccurent, LSTM, Convolutional, MaxPool
  
**Available Activation Functions:**  
softmax, sigmoid, relu, tanh, linear, lrelu,  crelu, swish  
  
**Available Output Functions:**  
sign, round, push, relu  
  
**Useful NN Config:**  
learning_rate  //can be adjusted at any time with .setLearningRate()
loss_fn  //can be default, mean_square, or cross_entropy  
learning_fn //can be default or SGD  
learning_alpha  
skip_alpha_steps  
weights_start  //default, random, narrow, calculated, specific number 
biases_start   
input_dropout_rate  

**Useful Layer Config:**  
learning_rate  
number_of_rns  
time_steps  //to backpropagate through  
weights_start  //default, random, narrow, calculated, specific number  
input_dropout_rate  
output_dropout_rate  
kernel_size  
step_size  
feature_maps  





## Try it out
The [github pages site](https://needtoupdate.github.io/neuralnetworktests) is working, and links to the other html files in the project, with more detailed instructions on how each example works.
