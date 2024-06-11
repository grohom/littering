const parkHeight = 500;
const graphHeight = 100;
const border = 20;
const numAgents = 200;
const maxSpeed = 3;
const borderAcc = 2;
const deltaAcc = 0.5;
const fovRadius = 20;
const garbageDisappearProb = 0.02;
const initialLitteringProb = 0.05;
const memory = 0.002;

const parkWidth = parkHeight*2;
const canvasHeight = parkHeight + graphHeight + 5;
const graphLength = parkWidth;
const fovDiameter = fovRadius*2;

const agents = [];
const comfortGraph = [];
const yourProbGraph = [];
const othersProbGraph = [];
let garbage = [];
let yourConfort = 1;

let you;
let otherAgents;
let yourSlider;
let othersSlider;
let simCanvas;
let graphCanvas;
let agentColor;
let agentSemiColor;
let grassColor;
let angryColor;
let angrySemiColor;
let garbageColor;
let graphColor;

function setup() {
    simCanvas = createCanvas(parkWidth, canvasHeight);

    grassColor = color(0, 128, 0);
    agentColor = color(255, 165, 0);
    angryColor = color(255, 0, 0);
    garbageColor = color(0, 0, 0);
    graphColor = color(32, 40, 32);

    agentSemiColor = color(red(agentColor), green(agentColor), blue(agentColor));
    angrySemiColor = color(red(angryColor), green(angryColor), blue(angryColor));
    agentSemiColor.setAlpha(64);
    angrySemiColor.setAlpha(64);

    yourSlider = select('#your-slider');
    othersSlider = select('#others-slider');

    for (let i = 0; i < numAgents; i++) {
        agents.push(new Agent(i));
    }
    you = agents[0];
    otherAgents = agents.filter(agent => agent !== you);

    yourSlider.input(() => {
        you.litteringProb = parseFloat(yourSlider.value());
    });
    yourSlider.value(initialLitteringProb);

    othersSlider.input(() => {
        let p = parseFloat(othersSlider.value());
        otherAgents.forEach(agent => agent.litteringProb = p);
    });
    othersSlider.value(initialLitteringProb);

    graphCanvas = createGraphics(parkWidth, graphHeight);
    noStroke();
}

function draw() {
    agents.forEach(agent => agent.update());
    garbage = garbage.filter(g => random(1) > garbageDisappearProb);
    updateHistory();
    computeGraphImage();

    fill(grassColor);
    rect(0, 0, parkWidth, parkHeight);
    erase();
    rect(0, parkHeight, parkWidth, 5);
    noErase();

    agents.forEach(agent => agent.display());
    fill(garbageColor);
    garbage.forEach(g => rect(g.x, g.y, 3, 3));

    push();
    translate(0, parkHeight+5);
    fill(graphColor);
    rect(0, 0, graphLength, graphHeight);
    image(graphCanvas, graphLength - comfortGraph.length, 0);
    let y = map(yourConfort, 0, 1, graphCanvas.height-1, 1);
    fill(you.happy ? agentColor : angryColor);
    ellipse(graphLength-2, y, 4, 4)
    pop();
}

function updateHistory() {
    yourConfort += memory*(you.happy - yourConfort);

    comfortGraph.push(yourConfort);
    if (comfortGraph.length > graphLength) {
        comfortGraph.shift(); // Remove the oldest element
    }

    yourProbGraph.push(parseFloat(yourSlider.value()));
    if (yourProbGraph.length > graphLength) {
        yourProbGraph.shift(); // Remove the oldest element
    }

    othersProbGraph.push(parseFloat(othersSlider.value()));
    if (othersProbGraph.length > graphLength) {
        othersProbGraph.shift(); // Remove the oldest element
    }
}

function computeGraphImage() {
    graphCanvas.background(graphColor);
    graphCanvas.noFill();

    graphCanvas.stroke(0, 128, 255);
    graphCanvas.beginShape();
    yourProbGraph.forEach((value, i) => {
        let x = map(i, 0, graphLength, 0, graphCanvas.width);
        let y = map(value, 0, 0.2, graphCanvas.height-1, 1);
        graphCanvas.vertex(x, y);
    });
    graphCanvas.endShape();

    graphCanvas.stroke(0, 200, 80);
    graphCanvas.beginShape();
    othersProbGraph.forEach((value, i) => {
        let x = map(i, 0, graphLength, 0, graphCanvas.width);
        let y = map(value, 0, 0.2, graphCanvas.height-1, 1);
        graphCanvas.vertex(x, y);
    });
    graphCanvas.endShape();

    graphCanvas.stroke(agentColor);
    graphCanvas.beginShape();
    comfortGraph.forEach((value, i) => {
        let x = map(i, 0, graphLength, 0, graphCanvas.width);
        let y = map(value, 0, 1, graphCanvas.height-1, 1);
        graphCanvas.vertex(x, y);
    });
    graphCanvas.endShape();
}

class Agent {
    constructor(id) {
        this.pos = createVector(random(parkWidth), random(parkHeight));
        this.vel = p5.Vector.random2D().mult(random(maxSpeed));
        this.acc = p5.Vector.random2D().mult(deltaAcc);
        this.litteringProb = initialLitteringProb;
        this.happy = true;
    }

    update() {
        let oldVel = this.vel;
        this.acc.add(p5.Vector.random2D().mult(deltaAcc));
        // if (this.pos.x > parkWidth - border) this.acc.x -= borderAcc;
        // else if (this.pos.x < border) this.acc.x += borderAcc;
        // if (this.pos.y > parkHeight - border) this.acc.y -= borderAcc;
        // else if (this.pos.y < border) this.acc.y += borderAcc;
        this.vel.add(this.acc).setMag(maxSpeed);
        this.pos.add(this.vel);
        if (this.pos.x > parkWidth) this.pos.x -= parkWidth;
        else if (this.pos.x < 0) this.pos.x += parkWidth;
        if (this.pos.y > parkHeight) this.pos.y -= parkHeight;
        else if (this.pos.y < 0) this.pos.y += parkHeight;
        this.acc.set(this.vel - oldVel);

        this.happy = this.isHappy();

        if (!this.isSeenByOtherAgents() && random(1) < this.litteringProb) {
            let velocity = this.vel.copy();
            velocity.setMag(fovRadius+2);
            garbage.push(p5.Vector.sub(this.pos, velocity));
        }
    }

    isSeenByOtherAgents() {
        for (let other of agents) {
            if (other !== this && dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y) <= fovRadius) {
                return true;
            }
        }
        return false;
    }

    isHappy() {
        return garbage.every(g => this.pos.dist(g) > fovRadius);
    }

    display() {
        if (this === you) {
            if (you.happy) {
                fill(agentSemiColor);
                ellipse(you.pos.x, you.pos.y, fovDiameter, fovDiameter);
                fill(agentColor);
                ellipse(this.pos.x, this.pos.y, 4, 4);
            } else {
                fill(angrySemiColor);
                ellipse(you.pos.x, you.pos.y, fovDiameter, fovDiameter);
                fill(angryColor);
                ellipse(this.pos.x, this.pos.y, 4, 4);
            }
        }
        else {
            fill(agentColor);
            ellipse(this.pos.x, this.pos.y, 4, 4);
        }
    }
}
