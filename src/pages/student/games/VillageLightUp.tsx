import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { ConceptIntroPopup } from "@/components/ui/concept-intro-popup";
import { GameCompletionPopup } from "@/components/ui/game-completion-popup";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface WireTile {
  id: number;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
  type: "straight" | "corner"; // straight = connects left-right, corner = connects top-right
  connected: boolean;
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 500;
const GRID_SIZE = 60;
const COLS = 4;
const ROWS = 4;

// Tile positions that make up the circuit
const REQUIRED_TILES = [
  { row: 0, col: 1 }, // Start (battery to right)
  { row: 0, col: 2 },
  { row: 0, col: 3 }, // Corner
  { row: 1, col: 3 }, // Down
  { row: 2, col: 3 }, // Down
  { row: 2, col: 0 }, // Corner to left
  { row: 2, col: 1 }, // Left
  { row: 2, col: 2 }, // Corner back up
  { row: 1, col: 2 }, // Up
  { row: 1, col: 1 }, // Corner back to start
];

export default function VillageLightUp() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [tiles, setTiles] = useState<WireTile[]>(
    Array.from({ length: COLS * ROWS }, (_, i) => ({
      id: i,
      x: (i % COLS) * GRID_SIZE + 100,
      y: Math.floor(i / COLS) * GRID_SIZE + 100,
      rotation: Math.random() * 360,
      type: Math.random() > 0.5 ? "straight" : "corner",
      connected: false,
    }))
  );
  const [attempts, setAttempts] = useState(0);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);

  const rotateTile = (id: number) => {
    setTiles((prev) =>
      prev.map((tile) =>
        tile.id === id
          ? {
              ...tile,
              rotation: (tile.rotation + 90) % 360,
            }
          : tile
      )
    );
    setAttempts((prev) => prev + 1);
    setSelectedTile(id);
  };

  // Check if circuit is complete
  useEffect(() => {
    const isComplete = checkCircuit();
    if (isComplete) {
      setShowCompletion(true);
    }
  }, [tiles]);

  const checkCircuit = () => {
    // Very simplified check - in a real game, you'd do proper path tracing
    const totalCorrect = tiles.filter((tile) => {
      const correctRotation = getCorrectRotation(tile.id);
      return correctRotation !== null && tile.rotation === correctRotation;
    }).length;

    return totalCorrect >= 8; // At least 8/10 tiles correct
  };

  const getCorrectRotation = (id: number) => {
    const row = Math.floor(id / COLS);
    const col = id % COLS;

    // This maps the correct orientations for each tile
    const correctMap: Record<string, number> = {
      "0,1": 0, // horizontal
      "0,2": 0, // horizontal
      "0,3": 90, // corner down
      "1,3": 0, // vertical
      "2,3": 180, // corner left
      "2,2": 0, // horizontal
      "2,1": 0, // horizontal
      "2,0": 90, // corner up
      "1,0": 0, // vertical
      "1,1": 0, // corner right
    };

    return correctMap[`${row},${col}`] ?? null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Stars
    ctx.fillStyle = "#FFD700";
    for (let i = 0; i < 30; i++) {
      const x = (i * 37) % GAME_WIDTH;
      const y = (i * 23) % 80;
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Title
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Complete the Circuit to Light Up the Village", GAME_WIDTH / 2, 40);

    // Grid background
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < COLS; i++) {
      for (let j = 0; j < ROWS; j++) {
        const x = 100 + i * GRID_SIZE;
        const y = 100 + j * GRID_SIZE;
        ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
      }
    }

    // Draw battery (start)
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(20, 100, 30, GRID_SIZE);
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("+", 35, 130);

    // Draw bulb (end)
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(GAME_WIDTH - 40, 100 + GRID_SIZE / 2, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#FFF";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("💡", GAME_WIDTH - 40, 108);

    // Draw tiles
    tiles.forEach((tile) => {
      const isSelected = selectedTile === tile.id;

      // Tile background
      ctx.fillStyle = isSelected ? "#4a90e2" : "#2d3561";
      ctx.fillRect(tile.x, tile.y, GRID_SIZE, GRID_SIZE);

      // Tile border
      ctx.strokeStyle = isSelected ? "#FFF" : "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(tile.x, tile.y, GRID_SIZE, GRID_SIZE);

      // Draw wire pattern
      ctx.save();
      ctx.translate(tile.x + GRID_SIZE / 2, tile.y + GRID_SIZE / 2);
      ctx.rotate((tile.rotation * Math.PI) / 180);

      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 4;

      if (tile.type === "straight") {
        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();

        // Connection dots
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(-20, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(20, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Corner line
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(0, 0);
        ctx.lineTo(0, -20);
        ctx.stroke();

        // Connection dots
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(-20, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -20, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Glow if correct rotation
      const correctRotation = getCorrectRotation(tile.id);
      if (correctRotation !== null && tile.rotation === correctRotation) {
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.strokeRect(tile.x - 2, tile.y - 2, GRID_SIZE + 4, GRID_SIZE + 4);
        ctx.globalAlpha = 1;
      }
    });

    // Draw current flow if circuit is complete
    if (checkCircuit()) {
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;

      // Flow animation
      const offset = (Date.now() / 10) % 40;
      ctx.setLineDash([10, 5]);
      ctx.lineDashOffset = -offset;

      // Simple path from battery through circuit
      ctx.beginPath();
      ctx.moveTo(50, 130);
      ctx.lineTo(100, 130);
      for (const pos of REQUIRED_TILES) {
        ctx.lineTo(100 + pos.col * GRID_SIZE + GRID_SIZE / 2, 100 + pos.row * GRID_SIZE + GRID_SIZE / 2);
      }
      ctx.lineTo(GAME_WIDTH - 40, 130);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Victory message
      ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      ctx.fillRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT - 100, 300, 80);
      ctx.fillStyle = "#000";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🎉 CIRCUIT COMPLETE!", GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    // Attempts counter
    ctx.fillStyle = "#FFF";
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Rotations: ${attempts}`, 10, GAME_HEIGHT - 20);
  }, [tiles, selectedTile, attempts]);

  const handleStart = () => {
    setShowTutorial(false);
  };

  const handleGoBack = () => {
    navigate("/student/physics");
  };

  const handleExitFullscreen = () => {
    setIsFullscreen(false);
  };

  const handleReset = () => {
    setTiles(
      Array.from({ length: COLS * ROWS }, (_, i) => ({
        id: i,
        x: (i % COLS) * GRID_SIZE + 100,
        y: Math.floor(i / COLS) * GRID_SIZE + 100,
        rotation: Math.random() * 360,
        type: Math.random() > 0.5 ? "straight" : "corner",
        connected: false,
      }))
    );
    setAttempts(0);
    setShowCompletion(false);
  };

  const gameContainer = (
    <div
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-50 bg-black p-0" : "w-full bg-gray-900 p-4"
      )}
    >
      {/* Fullscreen button */}
      {!isFullscreen && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            onClick={() => setIsFullscreen(true)}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            Full Screen
          </Button>
        </div>
      )}

      {isFullscreen && (
        <Button
          onClick={() => setIsFullscreen(false)}
          size="sm"
          variant="outline"
          className="absolute top-4 right-4 z-10 gap-2 bg-white"
        >
          <Minimize2 className="w-4 h-4" />
          Exit
        </Button>
      )}

      {/* Canvas */}
      <div className={cn(
        "rounded-lg border-2 border-yellow-500 shadow-lg bg-black overflow-hidden",
        isFullscreen ? "w-screen h-screen" : "w-full max-w-4xl"
      )}>
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="w-full h-full cursor-pointer"
          onClick={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Find clicked tile
            tiles.forEach((tile) => {
              if (
                x >= tile.x &&
                x <= tile.x + GRID_SIZE &&
                y >= tile.y &&
                y <= tile.y + GRID_SIZE
              ) {
                rotateTile(tile.id);
              }
            });
          }}
        />
      </div>

      {/* Controls */}
      {!isFullscreen && (
        <div className="mt-6 w-full max-w-4xl bg-gray-800 p-6 rounded-lg border border-yellow-500">
          <div className="space-y-6">
            <div className="text-white text-center">
              <p className="text-sm mb-2">
                Click on tiles to rotate them. Connect all tiles to complete the circuit!
              </p>
              <p className="text-xs text-gray-400">
                Green glow = correct rotation
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-700 rounded-lg text-white text-center">
              <div>
                <div className="text-xs text-gray-400">Total Rotations</div>
                <div className="text-2xl font-bold text-yellow-400">{attempts}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Correct Tiles</div>
                <div className="text-2xl font-bold text-green-400">
                  {tiles.filter((t) => {
                    const correct = getCorrectRotation(t.id);
                    return correct !== null && t.rotation === correct;
                  }).length}
                  /{COLS * ROWS}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleReset}
                variant="outline"
                className="text-yellow-500 border-yellow-500 hover:bg-yellow-500 hover:text-black font-bold"
              >
                🔄 Reset
              </Button>
              <Button
                onClick={() => setShowCompletion(true)}
                disabled={!checkCircuit()}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold disabled:opacity-50"
              >
                ✅ Check Circuit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Info */}
      {!isFullscreen && (
        <div className="mt-6 w-full max-w-4xl bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-800 mb-2">📘 Concept</h3>
              <p className="text-sm text-gray-700">
                Electricity needs a complete, unbroken loop to flow. If the circuit is broken anywhere, electricity won't reach the bulb!
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">🕹 How to Play</h3>
              <p className="text-sm text-gray-700">
                Click on tiles to rotate them. Connect all the wires to create a complete circuit from the battery to the light bulb.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">🧠 What You Learn</h3>
              <p className="text-sm text-gray-700">
                Circuits must form a closed loop. Broken paths = no electricity. Complete loop = light!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <ConceptIntroPopup
        isOpen={showTutorial}
        onStart={handleStart}
        onGoBack={handleGoBack}
        conceptName="Village Light-Up"
        whatYouWillUnderstand="Learn how electricity flows in closed circuits. A broken path = no light!"
        gameSteps={[
          "Observe the battery (red) and light bulb (yellow)",
          "Click on wire tiles to rotate them",
          "Connect all wires to form a complete loop",
          "Complete the circuit to light up the village",
        ]}
        successMeaning="When all wires are correctly connected, electricity flows and the bulbs light up!"
        icon="💡"
      />

      <GameCompletionPopup
        isOpen={showCompletion && checkCircuit()}
        onPlayAgain={handleReset}
        onExitFullscreen={handleExitFullscreen}
        onBackToGames={handleGoBack}
        learningOutcome="You mastered circuits! You understand that electricity needs a complete, unbroken loop to flow and power devices!"
        isFullscreen={isFullscreen}
      />

      <div className="py-6">
        <div className="mb-4 flex items-center gap-2">
          <Button
            onClick={handleGoBack}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Physics
          </Button>
        </div>

        {gameContainer}
      </div>
    </AppLayout>
  );
}
