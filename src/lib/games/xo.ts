export type XoState = { board: (string | null)[]; players: [string, string] };

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function newXo(first: string, second: string): XoState {
  return { board: Array(9).fill(null), players: [first, second] };
}

export function xoWinner(board: (string | null)[]): { who: string; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { who: board[a]!, line };
  }
  return null;
}

export function xoFull(board: (string | null)[]) {
  return board.every(Boolean);
}
