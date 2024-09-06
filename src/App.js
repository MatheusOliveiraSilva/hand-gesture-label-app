import React, { useState, useRef, useEffect } from "react";
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

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
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
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
            // Verificar as dimensões do vídeo e do canvas
            console.log('Video dimensions:', videoRef.current.videoWidth, videoRef.current.videoHeight);

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

  // Função para detectar e desenhar landmarks
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

      requestAnimationFrame(processFrame);
    };

    processFrame();
  };

  // Função para salvar o frame como imagem ao pressionar a tecla 'S'
  const saveFrameAsImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.href = canvas.toDataURL();  // Converte o canvas para imagem PNG
    link.download = `Open/frame_${Date.now()}.png`;  // Nome do arquivo baseado no timestamp atual
    link.click();  // Simula o clique para baixar a imagem
  };

  // Hook para capturar o evento de pressionar a tecla 'S'
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 's' || event.key === 'S') {
        saveFrameAsImage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    // Limpar o event listener ao desmontar o componente
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

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
