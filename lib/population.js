class Population {
    constructor(num) {
        this.popNum = num || 10;
        this.pops = [];
        this.saved = [];
        this.best;
        this.gencount = 0;
        this.onNewGenCallback;
        this.pointaverage = 0;
        this.generator;
        this.update = () => console.log("no update fn");
        this.config = {
            mutRate: 0.1,
            mutAmount: 0.05,
            mutfn: "clone",
        };
    }
    setInitSpecies(fn) {
        this.generator = fn;
    }

    onNewGen(callback) {
        this.onNewGenCallback = callback;
    }

    init() {
        this.best = this.generator();
        for (let i = 0; i < this.popNum; i++) {
            let pop = this.generator();
            pop.init();
            this.pops.push(pop);
        }
    }

    draw() {
        this.pops.forEach(pop => {
            pop.draw();
        });
    }

    setUpdatefn(fn) {
        this.update = fn;
    }

    getBest() {
        return this.saved.reduce((a, b) => {
            if (a.getFitness() === b.getFitness()) {
                if (Math.random() < 0.5) {
                    return a;
                } else {
                    return b;
                }
            }
            if (a.getFitness() > b.getFitness()) {
                return a;
            } else {
                return b;
            }
        });
    }

    newGen() {
        this.pointaverage =
            this.saved.reduce((tot, a) => (tot += a.getFitness()), 0) /
            this.saved.length;
        let winner = this.getBest();

        if (this.best.getFitness() < winner.getFitness()) {
            this.best = winner;
        }
        switch (this.config.mutfn) {
            case "parents":
                this.chooseFittestAndMix();
                break;
            case "clonewithnew":
                this.cloneAndMutateWithNewPops();
                break;
            case "clone":
            default:
                this.cloneAndMutate();
                break;
        }
        this.onNewGenCallback();
        this.gencount++;
    }

    map(fn) {
        this.pops.forEach(x => {
            fn(x);
        });
    }

    cloneAndMutate() {
        this.saved = [];
        for (let i = 0; i < this.popNum - 1; i++) {
            let newdude = this.generator();
            newdude.brain = this.best.brain.copy();
            newdude.init();
            newdude.brain.mutate(this.config.mutRate, this.config.mutAmount);
            this.pops.push(newdude);
        }
        let lastdude = this.generator();
        lastdude.brain = this.best.brain.copy();
        this.best = lastdude;
        lastdude.init();
        this.pops.push(lastdude);
    }

    cloneAndMutateWithNewPops() {
        this.saved = [];
        for (let i = 0; i < this.popNum - 2; i++) {
            let newdude = this.generator();
            newdude.brain = this.best.brain.copy();
            newdude.init();
            newdude.brain.mutate(0.01, 0.5);
            newdude.brain.mutate(0.1, 0.01);
            newdude.brain.mutate(0.5, 0.001);
            newdude.brain.mutate(this.config.mutRate, this.config.mutAmount);

            this.pops.push(newdude);
        }
        let rando = this.generator();
        rando.init();
        this.pops.push(rando);
        let lastdude = this.generator();
        lastdude.brain = this.best.brain.copy();
        this.best = lastdude;
        lastdude.init();
        this.pops.push(lastdude);
    }

    chooseFittestAndMix() {
        let parents = [];
        //console.log('points: ' + this.saveddudes.map(x=>x.getFitness()))
        // console.log('sum: ' + sum)
        for (let i = 0; i < 2; i++) {
            let sum = this.saved.reduce((tot, a) => {
                return (tot += a.getFitness());
            }, 0);
            let chosen = Math.random() * (sum + 1);
            // console.log('chosen: ' + chosen)
            let found = false;
            let parent = this.saved.reduce((tot, a) => {
                if (!found) {
                    tot += a.getFitness();
                    // console.log('wheel at: '+ tot)
                    if (tot > chosen) {
                        found = true;
                        // console.log('winner: ' + a.getFitness())
                        // console.log('best: ' + this.best.getFitness())
                        return a;
                    } else {
                        return tot;
                    }
                } else {
                    //console.log(tot.getFitness())
                    return tot;
                }
            }, 1);
            found = false;
            this.saved.splice(this.saved.indexOf(parent), 1);
            parents.push(parent);
        }
        for (let i = 0; i < this.popNum - 2; i++) {
            //  let a,b = 0;
            // let nums = Array(parents.length).fill( ).map((x,i)=>i);
            // a = nums.splice(Math.floor(Math.random()*nums.length),1)[0];
            //b = nums.splice(Math.floor(Math.random()*nums.length),1)[0];
            let rand = parents[0];
            let rand2 = parents[1];
            let newdude = this.generator();
            newdude.brain = rand.brain.copy();
            newdude.init();
            newdude.brain = newdude.brain.mix(rand2.brain, 2);

            newdude.brain.mutate(this.config.mutRate, this.config.mutAmount);

            this.pops.push(newdude);
        }
        /* let lastdude = this.best.copy()
         this.best = lastdude;
         lastdude.init();
         this.dudes.push(lastdude);*/
        let par1 = this.generator();
        par1.brain = parents[0].brain.copy();
        par1.init();
        this.pops.push(par1);
        let par2 = this.generator();
        par2.brain = parents[1].brain.copy();
        par2.init();
        this.pops.push(par2);
        this.saved = [];
    }
}
