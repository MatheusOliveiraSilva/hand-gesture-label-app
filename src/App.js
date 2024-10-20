import React, { useState, useRef, useEffect } from "react";
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
import * as tf from '@tensorflow/tfjs';

function App() {
  const [isWebcamActive, setWebcamActive] = useState(false);
  const [handLandmarker, setHandLandmarker] = useState(null);
  const [gesturePrediction, setGesturePrediction] = useState(""); // Armazenar a predição do gesto
  const [logoPosition, setLogoPosition] = useState({ x: 100, y: 100 }); // Posição inicial do brasão
  const [isDragging, setIsDragging] = useState(false); // Controle de drag-and-drop
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null); // Referência ao modelo
  const logoRef = useRef(null); // Referência ao elemento do brasão

  // Função para iniciar o MediaPipe Hand Landmarker
  useEffect(() => {
    const initializeHandLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
      setHandLandmarker(handLandmarker);
    };

    // Carregar o modelo do TensorFlow.js
    const loadModel = async () => {
      const model = await tf.loadLayersModel('/model_tfjs/model.json');
      modelRef.current = model;
    };

    initializeHandLandmarker();
    loadModel(); // Carregar o modelo ao iniciar
  }, []);

  // Ativar webcam e aplicar o modelo Hand Landmarker
  useEffect(() => {
    if (isWebcamActive && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;

          videoRef.current.onloadeddata = () => {
            // Verificar as dimensões do vídeo e do canvas
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

  // Função para detectar mãos e fazer predições de gestos
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

      // Desenhar os pontos dos landmarks
      landmarks.forEach((landmark) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Desenhar as conexões entre os pontos
      ctx.strokeStyle = "green";
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

    const predictGesture = async (frame) => {
      if (!modelRef.current) return;

      const imgTensor = tf.browser.fromPixels(frame).resizeNearestNeighbor([224, 224]).expandDims(0).div(255.0);
      const predictions = await modelRef.current.predict(imgTensor).data();
      const gestureIndex = predictions.indexOf(Math.max(...predictions));

      const gestures = ["FingerUp", "Open", "Grip"];
      setGesturePrediction(gestures[gestureIndex]); // Atualiza a predição
    };

    const processFrame = async () => {
      if (!handLandmarker) return;
      const hands = await handLandmarker.detectForVideo(video, Date.now());

      // Limpar o canvas para cada novo frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Desenhar o vídeo como fundo
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Desenhar landmarks para todas as mãos detectadas
      if (hands.landmarks.length > 0) {
        hands.landmarks.forEach((landmarks) => {
          drawLandmarks(landmarks);  // Desenhar landmarks de cada mão
        });
      }

      // Fazer a predição do gesto usando o frame atual
      predictGesture(video);

      requestAnimationFrame(processFrame);
    };

    processFrame();
  };

  // Funções de Drag-and-Drop para o brasão
  const startDrag = (e) => {
    setIsDragging(true);
  };

  const handleDrag = (e) => {
    if (isDragging) {
      setLogoPosition({
        x: e.clientX - 50, // Ajuste para centralizar o brasão no cursor
        y: e.clientY - 50,
      });
    }
  };

  const endDrag = () => {
    setIsDragging(false);
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }} onMouseMove={handleDrag} onMouseUp={endDrag}>
      {/* Header azul marinho */}
      <div style={{
        position: 'absolute',
        top: 0,
        width: '100%',
        backgroundColor: '#003366',  // Azul marinho
        color: 'white',
        textAlign: 'center',
        padding: '10px',
        fontSize: '24px',
        zIndex: 10 // Fingers Landmarking and Understanding Pose Estimation - F.L.U.P.S
      }}>
        INF - 2473
      </div>

      {/* Vídeo ocupando toda a tela */}
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
            zIndex: 10
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
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover', // Faz o vídeo cobrir toda a tela
              zIndex: 1
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 2  // O canvas sobrepõe o vídeo
            }}
          />
          {/* Exibir a predição do gesto */}
          <div style={{
            position: "absolute",
            top: "60px",  // Um pouco abaixo do header
            left: "10px",
            color: "white",
            fontSize: "24px",
            zIndex: 10
          }}>
            Predição do Gesto: {gesturePrediction}
          </div>

          {/* Brasão PUC-Rio com Drag-and-Drop */}
          <img
            ref={logoRef}
            src="/image-asset.png" // Certifique-se de que o caminho para a imagem está correto
            alt="Brasão PUC-Rio"
            style={{
              position: "absolute",
              top: `${logoPosition.y}px`,
              left: `${logoPosition.x}px`,
              width: "100px",
              height: "100px",
              cursor: isDragging ? "grabbing" : "grab", // Muda o cursor quando estiver arrastando
              zIndex: 11
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
