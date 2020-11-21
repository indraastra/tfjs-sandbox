let app;

const LABELS = [
    "😐",
    "🗿",
    "📃",
    "✂️",
];
const MOVES = ["neutral", "rock", "paper", "scissors"];

const randomMove = () => _.sample(MOVES.slice(1, MOVES.length));

function getPlayerModelUrl(inputId) {
    let URL = document.getElementById(inputId).value;
    if (!URL.endsWith("/")) URL += "/";
    return URL;
}

function addPredictionLabels(elementId) {
    const labelContainer = document.getElementById(elementId);
    if (labelContainer.children.length != LABELS.length) {
        for (let i = 0; i < LABELS.length; i++) {
            const bar = document.createElement("div");
            bar.classList.add("bar");

            const value = document.createElement("span");
            value.innerText = LABELS[i];

            bar.appendChild(value);
            labelContainer.appendChild(bar);
        }
    }
    return labelContainer;
}

function addResultToHistory(result, elementId) {
    const historyContainer = document.getElementById(elementId);
    historyContainer.style.display = "flex";
    const record = document.createElement("div");
    record.classList.add("record");
    const header = document.createElement("div");
    header.classList.add("header");
    header.innerText = `${LABELS[MOVES.indexOf(result.move1)]} vs.` +
        `${LABELS[MOVES.indexOf(result.move2)]}`;
    const body = document.createElement("div");
    body.classList.add("body");
    switch (result.result) {
        case 0:
            record.classList.add("tie");
            body.innerText = `+${result.points} to both`;
            break;
        case 1:
            record.classList.add("win");
            body.innerText = `+${result.points} to you`;
            break;
        case 2:
            record.classList.add("loss");
            body.innerText = `+${result.points} to computer`;
            break;
    }
    record.appendChild(header);
    record.appendChild(body);
    if (historyContainer.hasChildNodes()) {
        historyContainer.insertBefore(record, historyContainer.childNodes[0]);
    } else {
        historyContainer.appendChild(record);
    }
}

class App {
    // Initializes all nontrivial resources.
    async init() {
        // Code is slightly modified from the Teachable Machine website's
        // copy/paste-able example.
        // Initialize model and webcam.
        this.model = await this.initModel();
        console.assert(
            this.model.getTotalClasses() == LABELS.length,
            `Unexpected number of classes: ${this.model.getTotalClasses()}`);
        this.webcam = await this.initWebcam()

        // Initialize game and players.
        this.game = this.initGame();

        // Load some HTML elements for convenience.
        this.playerMoveContainer = document.getElementById("player-move-container");
        this.playerLabelContainer = addPredictionLabels("player-label-container");
        this.opponentMoveContainer = document.getElementById("opponent-move-container");
        this.opponentLabelContainer = addPredictionLabels("opponent-label-container");
        this.gameControl = document.getElementById("controls-container");
    }

    // Loads the model and metadata.
    async initModel() {
        const URL = getPlayerModelUrl("tm-model-url");
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        return await tmImage.load(modelURL, metadataURL);
    }

    // Asks permission to use the webcam and sets it up.
    async initWebcam() {
        const flip = true; // whether to flip the webcam
        const webcam = new tmImage.Webcam(200, 200, flip); // width, height, flip
        await webcam.setup(); // request access to the webcam
        await webcam.play();
        return webcam;
        // TODO: What if permission isn't granted?
    }

    // Initializes game with two players: human and bot.
    initGame() {
        const gameContainer = document.getElementById("game");
        gameContainer.style.display = "flex";

        const p1 = new ReflexivePlayer(async () => {
            let predictions = await this.model.predict(this.webcam.canvas);
            predictions.forEach((p, idx) => p.idx = idx);
            predictions = _.sortBy(predictions, ['probability']);
            return MOVES[_.last(predictions).idx];
        });
        // TODO: Make less naive AI player - train a model using previous user inputs.
        //const p2 = new ReflexivePlayer(randomMove);
        const p2 = new NaivePredictivePlayer();
        return new Game("game", p1, p2);
    }

    async play() {
        console.log("Starting new game!");
        this.playerMoveContainer.innerText = "";
        this.playerMoveContainer.appendChild(this.webcam.canvas);
        this.opponentMoveContainer.innerText = "⌛";

        this.stopped = false;
        this.requestId = window.requestAnimationFrame(() => this.loop());
        // Start and update countdown timer.
        var countdownSeconds = 3;
        this.gameControl.innerText = countdownSeconds;
        var intervalId = setInterval(() => {
            if (countdownSeconds > 0) {
                countdownSeconds -= 1;
                this.gameControl.innerText = countdownSeconds;
            }
            if (countdownSeconds > 0) return;
            clearInterval(intervalId);
            this.game.runGame(0).then((result) => this.updateWithResult(result));
        }, 1000);
    }

    async loop() {
        if (this.stopped) return;
        this.webcam.update();
        await this.updatePlayerPredictions();
        this.requestId = window.requestAnimationFrame(() => this.loop());
    }

    async stop() {
        window.cancelAnimationFrame(this.requestId)
        this.stopped = true;
        await this.webcam.stop();
    }

    async updateWithResult(result) {
        console.log("Game result:", result);
        // Don't stop webcam, just the loop.
        window.cancelAnimationFrame(this.requestId)
        this.stopped = true;
        this.gameControl.innerText = "▶";

        // Update opponent move and labels.
        const opponentMove = MOVES.indexOf(result.move2);
        this.opponentMoveContainer.innerText = LABELS[opponentMove];
        for (let i = 0; i < LABELS.length; i++) {
            if (i == opponentMove) {
                this.opponentLabelContainer.children[i].style.width = "100%";
            } else {
                this.opponentLabelContainer.children[i].style.width = "0%";
            }
        }

        // Update player scores.
        const [
            ties,
            p1_wins,
            p2_wins
        ] = this.game.getScores();
        document.getElementById("player-score").innerText = ties + p1_wins * 3;
        document.getElementById("opponent-score").innerText = ties + p2_wins * 3;

        // Add to history.
        addResultToHistory(result, "history");
    }

    async updatePlayerPredictions() {
        const container = document.getElementById("player-label-container");
        const predictions = await this.model.predict(this.webcam.canvas);
        for (let i = 0; i < LABELS.length; i++) {
            const confidence = (100 * predictions[i].probability).toFixed(1);
            const classPrediction = `${LABELS[i]} | ${confidence}%`;
            container.children[i].firstElementChild.innerHTML = classPrediction;
            container.children[i].style.width = `${Math.ceil(confidence)}%`;
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    app = new App();
});