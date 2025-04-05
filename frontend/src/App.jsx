import './App.css';
import * as handTrack from "handtrackjs";
// Simple React + WebRTC App
import React, { useRef, useEffect, useState } from "react";

export default function App() {
  const localVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSilent, setIsSilent] = useState(false); // State to track silence

  const handvideoRef = useRef(null);
  const handCanvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [handRaised, setHandRaised] = useState(false);


  useEffect(() => {

    const modelParams = {
      maxNumBoxes: 1,          // Detect only one hand
      iouThreshold: 0.6, // Intersection over union threshold
      scoreThreshold: 0.8, // Confidence threshold
    };

    // Load the handtrack.js model
    handTrack.load(modelParams).then((loadedModel) => {
      setModel(loadedModel);
      startVideo(loadedModel);
    });


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

  const startVideo = (loadedModel) => {
    handTrack.startVideo(handvideoRef.current).then((status) => {
      if (status) {
        runDetection(loadedModel);
      } else {
        console.log("Please enable video");
      }
    });
  };

  const runDetection = (loadedModel) => {
    loadedModel.detect(handvideoRef.current).then((predictions) => {
      // Get the video dimensions (make sure the video is playing)
      const videoHeight = handvideoRef.current.videoHeight || 480;
      
      if (predictions.length > 0) {
        const bbox = predictions[0].bbox; // [x, y, width, height]
        // if the top of the box (y) is above half of video height,
        // we say the hand is raised.
        if (bbox[1] < videoHeight / 2) {
          setHandRaised(true);
        } else {
          setHandRaised(false);
        }
      } else {
        setHandRaised(false);
      }

      drawPredictions(predictions);
      requestAnimationFrame(() => runDetection(loadedModel));
    });
  };

  const drawPredictions = (predictions) => {
    const canvas = handCanvasRef.current;
    if (!canvas || !handvideoRef.current) return;
    const ctx = canvas.getContext("2d");

    // Update canvas dimensions to match the video element.
    canvas.width = handvideoRef.current.videoWidth;
    canvas.height = handvideoRef.current.videoHeight;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox;
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    });
  };

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

      <h2>{handRaised ? "Hand Raised" : "Hand Not Raised"}</h2>
      <div style={{ position: "relative", display: "inline-block" }}>
        <video
          ref={handvideoRef}
          autoPlay
          playsInline
          style={{ width: "640px", height: "480px", border: "1px solid #333" }}
        />
        <canvas
          ref={handCanvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "none",
          }}
        />
      </div>


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


      <button
        style={{border: "4px solid white"}}
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

      
    </div>
  );
}