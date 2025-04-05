import './App.css';
// Simple React + WebRTC App
import React, { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";

export default function App() {
  const localVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const handCanvasRef = useRef(null); // Canvas for hand detection
  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSilent, setIsSilent] = useState(false); // State to track silence
  const [handDetected, setHandDetected] = useState(false); // State to track hand detection

  useEffect(() => {
    const getMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(mediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }

        // Initialize MediaPipe Hands
        const hands = new Hands({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        hands.onResults((results) => {
          const handCanvas = handCanvasRef.current;
          const ctx = handCanvas.getContext("2d");

          // Clear the canvas
          ctx.clearRect(0, 0, handCanvas.width, handCanvas.height);

          // Draw the video frame
          if (results.image) {
            ctx.drawImage(results.image, 0, 0, handCanvas.width, handCanvas.height);
          }

          // Check for hand landmarks and update state
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setHandDetected(true); // Hand detected
            results.multiHandLandmarks.forEach((landmarks) => {
              landmarks.forEach((landmark) => {
                const x = landmark.x * handCanvas.width;
                const y = landmark.y * handCanvas.height;

                // Draw a circle for each landmark
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "red";
                ctx.fill();
              });
            });
          } else {
            setHandDetected(false); // No hand detected
          }
        });

        // Process video frames
        const processVideo = async () => {
          if (localVideoRef.current) {
            await hands.send({ image: localVideoRef.current });
          }
          requestAnimationFrame(processVideo);
        };

        processVideo();

        // Process audio
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048; // Set FFT size for better resolution
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext("2d");

        const draw = () => {
          analyser.getByteTimeDomainData(dataArray);

          // Check for silence
          const isAudioSilent = dataArray.every((value) => Math.abs(value - 128) < 2);
          setIsSilent(isAudioSilent);

          // Clear the canvas
          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw the waveform
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = "#4A90E2";
          canvasCtx.beginPath();

          const sliceWidth = canvas.width / dataArray.length;
          let x = 0;

          for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;

            if (i === 0) {
              canvasCtx.moveTo(x, y);
            } else {
              canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
          }

          canvasCtx.lineTo(canvas.width, canvas.height / 2);
          canvasCtx.stroke();

          requestAnimationFrame(draw);
        };

        draw();
      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };
    getMedia();
  }, []);

  const toggleMute = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setIsMuted(!audioTracks[0].enabled);
      }
    }
  };

  const videoStyle = isSilent ? { border: "4px solid white" } : { border: "4px solid green" };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Handy</h1>

      <video
        id="videowindow"
        style={videoStyle}
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="w-96 rounded-lg shadow-md border border-gray-300"
      />

      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="mt-4 border border-gray-300 rounded-lg shadow-md"
      />

      <canvas
        ref={handCanvasRef}
        width={640}
        height={480}
        className="mt-4 border border-gray-300 rounded-lg shadow-md"
      />

      <button
        onClick={() => {
          toggleMute();
          alert(isMuted ? "Audio is unmuted" : "Audio is muted");
        }}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600"
      >
        <img
          src="https://www.freeiconspng.com/uploads/microphone-icons--download-196-free-microphone-icon-page-1--7.png"
          alt="Mute"
          className="w-6 h-6"
        />
      </button>

      <button
        onClick={() => {
          if (stream) {
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length > 0) {
              const isEnabled = videoTracks[0].enabled;
              videoTracks[0].enabled = !isEnabled; // Toggle the video track
              alert(isEnabled ? "Camera is turned off" : "Camera is turned on");
            }
          }
        }}
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600"
      >
        Toggle Camera
      </button>

      <p className="mt-4 text-lg">{isMuted ? "You are Muted" : "You are Unmuted"}</p>
      <p className="mt-4 text-lg">{isSilent ? "No Sound Detected" : "Sound Detected"}</p>
      <p className="mt-4 text-lg">{handDetected ? "Hand Detected" : "No Hand Detected"}</p>
    </div>
  );
}


