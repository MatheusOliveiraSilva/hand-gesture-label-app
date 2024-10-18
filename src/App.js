import React, { useState, useRef, useEffect } from "react";
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

function App() {
  const [isWebcamActive, setWebcamActive] = useState(false);
  const [handLandmarker, setHandLandmarker] = useState(null);
  const [logoPosition, setLogoPosition] = useState({ x: 100, y: 100 }); // Posição inicial do brasão
  const [isDragging, setIsDragging] = useState(false); // Controle de drag-and-drop
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const logoRef = useRef(null); // Referência ao elemento do brasão

  // Função para iniciar o MediaPipe Hand Landmarker
  useEffect(() => {
    const initializeHandLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
      setHandLandmarker(handLandmarker);
    };

    initializeHandLandmarker();
  }, []);

  // Ativar webcam e aplicar o modelo Hand Landmarker
  useEffect(() => {
    if (isWebcamActive && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;

          videoRef.current.onloadeddata = () => {
            if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;

              detectHands();
            }
          };
        })
        .catch((err) => {
          console.error("Webcam access denied:", err);
        });
    }
  }, [isWebcamActive]);

  // Função para detectar mãos e desenhar landmarks
  const detectHands = async () => {
    if (!handLandmarker) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    const HAND_CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Polegar
      [0, 5], [5, 6], [6, 7], [7, 8], // Dedo indicador
      [5, 9], [9, 10], [10, 11], [11, 12], // Dedo médio
      [9, 13], [13, 14], [14, 15], [15, 16], // Dedo anelar
      [13, 17], [17, 18], [18, 19], [19, 20] // Dedo mínimo
    ];

    const drawLandmarks = (landmarks) => {
      ctx.fillStyle = "red";
      ctx.strokeStyle = "green";
      ctx.lineWidth = 2;

      landmarks.forEach((landmark) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });

      HAND_CONNECTIONS.forEach(([start, end]) => {
        const xStart = landmarks[start].x * canvas.width;
        const yStart = landmarks[start].y * canvas.height;
        const xEnd = landmarks[end].x * canvas.width;
        const yEnd = landmarks[end].y * canvas.height;

        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        ctx.stroke();
      });
    };

    const processFrame = async () => {
      if (!handLandmarker) return;
      const hands = await handLandmarker.detectForVideo(video, Date.now());

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (hands.landmarks.length > 0) {
        hands.landmarks.forEach((landmarks) => {
          drawLandmarks(landmarks);
        });
      }

      requestAnimationFrame(processFrame);
    };

    processFrame();
  };

  // Funções de Drag-and-Drop para o brasão
  const startDrag = () => {
    setIsDragging(true);
  };

  const handleDrag = (e) => {
    if (isDragging) {
      setLogoPosition({
        x: e.clientX - 50,
        y: e.clientY - 50,
      });
    }
  };

  const endDrag = () => {
    setIsDragging(false);
  };

  return (
    <div style={{ position: "relative", height: "100vh", width: "100vw" }} onMouseMove={handleDrag} onMouseUp={endDrag}>
      <div style={{
        position: "absolute",
        top: 0,
        width: "100%",
        backgroundColor: "#003366",
        color: "white",
        textAlign: "center",
        padding: "10px",
        fontSize: "24px",
        zIndex: 10,
      }}>
        INF - 2473
      </div>

      {!isWebcamActive ? (
        <button
          onClick={() => setWebcamActive(true)}
          style={{
            padding: "20px 40px",
            fontSize: "24px",
            cursor: "pointer",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "8px",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          Autorizar Webcam
        </button>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 2,
            }}
          />
          <img
            ref={logoRef}
            src="/image-asset.png"
            alt="Brasão PUC-Rio"
            style={{
              position: "absolute",
              top: `${logoPosition.y}px`,
              left: `${logoPosition.x}px`,
              width: "100px",
              height: "100px",
              cursor: isDragging ? "grabbing" : "grab",
              zIndex: 11,
            }}
            onMouseDown={startDrag}
            onMouseUp={endDrag}
          />
        </>
      )}
    </div>
  );
}

export default App;
