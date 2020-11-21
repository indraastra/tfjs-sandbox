const TIE = 0;
const P1_WIN = 1;
const P2_WIN = 2;
const POINT_VALUES = [1, 3, 3];

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises.
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));


class ReflexivePlayer {
    constructor(moveFn) {
        this.moveFn = moveFn;
    }

    async getMove() {
        return await this.moveFn();
    };

    async notifyMove(opponentMove) {
        // TODO: Fill this in.
    }
}

class NaivePredictivePlayer {
    constructor() {
        this.opponentHistory = {};
        MOVES.forEach(m1 => {
            this.opponentHistory[m1] = {};
            MOVES.forEach(m2 => {
                this.opponentHistory[m1][m2] = 0;
            });
        });
        this.prevOpponentMove = null;
    }

    predictNextOpponentMove() {
        if (!this.prevOpponentMove) {
            return randomMove();
        }
        // Predict most likely next move.
        const moveCounts = this.opponentHistory[this.prevOpponentMove];
        console.log("Opponent move history for previous move " +
            `${this.prevOpponentMove}:`, moveCounts);
        return _.maxBy(Object.entries(moveCounts), mc => mc[1])[0];
    }

    async getMove() {
        switch (this.predictNextOpponentMove()) {
            case "rock":
                return "paper";
            case "paper":
                return "scissors";
            case "scissors":
                return "rock";
            default:
                return randomMove();
        }
    };

    async notifyMove(opponentMove) {
        // Add tally for move.
        if (this.prevOpponentMove) {
            const m1 = this.prevOpponentMove;
            const m2 = opponentMove;
            this.opponentHistory[m1][m2] += 1;
        }
        this.prevOpponentMove = opponentMove;
    }
}

class Game {
    constructor(gameElId, player1, player2, pointValues = POINT_VALUES) {
        this.gameEl = document.getElementById(gameElId);
        this.player1 = player1;
        this.player2 = player2;
        // Order is TIE, P1_WIN, P2_WIN.
        this.scores = [0, 0, 0];
    }

    compare(move1, move2) {
        move1 = move1.toLowerCase();
        move2 = move2.toLowerCase();

        if (move1 == move2) {
            return TIE;
        }
        if (move1 == "neutral") {
            return P2_WIN;
        }
        if (move2 == "neutral") {
            return P1_WIN;
        }
        switch (move1) {
            case "rock": {
                switch (move2) {
                    case "paper":
                        return P2_WIN;
                    case "scissors":
                        return P1_WIN;
                }
            }
            case "paper": {
                switch (move2) {
                    case "rock":
                        return P1_WIN;
                    case "scissors":
                        return P2_WIN;
                }
            }
            case "scissors": {
                switch (move2) {
                    case "rock":
                        return P2_WIN;
                    case "paper":
                        return P1_WIN;
                }
            }
        }
    }

    async runGame() {
        // Get both players' moves independently.
        return Promise.all([this.player1.getMove(), this.player2.getMove()])
            .then(moves => {
                const move1 = moves[0] || "neutral";
                const move2 = moves[1] || "neutral";
                const result = this.compare(move1, move2);
                this.player1.notifyMove(move2);
                this.player2.notifyMove(move1);
                this.scores[result] += 1;
                return {
                    move1: move1,
                    move2: move2,
                    result: result,
                    points: POINT_VALUES[result]
                };
            });
    }

    getScores() {
        return this.scores;
    }
}