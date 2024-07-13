const codeEditor = ace.edit("codeEditor");
const modeList = ace.require("ace/ext/modelist");
// eslint-disable-next-line no-unused-vars
const languageTools = ace.require("ace/ext/language_tools");

const socket = io();
let currentUsername = localStorage.getItem('username') || null;
let currentRoom = localStorage.getItem('current_room') || null;

function getFileExtension() {
  const modeValue = codeEditor.getOption("mode");
  const modeItem = modeList.modes.find((item) => item.mode === modeValue);
  const extension = modeItem ? modeItem.extensions.split("|")[0] : "txt";
  return extension;
}

function saveFile(text, name, type) {
  const file = new Blob([text], { type });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function getToastHTML(message) {
  return `
    <div role="alert" aria-live="assertive" aria-atomic="true" class="toast">
      <div class="toast-body">${message}</div>
    </div>
  `;
}

function getHTMLElement(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.firstChild;
}

function showToast(message, container) {
  const toastHTML = getToastHTML(message);
  const toastEl = getHTMLElement(toastHTML);
  const Toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2000 });
  container.append(toastEl);
  Toast.show();
  toastEl.addEventListener(
    "hidden.bs.toast",
    () => {
      toastEl.remove();
    },
    { once: true }
  );
}

function getChatMessage(username, message, type = "right") {
  const date = new Date();
  const time = date.toLocaleTimeString("fr-FR", {
    hour: "numeric",
    minute: "numeric"
  });
  return `
    <div class="chat-bubble chat-bubble-${type} px-3 py-1">
      <div class="text-muted block-info">
        <small class="username">${username}</small>
        <small>${time}</small>
      </div>
      <div class="text-left">${message}</div>
    </div>
  `;
}

function getPeopleList(users) {
  let html = "";
  for (let i = 0; i < users.length; i += 1) {
    html += `
      <li class="list-group-item list-group-item-action">
        ${users[i].name}
      </li>
    `;
  }
  return html;
}

function handleCodeChange() {
  // On permet pas la modification si on est pas le propriétaire
  if(!ownerOfCurrentRoom()) return;
  let prevCode = "";
  let timeoutId;

  return () => {
    //clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const code = codeEditor.getValue();
      if (code !== prevCode) {
        socket.emit("codeChange", code);
        prevCode = code;
      }
    }, 500);
  };
}

function onDocumentReady(fn) {
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}


function listOfRoomsIOwn() {
  const owner = localStorage.getItem("owner");
  return owner ? JSON.parse(owner) : [];
}

function addRoomsIOwn(room) {
  const owner = listOfRoomsIOwn();
  if (!owner.includes(room)) { 
    owner.push(room);
    localStorage.setItem("owner", JSON.stringify(owner));
    localStorage.setItem('current_room', room);
  }
}

function ownerOfCurrentRoom() {
  return listOfRoomsIOwn().includes(localStorage.getItem('current_room'));
}

onDocumentReady(() => {
  const modeSelectEl = document.getElementById("modeSelect");
  const tabSizeSelectEl = document.getElementById("tabSizeSelect");
  const fontSizeInputEl = document.getElementById("fontSizeInput");
  const themeSelectEl = document.getElementById("themeSelect");

  const downloadButtonEl = document.getElementById("downloadButton");
  const copyButtonEl = document.getElementById("copyButton");
  const joinButtonEl = document.getElementById("joinButton");
  const chatButtonEl = document.getElementById("chatButton");

  const toastContainerEl = document.getElementById("toastContainer");
  const chatContainerEl = document.getElementById("chatContainer");

  const shareInputEl = document.getElementById("shareInput");
  const chatInputEl = document.getElementById("chatInput");
  const usernameInputEl = document.getElementById("usernameInput");
  const usernameErrorEl = document.getElementById("usernameError");

  const unreadMessageCountEl = document.getElementById("unreadMessageCount");
  const activePeopleCountEl = document.getElementById("activePeopleCount");
  const activePeopleListEl = document.getElementById("activePeopleList");

  const chatDrawerEl = document.getElementById("chatDrawer");

  const joinModalEl = document.getElementById("joinModal");
  const shareModalEl = document.getElementById("shareModal");

  const JoinModal = bootstrap.Modal.getOrCreateInstance(joinModalEl);
  const ShareModal = bootstrap.Modal.getOrCreateInstance(shareModalEl);

  codeEditor.setOptions({
    mode: "ace/mode/javascript",
    tabSize: 4,
    fontSize: 14,
    theme: "ace/theme/monokai",
    value: '',
    enableBasicAutocompletion: true,
    enableSnippets: false,
    enableLiveAutocompletion: true,
    readOnly: !ownerOfCurrentRoom() // On permet pas la modification si on est pas le propriétaire
  });

  codeEditor.on("change", handleCodeChange());

  if(ownerOfCurrentRoom()) {
    modeSelectEl.onchange = (event) => {
      // On permet pas la modification si on est pas le propriétaire
      if(!ownerOfCurrentRoom()) return;
      codeEditor.setOption("mode", event.target.value);
      socket.emit("langChange", {
        lang: modeSelectEl.value,
        name: modeSelectEl.options[modeSelectEl.selectedIndex].text
      });
    };
  }

  tabSizeSelectEl.onchange = (event) => {
    codeEditor.setOption("tabSize", +event.target.value);
  };

  fontSizeInputEl.onchange = (event) => {
    codeEditor.setOption("fontSize", +event.target.value);
  };

  themeSelectEl.onchange = (event) => {
    codeEditor.setOption("theme", event.target.value);
  };

  downloadButtonEl.onclick = () => {
    const content = codeEditor.getValue();
    const extension = getFileExtension();
    const filename = `myfile.${extension}`;
    saveFile(content, filename, "text/plain");
  };

  copyButtonEl.onclick = async () => {
    try {
      await navigator.clipboard.writeText(shareInputEl.value);
      showToast(lang.copyOk, toastContainerEl);
    } catch (error) {
      showToast(lang.copyError, toastContainerEl);
    } finally {
      ShareModal.hide();
    }
  };

  joinButtonEl.onclick = () => {
    const payload = {
      room: shareInputEl.dataset.room,
      name: usernameInputEl.value.trim()
    };

    socket.emit("join", payload, (error) => {
      if (error) {
        usernameInputEl.classList.add("is-invalid");
        usernameErrorEl.innerHTML = error;
      } else {
        currentUsername = usernameInputEl.value.trim();
        addRoomsIOwn(shareInputEl.dataset.room);
        localStorage.setItem('username', currentUsername);
        
        JoinModal.hide();
      }
    });
  };

  shareInputEl.value = window.location.href;

  chatInputEl.onkeydown = (event) => {
    if (event.key === "Enter") {
      chatButtonEl.click();
    }
  };

  chatButtonEl.onclick = () => {
    const message = chatInputEl.value;
    const messageHTML = getChatMessage(currentUsername, message, "right");
    chatContainerEl.insertAdjacentHTML("beforeend", messageHTML);
    chatContainerEl.scrollTo({ top: chatContainerEl.scrollHeight });
    socket.emit("chatMessage", message);
    chatInputEl.value="";
  };

  chatDrawerEl.addEventListener("shown.bs.offcanvas", () => {
    unreadMessageCountEl.hidden = true;
    unreadMessageCountEl.textContent = "0";
  });

  socket.on("usersChange", (users) => {
    activePeopleCountEl.innerHTML = users.length;
    activePeopleListEl.innerHTML = getPeopleList(users);
  });

  socket.on("chatMessage", ({ username, message }) => {
    if (chatDrawerEl.style.visibility !== "visible") {
      unreadMessageCountEl.hidden = false;
      unreadMessageCountEl.textContent =
        Number.parseInt(unreadMessageCountEl.textContent, 10) + 1;
    }
    const messageHTML = getChatMessage(username, message, "left");
    chatContainerEl.innerHTML += messageHTML;
    chatContainerEl.scrollTo({ top: chatContainerEl.scrollHeight });
  });

  socket.on("langChange", ({ lang }) => {
    modeSelectEl.value = lang;
    codeEditor.setOption("mode", lang);
  });

  socket.on("codeChange", (code) => {
    if(ownerOfCurrentRoom()) {
      codeEditor.setReadOnly(false);
      const cursorPosition = codeEditor.getCursorPositionScreen();
      codeEditor.setValue(code, cursorPosition);
      codeEditor.setReadOnly(true);
    }
  });

  socket.on("notification", (message) => {
    showToast(message, toastContainerEl);
  });

  // Si l'utilisateur est propriétaire de l'éditeur
  socket.on("userRommOwner", (room) => {
    modeSelectEl.disabled = false;
    codeEditor.setReadOnly(false);
    addRoomsIOwn(room);
  });
  
  if(currentUsername === null || currentUsername === undefined || currentUsername.length<3) {
    JoinModal.show();
  } else {
    // Sinon on essaye de connecté avec l'info dans le localstorage
    socket.emit(
      "join", 
      { room: shareInputEl.dataset.room, name: currentUsername }, 
      (error) => {
        // En cas d'erreur on efface le pseudo et on supprime le pseudo actuel
        if (error) {
          localStorage.removeItem('username');
          usernameInputEl.classList.add("is-invalid");
          usernameErrorEl.innerHTML = error;
          JoinModal.show();
        }
      }
    );
  }
});
