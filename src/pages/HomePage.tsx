import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import { useGameStore } from '@/hooks/useGameStore';
import { Player, BOARD_SIZE } from '@/lib/hex-logic';
import { Hexagon } from '@/components/Hexagon';
import { Button } from '@/components/ui/button';
import { GameModeSelector } from '@/components/GameModeSelector';
import { ShareLink } from '@/components/ShareLink';
import { cn } from '@/lib/utils';
import { getOrCreateLocalPlayerId } from '@/lib/playerIdentity';
import { useShallow } from 'zustand/react/shallow';
import { SettingsModal } from '@/components/SettingsModal';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoreVertical } from 'lucide-react';
import { isToday, format } from 'date-fns';

declare global {
  interface Window {
    dumpHexGameState?: () => Promise<string>;
  }
}

const GameStatus = () => {
  const gameState = useGameStore((s) => s.gameState);
  const gameMode = useGameStore((s) => s.gameMode);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const winner = useGameStore((s) => s.winner);
  const playerColor = useGameStore((s) => s.playerColor);
  const isYourTurn = useGameStore((s) => s.isYourTurn);
  const opponentJoined = useGameStore((s) => s.opponentJoined);

  const playerText = currentPlayer === Player.BLUE ? 'Blue' : 'Orange';
  const playerColorClass =
    currentPlayer === Player.BLUE ? 'text-player-blue' : 'text-player-red';
  const winnerText = winner === Player.BLUE ? 'Blue' : 'Orange';
  const winnerColorClass =
    winner === Player.BLUE ? 'text-player-blue' : 'text-player-red';

  const yourColorText = playerColor === Player.BLUE ? 'Blue' : 'Orange';
  const yourColorClass = playerColor === Player.BLUE ? 'text-player-blue' : 'text-player-red';

  if (gameMode === 'online' && gameState === 'playing') {
    return null;
  }

  // When waiting for online opponent, we don't show the inline status text anymore
  // because we show a modal instead.
  if (gameMode === 'online' && gameState === 'waiting') {
    return null;
  }

  return (
    <div className="h-16 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {gameState === 'waiting' ? (
          <motion.h2
            key="waiting"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="text-2xl md:text-3xl font-semibold"
          >
            Waiting for opponent...
          </motion.h2>
        ) : gameState === 'playing' ? (
          <motion.h2
            key="playing"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="text-2xl md:text-3xl font-semibold"
          >
            <span className={cn(playerColorClass, 'font-bold')}>{playerText}'s</span> turn
          </motion.h2>
        ) : (
          <motion.h2
            key="won"
            initial={{ y: -20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.8 }}
            className="text-4xl md:text-5xl font-bold"
          >
            <span className={winnerColorClass}>{winnerText}</span> Wins!
          </motion.h2>
        )}
      </AnimatePresence>
    </div>
  );
};

const GameBoard = () => {
  const { board, currentPlayer, gameState, winningPath, makeMove } = useGameStore(
    useShallow((s) => ({
      board: s.board,
      currentPlayer: s.currentPlayer,
      gameState: s.gameState,
      winningPath: s.winningPath,
      makeMove: s.makeMove,
    }))
  );

  const gameMode = useGameStore((s) => s.gameMode);
  const playerColor = useGameStore((s) => s.playerColor);
  const { boardSize, showCoordinates } = useSettingsStore();

  const hoverPlayer = gameMode === 'online' && playerColor ? playerColor : currentPlayer;

  const winningPathSet = new Set(
    winningPath.map((p) => `${p.row},${p.col}`)
  );

  // Use a constant internal hexSize to preserve stroke width and font size proportions from the old "middle" size.
  // The actual screen size is controlled by the CSS width of the container.
  const hexSize = 36;
  const scale = hexSize / 50; // Hexagon component is 100x86.6
  const scaledHexWidth = 100 * scale;
  const scaledHexHeight = 86.6 * scale;

  // Calculate the precise bounding box for the rhombus layout
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      // Correct geometric positioning for a non-overlapping rhombus grid
      const x = (c - r) * (scaledHexWidth * 0.75);
      const y = (c + r) * (scaledHexHeight * 0.5);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  const boardContentWidth = maxX - minX + scaledHexWidth;
  const boardContentHeight = maxY - minY + scaledHexHeight;
  const padding = 20 + (showCoordinates ? hexSize * 1.2 : 0); // Padding for shadow and hover effects + coords
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxWidth = boardContentWidth + padding * 2;
  const viewBoxHeight = boardContentHeight + padding * 2;

  return (
    <div className={cn(
      "relative mx-auto flex justify-center transition-all duration-300 w-full",
      boardSize === 'small' ? "w-[min(30vw,45vh)] min-w-[280px] max-w-[600px]" :
        boardSize === 'medium' ? "w-[min(75vw,65vh)] min-w-[320px] max-w-[1000px]" :
          "w-[min(90vw,95vh)] min-w-[340px] max-w-[1400px]"
    )}>
      <svg
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full drop-shadow-lg"
      >
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.2" />
          </filter>
        </defs>
        <g filter="url(#shadow)">
          {board.map((row, r) =>
            row.map((player, c) => {
              // Correct geometric positioning for a non-overlapping rhombus grid
              const x = (c - r) * (scaledHexWidth * 0.75);
              const y = (c + r) * (scaledHexHeight * 0.5);
              return (
                <g key={`${r}-${c}`} transform={`translate(${x}, ${y}) scale(${scale})`}>
                  <Hexagon
                    row={r}
                    col={c}
                    player={player}
                    currentPlayer={currentPlayer}
                    hoverPlayer={hoverPlayer}
                    isWinning={winningPathSet.has(`${r},${c}`)}
                    isGameOver={gameState === 'won'}
                    onClick={makeMove}
                  />
                </g>
              );
            })
          )}
          {showCoordinates && (
            <g className="fill-gray-500 dark:fill-gray-400 font-bold pointer-events-none select-none" style={{ fontSize: `${hexSize * 0.9}px` }}>
              {/* Numbers 1-11 along the top-left edge (c=0) */}
              {Array.from({ length: BOARD_SIZE }).map((_, r) => {
                const x = (0 - r) * (scaledHexWidth * 0.75);
                const y = (0 + r) * (scaledHexHeight * 0.5);
                return (
                  <text key={`num-tl-${r}`} x={x - scaledHexWidth * 0.35} y={y - scaledHexHeight * 0.15} textAnchor="end" dominantBaseline="ideographic">
                    {r + 1}
                  </text>
                );
              })}
              {/* Letters A-K along the bottom-left edge (r=BOARD_SIZE-1) */}
              {Array.from({ length: BOARD_SIZE }).map((_, c) => {
                const r = BOARD_SIZE - 1;
                const x = (c - r) * (scaledHexWidth * 0.75);
                const y = (c + r) * (scaledHexHeight * 0.5);
                return (
                  <text key={`letter-bl-${c}`} x={x - scaledHexWidth * 0.35} y={y + scaledHexHeight * 1.15} textAnchor="end" dominantBaseline="middle">
                    {String.fromCharCode(65 + c)}
                  </text>
                );
              })}
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

export function HomePage() {
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shouldWiggle, setShouldWiggle] = useState(false);
  const [wiggleDuration, setWiggleDuration] = useState(0.4);
  const hasJoinedRef = useRef(false);
  const gameState = useGameStore((s) => s.gameState);
  const gameMode = useGameStore((s) => s.gameMode);
  const winner = useGameStore((s) => s.winner);
  const gameId = useGameStore((s) => s.gameId);
  const shareLink = useGameStore((s) => s.shareLink);
  const isYourTurn = useGameStore((s) => s.isYourTurn);
  const opponentJoined = useGameStore((s) => s.opponentJoined);
  const lastMoveAt = useGameStore((s) => s.lastMoveAt);
  const createdAt = useGameStore((s) => s.createdAt);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const playerColor = useGameStore((s) => s.playerColor);
  const board = useGameStore((s) => s.board);

  const setLocalMode = useGameStore((s) => s.setLocalMode);
  const createOnlineGame = useGameStore((s) => s.createOnlineGame);
  const joinOnlineGame = useGameStore((s) => s.joinOnlineGame);
  const loadOnlineGame = useGameStore((s) => s.loadOnlineGame);
  const disconnectWebSocket = useGameStore((s) => s.disconnectWebSocket);
  const resetGame = useGameStore((s) => s.resetGame);

  // Handle URL parameter for joining games
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlGameId = params.get('game');

    if (urlGameId && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      const localPlayerId = getOrCreateLocalPlayerId();

      // First try loading as the same local player, then fallback to joining.
      loadOnlineGame(urlGameId, localPlayerId).catch((loadErr) => {
        const message = loadErr instanceof Error ? loadErr.message : '';
        if (!message.toLowerCase().includes('not a player')) {
          console.error('Failed to load game:', loadErr);
          hasJoinedRef.current = false;
          return;
        }

        joinOnlineGame(urlGameId).catch((joinErr) => {
          console.error('Failed to join game:', joinErr);
          const joinMessage =
            joinErr instanceof Error ? joinErr.message.toLowerCase() : '';
          if (joinMessage.includes('already has 2 players')) {
            alert('This game already has two players and is currently in progress.');
          } else if (joinMessage.includes('game not found')) {
            alert('This game link is invalid or the game no longer exists.');
          } else {
            alert('Failed to join game. The game may be full or not exist.');
          }
          hasJoinedRef.current = false;
        });
      });
    }
  }, [joinOnlineGame, loadOnlineGame]);

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => disconnectWebSocket();
  }, [disconnectWebSocket]);

  // Confetti on win
  useEffect(() => {
    if (gameState === 'won') {
      const colors =
        winner === Player.BLUE
          ? ['#3B82F6', '#60A5FA']
          : ['#F97316', '#FB923C'];
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: colors,
      });
    }
  }, [gameState, winner]);

  const handleNewGame = () => {
    setShowModeSelector(true);
  };

  const handleLocalGame = () => {
    setLocalMode();
    // Clear URL param if present
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleCreateOnline = async () => {
    try {
      const { gameId, shareLink } = await createOnlineGame();
      // Update URL with game ID
      window.history.replaceState({}, '', `?game=${gameId}`);
    } catch (err) {
      console.error('Failed to create game:', err);
      alert('Failed to create online game. Please try again.');
    }
  };

  const handleJoinOnline = async (gameId: string) => {
    try {
      await joinOnlineGame(gameId);
      // Update URL with game ID
      window.history.replaceState({}, '', `?game=${gameId}`);
    } catch (err) {
      console.error('Failed to join game:', err);
      alert('Failed to join game. The game may be full or not exist.');
    }
  };

  const handleDumpGameState = async () => {
    const state = useGameStore.getState();
    const debugPayload = {
      gameMode: state.gameMode,
      gameState: state.gameState,
      board: state.board,
      currentPlayer: state.currentPlayer,
      winner: state.winner,
      winningPath: state.winningPath,
      gameId: state.gameId,
      playerId: state.playerId,
      playerColor: state.playerColor,
      isYourTurn: state.isYourTurn,
      opponentJoined: state.opponentJoined,
      shareLink: state.shareLink,
    };
    const formatted = JSON.stringify(debugPayload, null, 2);
    console.group('Hex Debug State');
    console.log(formatted);
    console.groupEnd();
    let note = 'State logged to console.';
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(formatted);
        note = 'State copied to clipboard and logged to console.';
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      note = 'Clipboard write failed; state logged to console.';
    }
    console.info(note);
    return formatted;
  };

  useEffect(() => {
    window.dumpHexGameState = handleDumpGameState;
    return () => {
      delete window.dumpHexGameState;
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'playing' || !isYourTurn) {
      setShouldWiggle(false);
      setWiggleDuration(0.4);
      return;
    }

    let currentDuration = 0.4;

    // We update state without triggering re-render cascades
    const triggerWiggle = () => {
      setWiggleDuration(currentDuration);
      setShouldWiggle(true);
      // Reset after animation (using currentDuration)
      setTimeout(() => setShouldWiggle(false), currentDuration * 1000 + 100);
      // Increase subsequent duration by 10%
      currentDuration *= 1.1;
    };

    let wigglingInterval: NodeJS.Timeout;

    // Wait 15 seconds for the first wiggle
    const initialDelay = setTimeout(() => {
      triggerWiggle();

      // Then wiggle every 10 seconds
      wigglingInterval = setInterval(() => {
        triggerWiggle();
      }, 10000);
    }, 10000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(wigglingInterval);
      setShouldWiggle(false);
    };
  }, [isYourTurn, gameState]);

  // Use `my-auto` on the inner content (instead of `justify-center` on main) 
  // to avoid clipping the top of the grid when it reaches very large sizes on smaller viewports.
  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[1600px] my-auto mx-auto flex flex-col items-center space-y-6 md:space-y-8">
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight">
            HexaPath
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {gameMode === 'online' && playerColor ? (
              <>
                Connect the{' '}
                <span
                  className={
                    playerColor === Player.BLUE
                      ? 'text-player-blue font-bold'
                      : 'text-player-red font-bold'
                  }
                >
                  {playerColor === Player.BLUE ? 'blue' : 'orange'}
                </span>{' '}
                sides to win!
              </>
            ) : (
              'Connect your sides to win!'
            )}
          </p>
        </motion.header>

        <GameStatus />
        <GameBoard />

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', delay: 0.2 }}
          className="w-full flex justify-center"
        >
          {gameMode === 'online' && gameId ? (
            <div className={cn(
              "flex items-center justify-between rounded-full px-1 py-1 shadow-lg w-full max-w-sm border-2 relative transition-colors duration-300 overflow-hidden",
              playerColor === Player.BLUE
                ? "bg-transparent border-player-blue shadow-player-blue/20"
                : "bg-transparent border-player-red shadow-player-red/20"
            )}>

              <div className="flex-1 flex flex-col items-center justify-between text-center relative z-10 h-full py-0.5">
                {gameState === 'playing' && (
                  <motion.span
                    className="text-xl font-bold tracking-tight inline-block "
                    animate={shouldWiggle ? { rotate: [-5, 5, -5, 5, 0], scale: [1, 1.1, 1.1, 1.1, 1] } : {}}
                    transition={{ duration: wiggleDuration }}
                  >
                    {isYourTurn ? 'Your turn' : `${currentPlayer === Player.BLUE ? "Blue's" : "Orange's"} turn`}
                  </motion.span>
                )}
                {gameState === 'won' && (
                  <span className="text-xl font-bold tracking-tight">
                    {winner === playerColor ? 'You Won!' : 'Opponent Won'}
                  </span>
                )}
                <span className="text-sm font-medium opacity-90 leading-[1.6rem]">
                  {(() => {
                    const hasMoves = board.some(row => row.some(cell => cell !== Player.EMPTY));
                    if (!hasMoves) {
                      return 'First move';
                    }
                    if (lastMoveAt) {
                      const lastMovePlayer = gameState === 'won' ? currentPlayer : (currentPlayer === Player.BLUE ? Player.RED : Player.BLUE);
                      return (
                        <>
                          Last move{' '}
                          {isToday(new Date(lastMoveAt))
                            ? format(new Date(lastMoveAt), 'HH:mm')
                            : format(new Date(lastMoveAt), 'MMM d, HH:mm')}{' '}
                          by <span className="font-bold drop-shadow-sm">{lastMovePlayer === Player.RED ? 'Orange' : 'Blue'}</span>
                          {lastMovePlayer === playerColor ? ' (You)' : ''}
                        </>
                      );
                    }
                    return 'First move';
                  })()}
                </span>
                <span className="text-xs opacity-75">
                  Game ID: {gameId}
                </span>
              </div>
              <div className="absolute right-4 flex items-center h-full gap-2 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
                      <MoreVertical className="h-5 w-5" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleNewGame} className="cursor-pointer font-medium">
                      New Game
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer font-medium">
                      <Link to="/games" className="w-full">My Games</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowSettings(true)} className="cursor-pointer font-medium">
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleNewGame}
                size="lg"
                className="font-semibold text-lg px-8 py-6 bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg"
              >
                New Game
              </Button>
              <Button asChild variant="outline" className="px-6 py-6 font-semibold">
                <Link to="/games">My Games</Link>
              </Button>
            </div>
          )}
        </motion.div>

        {/* Share Modal */}
        <Dialog open={gameMode === 'online' && gameState === 'waiting' && !!gameId && !!shareLink} onOpenChange={() => { }}>
          <DialogContent className="sm:max-w-md [&>button]:hidden">
            <div className="flex justify-center pb-2">
              {gameId && shareLink && (
                <ShareLink gameId={gameId} shareLink={shareLink} />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <GameModeSelector
        open={showModeSelector}
        onClose={() => setShowModeSelector(false)}
        onLocalGame={handleLocalGame}
        onCreateOnline={handleCreateOnline}
        onJoinOnline={handleJoinOnline}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </main>
  );
}
