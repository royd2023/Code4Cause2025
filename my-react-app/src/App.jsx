import './App.css'
// Simple React + WebRTC App
import React, { useRef, useEffect, useState } from "react";

export default function App() {
  const localVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSilent, setIsSilent] = useState(false); // State to track silence

  useEffect(() => {
    const getMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setStream(mediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }

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
          const isAudioSilent = dataArray.every(value => Math.abs(value - 128) < 2);
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

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Handy</h1>
      <video
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
      <button
        onClick={toggleMute}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600"
      >
        {isMuted ? "Unmute" : "Mute"}
      </button>
      <p className="mt-4 text-lg">
        {isSilent ? console.log("No audio detected") : console.log("Audio is being detected")}
      </p>
      <h2 className="text-3xl font-bold mb-4">Student</h2>
    </div>
  );
}


