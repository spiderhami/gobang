const app = require('express')(),
      http = require('http').createServer(app),
      io = require('socket.io')(http);

//
let game = {
        connection: [],
        turn: '',
        countReady: 0,
        tally: 0
    };

io.on('connection', socket => {
    //
    socket.on('join', addPlayer);

    //
    socket.on('turn-over', nextTurn);

    //
    socket.on('ready', newGame);

    //
    socket.on('disconnect', removePlayer);
})

http.listen({
    host: '192.168.1.6',
    port: '3000'
}, () => console.log('listening on *:3000'));


//
function startGame() {
    io.emit('seat', game.connection);
    setPiece();
}

function setPiece() {
    io.to(game.connection[game.tally % 2].id).emit('init-piece', 'black');
    io.to(game.connection[(game.tally + 1) % 2].id).emit('init-piece', 'white');

    game.turn = 'black';
    io.emit('move', game.turn);
}

function newGame() {
    game.countReady++;
    if (game.countReady === 2) {
        game.tally++;
        setPiece();
        game.countReady = 0;
    }
}

function addPlayer(name) {
    // const socketID = this.id;
    // console.log(this.id);
    let record = {
        id: this.id,
        name
    };
    game.connection.push(record);

    if (game.connection.length === 2) {
        startGame();
    }
}

function removePlayer() {
    game.connection = game.connection.filter(item => item.id !== this.id);

    reset();
}

function reset() {
    game.tally = 0;
    game.countReady = 0;
}

function nextTurn(action) {
    // display action first
    io.emit('display', action);

    // someone wins
    if (action.winner) {
        io.emit('victory', action.winner);
        return;
    }
    //
    swap();
    io.emit('move', game.turn);

}

function swap() {
    if (game.turn === 'black') {
        game.turn = 'white';
    } else {
        game.turn = 'black';
    }
}