const canvas = document.querySelector('canvas'),
      ctx = canvas.getContext('2d'),
      gobang = {
          padding: 20,
          width: 600,
          height: 600,
          span: 40,
          radius: 17
      },
      socket = io('192.168.1.6:3000'),
      //
      sectionHero = document.querySelector('.hero'),
      sectionVillain = document.querySelector('.villain'),
      divPanel = document.querySelector('.panel'),
      hMessage = document.querySelector('.message'),
      btnNewGame = document.querySelector('.new-game');

let game = {
        name: getName(),
        board: init(),
        piece: '',
        isMyTurn: false
    };

//
setup();
canvas.addEventListener('click', play);
btnNewGame.addEventListener('click', ready);


//
socket.on('init-piece', newGame);

socket.on('seat', setPlayer);

socket.on('move', beforePlay);

socket.on('display', afterPlay);

socket.on('victory', victory);

//
function getName() {
    let name = window.prompt(`What is your name?`);
    socket.emit('join', name);

    return name;
}

function newGame(piece) {
    game.piece = piece;
    game.board = init();

    setup();
    
    hMessage.classList.add('hidden');
}

// obly called when a new game by 2 new players (connection)
function setPlayer(playerArray) {
    playerArray.forEach(player => {
        if (player.name === game.name) {
            sectionHero.querySelector('.name').textContent = player.name;
        } else {
            sectionVillain.querySelector('.name').textContent = player.name;
        }
    });
    document.querySelectorAll('.score').forEach(pScore => pScore.textContent = 0);

    divPanel.classList.remove('hidden');
}

function play(e) {
    if (!game.isMyTurn) {
        return;
    }

    let [pieceX, pieceY] = [convertToIndex(e.offsetX - gobang.padding), convertToIndex(e.offsetY - gobang.padding)];
    // whether the spot is available
    console.log(game.board[pieceX][pieceY])
    if (game.board[pieceX][pieceY]) {
        return;
    }
    game.board[pieceX][pieceY] = game.piece;

    // whether win
    let hasWin = checkWin(pieceX, pieceY);

    let action = {
            pieceX,
            pieceY,
            color: game.piece,
            winner: hasWin ? game.name : ''
        };
    
    socket.emit('turn-over', action);
}

function beforePlay(currentPiece) {
    let elem;
    if (currentPiece === game.piece) {
        elem = sectionHero.querySelector('.piece');
        game.isMyTurn = true;
    } else {
        elem = sectionVillain.querySelector('.piece');
    }
    elem.classList.add(currentPiece);
    elem.classList.remove('hidden');
}

function afterPlay(action) {
    let elem;
    if (action.color === game.piece) {
        elem = sectionHero.querySelector('.piece');
        game.isMyTurn = false;
    } else {
        elem = sectionVillain.querySelector('.piece');
    }
    elem.classList.remove(action.color);
    elem.classList.add('hidden');

    drawPiece(action);
    game.board[action.pieceX][action.pieceY] = action.color;
}

function victory(name) {
    let spanWinner = hMessage.querySelector('span:first-child');
    spanWinner.textContent = name;
    hMessage.classList.remove('hidden');

    let pScore;
    if (game.name === name) {
        pScore = sectionHero.querySelector('.score');
    } else {
        pScore = sectionVillain.querySelector('.score');
    }
    pScore.textContent = Number(pScore.textContent) + 1;

    btnNewGame.classList.remove('hidden');
}

function ready() {
    btnNewGame.classList.add('hidden');

    socket.emit('ready');
}

function init() {
    let arr = Array(15);
    for (let i = 0; i < 15; i++) {
        arr[i] = Array(15);
    }
    return arr;
}

function setup() {
    ctx.clearRect(0, 0, 650, 650);

    ctx.fillStyle = 'bisque';
    ctx.fillRect(0, 0, 650, 650);

    const startX = gobang.padding,
          endX = startX + gobang.span * (15 - 1),
          span = gobang.span;
    
    for (let i = startX; i <= endX; i += span) {
        ctx.beginPath();
        ctx.moveTo(startX, i);
        ctx.lineTo(endX, i);
        ctx.moveTo(i, startX);
        ctx.lineTo(i, endX);
        ctx.stroke();
    }

    // draw these black dot
    const dotsIndex = [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]];
    ctx.fillStyle = 'black';
    dotsIndex.forEach(dot => {
        let x = dot[0] * gobang.span + gobang.padding,
            y = dot[1] * gobang.span + gobang.padding;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2, true);
        ctx.fill();
    });
}

function turnOver() {
    game.isMyTurn = false;

}

function drawPiece(action) {
    let x = action.pieceX * gobang.span + gobang.padding,
        y = action.pieceY * gobang.span + gobang.padding;

    ctx.fillStyle = action.color;
    ctx.beginPath();
    ctx.arc(x, y, gobang.radius, 0, Math.PI * 2, true);
    ctx.fill();
}

function convertToIndex(value) {
    return Math.round(value / gobang.span);
}

function checkWin(x, y) {
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            // horizontal
            if (hasFive(i, j, 1, 0) || hasFive(i, j, -1, 0)) {
                return true;
            }
            // vertical
            if (hasFive(i, j, 0, 1) || hasFive(i, j, 0, -1)) {
                return true;
            }
            // diagonal
            if (hasFive(i, j, 1, 1) || hasFive(i, j, 1, -1) || hasFive(i, j, -1, 1) || hasFive(i, j, -1, -1)) {
                return true;
            }
        }
    }
    return false;
}

function hasFive(x, y, xChange, yChange) {
    const piece = game.board[x][y];
    if (piece === undefined) {
        return false;
    }
    let count = 1;

    for (let i = 1; i < 5; i++) {
        let tX = (xChange === 0) ? x : (xChange > 0 ? x + i : x - i),
            tY = (yChange === 0) ? y : (yChange > 0 ? y + i : y - i);
        if (tX < 0 || tY < 0) {
            break;
        } else if (game.board[tX][tY] === piece) {
            count++;
            if (count === 5) {
                // console.log('win')
                return true;
            }
        } else {
            count = 1;
            break;
        }
    }
    return false;
}