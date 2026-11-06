const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messagesEl = document.getElementById("messages");
const chatArea = document.getElementById("chatArea");
const welcome = document.getElementById("welcome");
const micButton = document.getElementById("micButton");
const listeningNote = document.getElementById("listeningNote");
const soundToggle = document.getElementById("soundToggle");
const voiceHint = document.getElementById("voiceHint");

let history = [];
let speakingEnabled = true;
let recognition = null;
let isRecording = false;

function showChat() {
  welcome.style.display = "none";
  chatArea.classList.add("visible");
}
function addMessage(role, text) {
  showChat();
  const row = document.createElement("div");
  row.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "✳" : "●";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const content = document.createElement("div");
  content.textContent = text;
  bubble.appendChild(content);
  if (role === "assistant") {
    const tools = document.createElement("div");
    tools.className = "message-tools";
    const speak = document.createElement("button");
    speak.className = "speak-one";
    speak.textContent = "▶ Прослухати";
    speak.addEventListener("click", () => speakText(text));
    tools.appendChild(speak);
    bubble.appendChild(tools);
  }
  row.append(avatar, bubble);
  messagesEl.appendChild(row);
  row.scrollIntoView({ behavior: "smooth", block: "end" });
}
function speakText(text) {
  if (!("speechSynthesis" in window)) {
    voiceHint.textContent = "Озвучування не підтримується цим браузером";
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "uk-UA";
  utterance.rate = 0.96;
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const ukVoice = voices.find(v => v.lang.toLowerCase().startsWith("uk"));
  if (ukVoice) utterance.voice = ukVoice;
  window.speechSynthesis.speak(utterance);
}
function setBusy(busy) {
  document.querySelector(".send-button").disabled = busy;
  document.querySelector(".send-button").textContent = busy ? "…" : "↑";
}
async function sendMessage(text) {
  const clean = text.trim();
  if (!clean) return;
  addMessage("user", clean);
  history.push({ role: "user", content: clean });
  input.value = "";
  input.style.height = "auto";
  setBusy(true);
  const typing = document.createElement("div");
  typing.className = "typing";
  typing.textContent = "BioTeacher думає…";
  messagesEl.appendChild(typing);
  typing.scrollIntoView({ behavior: "smooth", block: "end" });
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Не вдалося отримати відповідь.");
    typing.remove();
    history.push({ role: "assistant", content: data.reply });
    addMessage("assistant", data.reply);
    if (speakingEnabled) speakText(data.reply);
  } catch (error) {
    typing.remove();
    addMessage("assistant", `Не вдалося відповісти: ${error.message}`);
  } finally {
    setBusy(false);
  }
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
});
document.querySelectorAll("[data-topic]").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.topic));
});
document.getElementById("clearChat").addEventListener("click", () => {
  history = [];
  messagesEl.innerHTML = "";
  chatArea.classList.remove("visible");
  welcome.style.display = "";
  window.speechSynthesis?.cancel();
});
soundToggle.addEventListener("click", () => {
  speakingEnabled = !speakingEnabled;
  soundToggle.classList.toggle("off", !speakingEnabled);
  soundToggle.title = speakingEnabled ? "Вимкнути озвучування" : "Увімкнути озвучування";
  if (!speakingEnabled) window.speechSynthesis?.cancel();
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "uk-UA";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onstart = () => {
    isRecording = true;
    micButton.classList.add("recording");
    listeningNote.classList.add("show");
    voiceHint.textContent = "Говори — я слухаю";
  };
  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    input.value = transcript;
    input.dispatchEvent(new Event("input"));
  };
  recognition.onerror = (event) => {
    voiceHint.textContent = event.error === "not-allowed"
      ? "Дозволь доступ до мікрофона в браузері"
      : "Не вдалося розпізнати голос. Спробуй ще раз.";
  };
  recognition.onend = () => {
    isRecording = false;
    micButton.classList.remove("recording");
    listeningNote.classList.remove("show");
    voiceHint.textContent = "Можеш говорити або писати";
  };
} else {
  micButton.disabled = true;
  micButton.title = "Голосове введення не підтримується цим браузером";
  voiceHint.textContent = "Для мікрофона спробуй Chrome або Edge";
}
micButton.addEventListener("click", () => {
  if (!recognition) return;
  if (isRecording) recognition.stop();
  else {
    try { recognition.start(); }
    catch { voiceHint.textContent = "Зачекай мить і натисни ще раз"; }
  }
});
window.speechSynthesis?.getVoices();