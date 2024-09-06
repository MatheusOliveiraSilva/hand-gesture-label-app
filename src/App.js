import React, { useState, useRef, useEffect } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

function App() {
  const [isWebcamActive, setWebcamActive] = useState(false);
  const [handLandmarker, setHandLandmarker] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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
            detectHands();
          };
        })
        .catch((err) => {
          console.error("Webcam access denied:", err);
        });
    }
  }, [isWebcamActive]);

  const detectHands = async () => {
    if (!handLandmarker) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    // Configurar o canvas para ter o mesmo tamanho do vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Função para desenhar a detecção no canvas
    const drawLandmarks = (landmarks) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "red";
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;

      landmarks.forEach((landmark) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    };

    const processFrame = async () => {
      if (!handLandmarker) return;
      const hands = await handLandmarker.detectForVideo(video, Date.now());
      if (hands.landmarks.length > 0) {
        drawLandmarks(hands.landmarks[0]);
      }
      requestAnimationFrame(processFrame);
    };

    processFrame();
  };

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: "black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
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
              display: "none",
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              width: "80%",
              height: "auto",
            }}
          />
        </>
      )}
    </div>
  );
}

export default App;
