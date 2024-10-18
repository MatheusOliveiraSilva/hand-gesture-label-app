import React, { useState, useRef, useEffect } from "react";
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

function App() {
  const [isWebcamActive, setWebcamActive] = useState(false);
  const [handLandmarker, setHandLandmarker] = useState(null);
  const [isDragging, setIsDragging] = useState(false); // Controle do estado de arraste
  const [indicatorPosition, setIndicatorPosition] = useState({ x: 0, y: 0 }); // Posição da bolinha/indicador
  const [iconVisible, setIconVisible] = useState(true); // Controle da visibilidade do ícone
  const [iconPosition, setIconPosition] = useState({ x: 200, y: 200 }); // Posição inicial do ícone
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const iconRef = useRef(null);

  const SENSITIVITY = 1.8;
  const OFFSET = -30;

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
        numHands: 1,
      });
      setHandLandmarker(handLandmarker);
    };

    initializeHandLandmarker();
  }, []);

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

  const detectHands = async () => {
    if (!handLandmarker) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    const processFrame = async () => {
      const hands = await handLandmarker.detectForVideo(video, Date.now());

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (hands.landmarks.length > 0) {
        const landmarks = hands.landmarks[0];
        detectPose(landmarks);
        drawLandmarks(ctx, landmarks);
      }

      requestAnimationFrame(processFrame);
    };

    processFrame();
  };

  const detectPose = (landmarks) => {
    const [thumbTip, indexTip] = [landmarks[4], landmarks[8]];

    moveIndicator(indexTip);

    const gripDistance = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y
    );
    const isGrip = gripDistance < 0.05;

    const iconRect = iconRef.current.getBoundingClientRect();
    const isOverIcon =
      indicatorPosition.x >= iconRect.left &&
      indicatorPosition.x <= iconRect.right &&
      indicatorPosition.y >= iconRect.top &&
      indicatorPosition.y <= iconRect.bottom;

    if (isGrip && isOverIcon) {
      setIsDragging(true);
      setIconVisible(false);
    } else if (!isGrip && isDragging) {
      setIsDragging(false);
      setIconPosition(indicatorPosition);
      setIconVisible(true);
    }
  };

  const moveIndicator = (landmark) => {
    const canvas = canvasRef.current;
    const newX = landmark.x * canvas.width * SENSITIVITY;
    const newY = (landmark.y * canvas.height * SENSITIVITY) + OFFSET;

    setIndicatorPosition({ x: newX, y: newY });
  };

  const drawLandmarks = (ctx, landmarks) => {
    ctx.fillStyle = "red";
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;

    landmarks.forEach((landmark) => {
      const x = landmark.x * ctx.canvas.width;
      const y = landmark.y * ctx.canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  return (
    <div style={{ position: "relative", height: "100vh", width: "100vw" }}>
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
          {iconVisible && (
            <img
              ref={iconRef}
              src="/image-asset.png"
              alt="Ícone Arrastável"
              style={{
                position: "absolute",
                top: `${iconPosition.y}px`,
                left: `${iconPosition.x}px`,
                width: "50px",
                height: "50px",
                zIndex: 11,
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              top: `${indicatorPosition.y}px`,
              left: `${indicatorPosition.x}px`,
              width: "10px",
              height: "10px",
              backgroundColor: "blue",
              borderRadius: "50%",
              zIndex: 12,
            }}
          />
        </>
      )}
    </div>
  );
}

export default App;
