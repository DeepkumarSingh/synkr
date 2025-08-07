import { useState, useEffect } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";

const socket = io("https://synkr-j0o6.onrender.com");

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// Write your code here ");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [output, setOutput] = useState("");
  const [version, setVersion] = useState("*");
  const [loading, setLoading] = useState(false);

  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // === ⏱️ Count-Up Timer Logic ===
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const secsRemaining = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secsRemaining).padStart(2, "0")}`;
  };

  const playBuzzer = () => {
    const audio = new Audio("/buzzer.mp3"); // Make sure buzzer.mp3 is in your public folder
    audio.play();
    alert(`${userName} solved the problem! 🏆`);
  };

  useEffect(() => {
    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("userTyping", (user) => {
      setTyping(`${user.slice(0, 8)}... is Typing`);
      setTimeout(() => {
        setTyping("");
      }, 2000);
    });

    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    });

    socket.on("codeRunning", () => {
      setLoading(true);
    });

    socket.on("codeResponse", (response) => {
      setOutput(response.run.output);
      setLoading(false);
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeRunning");
      socket.off("codeResponse");
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// Write your code here ");
    setLanguage("javascript");
    setTimer(0);
    setIsRunning(false);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("copied to clipboard 👍🏻");
    setTimeout(() => {
      setCopySuccess("");
    }, 2000);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  };

  const runCode = () => {
    setLoading(true);
    socket.emit("compileCode", { code, roomId, language, version });
  };

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h1>Join a Room</h1>
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="room-info">
          <h2> Code Room : {roomId}</h2>
          <button onClick={copyRoomId} className="copy-button">
            Copy Id
          </button>
          {copySuccess && <span className="copy-success">{copySuccess}</span>}
        </div>
        <h3>Users in Room</h3>
        <ul>
          {users.map((user, index) => (
            <li key={index}>{user.slice(0, 8)}...</li>
          ))}
        </ul>
        <p className="typing-indicator">{typing}</p>
        <select
          className="language-selector"
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="python">Python</option>
        </select>
        <button className="leave-button" onClick={leaveRoom}>
          Leave this Room
        </button>
      </div>

      <div className="editor-wrapper">
        {/* === TIMER + BUZZER === */}
        <div style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>
          <strong>⏳ Timer:</strong> {formatTime(timer)}
          <div style={{ marginTop: "0.5rem" }}>
            {!isRunning ? (
              <button onClick={() => setIsRunning(true)}>Start</button>
            ) : (
              <button onClick={() => setIsRunning(false)}>Pause</button>
            )}
            <button onClick={() => setTimer(0)}>Reset</button>
            <button onClick={playBuzzer}>🎉 I Solved It!</button>
          </div>
        </div>

        <Editor
          height={"60%"}
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 16,
          }}
        />
        <button className="run-btn" onClick={runCode}>
          Run Code
        </button>
        {loading && (
          <div
            className="loader"
            style={{ margin: "1rem 0", color: "#007bff", fontWeight: "bold" }}
          >
            Running...
          </div>
        )}
        <textarea
          className="output-area"
          value={output}
          readOnly
          placeholder="Output will be displayed here"
        />
      </div>
    </div>
  );
};

export default App;
