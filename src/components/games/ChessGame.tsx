import { useState, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Difficulty = 'easy' | 'medium' | 'hard';

const pickAIMove = (game: Chess, difficulty: Difficulty): string | null => {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)].san;
  // medium/hard: prefer captures + checks; hard does 1-ply lookahead score
  const pieceVal: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const scored = moves.map(m => {
    let s = 0;
    if (m.captured) s += pieceVal[m.captured] * 10;
    if (m.san.includes('+')) s += 4;
    if (m.promotion) s += 8;
    if (difficulty === 'hard') {
      const g2 = new Chess(game.fen());
      g2.move(m.san);
      const reply = g2.moves({ verbose: true });
      const worst = reply.reduce((acc, r) => r.captured ? Math.max(acc, pieceVal[r.captured]) : acc, 0);
      s -= worst * 8;
    }
    return { san: m.san, s: s + Math.random() };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0].san;
};

export const ChessGame = ({ onWin }: { onWin?: () => void }) => {
  const [game, setGame] = useState(new Chess());
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [status, setStatus] = useState('Your move (White)');

  const refreshStatus = useCallback((g: Chess) => {
    if (g.isCheckmate()) { setStatus(g.turn() === 'w' ? '😞 Checkmate — AI wins' : '🏆 Checkmate — You win!'); if (g.turn() === 'b') onWin?.(); }
    else if (g.isDraw()) setStatus('🤝 Draw');
    else if (g.isCheck()) setStatus('⚠️ Check!');
    else setStatus(g.turn() === 'w' ? 'Your move' : 'AI thinking...');
  }, [onWin]);

  const playAI = useCallback((g: Chess) => {
    setTimeout(() => {
      const san = pickAIMove(g, difficulty);
      if (!san) { refreshStatus(g); return; }
      const g2 = new Chess(g.fen()); g2.move(san);
      setGame(g2); refreshStatus(g2);
    }, 350);
  }, [difficulty, refreshStatus]);

  const onDrop = useCallback(({ sourceSquare, targetSquare }: any) => {
    if (!targetSquare) return false;
    const g2 = new Chess(game.fen());
    try {
      const m = g2.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (!m) return false;
      setGame(g2); refreshStatus(g2);
      if (!g2.isGameOver()) playAI(g2);
      return true;
    } catch { return false; }
  }, [game, playAI, refreshStatus]);

  const reset = () => { const g = new Chess(); setGame(g); setStatus('Your move (White)'); };

  const options = useMemo(() => ({
    position: game.fen(),
    onPieceDrop: onDrop,
    boardOrientation: 'white' as const,
    id: 'biro-chess',
  }), [game, onDrop]);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm font-game">{status}</div>
        <div className="flex gap-1">
          {(['easy','medium','hard'] as Difficulty[]).map(d => (
            <Button key={d} size="sm" variant={difficulty===d?'default':'outline'} onClick={() => setDifficulty(d)} className="capitalize text-xs h-7">{d}</Button>
          ))}
        </div>
      </div>
      <div className="max-w-md mx-auto">
        <Chessboard options={options} />
      </div>
      <div className="flex justify-center gap-2">
        <Button size="sm" variant="outline" onClick={reset}>Reset</Button>
        <Button size="sm" variant="outline" onClick={() => { const g2 = new Chess(game.fen()); g2.undo(); g2.undo(); setGame(g2); refreshStatus(g2); }}>Undo</Button>
      </div>
    </Card>
  );
};
