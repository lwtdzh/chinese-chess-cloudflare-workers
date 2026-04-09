function isValidMove(board, from, to, myColor) {
    const piece = board[from.row][from.col];
    if (!piece || piece.color !== myColor) return false;
    
    const target = board[to.row][to.col];
    if (target && target.color === myColor) return false;
    
    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    
    switch (piece.type) {
        case 'GENERAL':
            if (to.col < 3 || to.col > 5) return false;
            if (myColor === 'RED' && to.row < 7) return false;
            if (myColor === 'BLACK' && to.row > 2) return false;
            return absRowDiff + absColDiff === 1;
        case 'ADVISOR':
            if (to.col < 3 || to.col > 5) return false;
            if (myColor === 'RED' && to.row < 7) return false;
            if (myColor === 'BLACK' && to.row > 2) return false;
            return absRowDiff === 1 && absColDiff === 1;
        case 'ELEPHANT':
            if (absRowDiff !== 2 || absColDiff !== 2) return false;
            if (myColor === 'RED' && to.row < 5) return false;
            if (myColor === 'BLACK' && to.row > 4) return false;
            const eyeRow = from.row + rowDiff / 2;
            const eyeCol = from.col + colDiff / 2;
            return !board[eyeRow][eyeCol];
        case 'HORSE':
            if (!((absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2))) return false;
            const legRow = absRowDiff === 2 ? from.row + rowDiff / 2 : from.row;
            const legCol = absRowDiff === 2 ? from.col : from.col + colDiff / 2;
            return !board[legRow][legCol];
        case 'CHARIOT':
            if (from.row !== to.row && from.col !== to.col) return false;
            return countPiecesBetween(board, from, to) === 0;
        case 'CANNON':
            if (from.row !== to.row && from.col !== to.col) return false;
            const pieces = countPiecesBetween(board, from, to);
            return target ? pieces === 1 : pieces === 0;
        case 'SOLDIER':
            if (myColor === 'RED') {
                if (from.row > 4) return rowDiff === -1 && colDiff === 0;
                return (rowDiff === -1 && colDiff === 0) || (rowDiff === 0 && absColDiff === 1);
            } else {
                if (from.row < 5) return rowDiff === 1 && colDiff === 0;
                return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && absColDiff === 1);
            }
        default:
            return false;
    }
}

// 检查走法后是否会导致自己被将军（将军应将检查）
function wouldBeInCheck(board, from, to, myColor) {
    // 创建临时棋盘
    const tempBoard = board.map(row => [...row]);
    tempBoard[to.row][to.col] = tempBoard[from.row][from.col];
    tempBoard[from.row][from.col] = null;
    
    return isInCheck(tempBoard, myColor);
}

// 检查指定颜色是否被将军
function isInCheck(board, color) {
    // 找到己方将/帅位置
    let kingPos = null;
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const p = board[r][c];
            if (p && p.type === 'GENERAL' && p.color === color) {
                kingPos = { row: r, col: c };
                break;
            }
        }
        if (kingPos) break;
    }
    if (!kingPos) return false;
    
    // 检查将帅对面
    if (isFlyingGeneral(board, kingPos, color)) return true;
    
    // 检查对方所有棋子是否能攻击到将/帅
    const opponentColor = color === 'RED' ? 'BLACK' : 'RED';
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (piece && piece.color === opponentColor) {
                if (canAttack(board, { row: r, col: c }, kingPos, piece)) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 检查将帅对面
function isFlyingGeneral(board, kingPos, color) {
    const opponentColor = color === 'RED' ? 'BLACK' : 'RED';
    let opponentKingPos = null;
    
    for (let r = 0; r < 10; r++) {
        const p = board[r][kingPos.col];
        if (p && p.type === 'GENERAL' && p.color === opponentColor) {
            opponentKingPos = { row: r, col: kingPos.col };
            break;
        }
    }
    if (!opponentKingPos) return false;
    
    // 检查中间是否有棋子
    const minRow = Math.min(kingPos.row, opponentKingPos.row);
    const maxRow = Math.max(kingPos.row, opponentKingPos.row);
    for (let r = minRow + 1; r < maxRow; r++) {
        if (board[r][kingPos.col]) return false;
    }
    return true;
}

// 检查棋子是否能攻击到目标位置
function canAttack(board, from, to, attacker) {
    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    
    switch (attacker.type) {
        case 'GENERAL':
            return to.col >= 3 && to.col <= 5 && 
                   ((attacker.color === 'RED' && to.row >= 7) || (attacker.color === 'BLACK' && to.row <= 2)) &&
                   absRowDiff + absColDiff === 1;
        case 'ADVISOR':
            return to.col >= 3 && to.col <= 5 &&
                   ((attacker.color === 'RED' && to.row >= 7) || (attacker.color === 'BLACK' && to.row <= 2)) &&
                   absRowDiff === 1 && absColDiff === 1;
        case 'ELEPHANT':
            if (absRowDiff !== 2 || absColDiff !== 2) return false;
            if (attacker.color === 'RED' && to.row < 5) return false;
            if (attacker.color === 'BLACK' && to.row > 4) return false;
            const eyeRow = from.row + rowDiff / 2;
            const eyeCol = from.col + colDiff / 2;
            return !board[eyeRow][eyeCol];
        case 'HORSE':
            if (!((absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2))) return false;
            const legRow = absRowDiff === 2 ? from.row + rowDiff / 2 : from.row;
            const legCol = absRowDiff === 2 ? from.col : from.col + colDiff / 2;
            return !board[legRow][legCol];
        case 'CHARIOT':
            if (from.row !== to.row && from.col !== to.col) return false;
            return countPiecesBetween(board, from, to) === 0;
        case 'CANNON':
            if (from.row !== to.row && from.col !== to.col) return false;
            return countPiecesBetween(board, from, to) === 1;
        case 'SOLDIER':
            if (attacker.color === 'RED') {
                if (from.row > 4) return rowDiff === -1 && colDiff === 0;
                return (rowDiff === -1 && colDiff === 0) || (rowDiff === 0 && absColDiff === 1);
            } else {
                if (from.row < 5) return rowDiff === 1 && colDiff === 0;
                return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && absColDiff === 1);
            }
        default:
            return false;
    }
}

function countPiecesBetween(board, from, to) {
    let count = 0;
    if (from.row === to.row) {
        const minCol = Math.min(from.col, to.col);
        const maxCol = Math.max(from.col, to.col);
        for (let c = minCol + 1; c < maxCol; c++) {
            if (board[from.row][c]) count++;
        }
    } else {
        const minRow = Math.min(from.row, to.row);
        const maxRow = Math.max(from.row, to.row);
        for (let r = minRow + 1; r < maxRow; r++) {
            if (board[r][from.col]) count++;
        }
    }
    return count;
}

function getValidMoves(board, row, col, myColor) {
    const moves = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            if (isValidMove(board, {row, col}, {row: r, col: c}, myColor)) {
                // 添加将军应将检查：过滤掉会导致自己被将军的走法
                if (!wouldBeInCheck(board, {row, col}, {row: r, col: c}, myColor)) {
                    moves.push({row: r, col: c});
                }
            }
        }
    }
    return moves;
}