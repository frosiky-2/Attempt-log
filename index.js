let data = {};
let chart_titles = [];
const key = "playData";
const pass_probability_e = 0.4;
const sampleData = [];
// localStorage.setItem(key, JSON.stringify(sampleData));

const app = document.getElementById("app");
const chart_now = document.getElementById("chart_now");
const session_now = document.getElementById("session_now");
const session_past = document.getElementById("session_past");

let current_session;
let sections = [];
let pass_input = [];
let pass_input_num = [];

const load = localStorage.getItem(key);
if (load) {
  const parsed = JSON.parse(load);
  for (const e of parsed) {
    chart_titles.push(e.title);
  }
}

history.scrollRestoration = "manual";

const hash = decodeURIComponent(location.hash.slice(1) || "");
if (hash) {
  const loaded = loadData(hash);
  if (load) {
    data = loaded;
  }
} else {
  document.getElementById("chart_now").innerHTML =
    `<span id="switch-icon">⇄</span><span class="chart-title">存在しないリンク先です</span>`;
  session_now.innerHTML = `<div class="session-nav"></span>ここには譜面記録が存在しません。。</div>`;
}

createNavsUI();

window.addEventListener("hashchange", () => {
  location.reload();
});

createNewLogUI();

// 初期化 リロードから
function loadData(title) {
  if (load) {
    const parsed = JSON.parse(load);
    for (const e of parsed) {
      if (e.title == title) {
        data = e;
        current_session = data.sessions.length - 1;
        sections = data.sections;

        sections.forEach(() => pass_input.push(0));

        document.title = `${data.title} - 記録`;
        chart_now.innerHTML = `<span id="switch-icon">⇄</span><span class="chart-title">${data.title}</span>　詰め`;

        const session = document.createElement("div");
        session.classList.add("session");
        session.classList.add("active-session");
        const dot = document.createElement("span");
        dot.classList.add("session-dot");
        dot.textContent = "● ";
        session.innerHTML = `${data.sessions[current_session].name || "セッション" + (current_session + 1)}
         - ${data.sessions[current_session].date}
         　　<span id="session-n">総プレイ: ${data.sessions[current_session].n}</span>`;
        session.insertBefore(dot, session.firstChild);
        session_now.appendChild(session);
        createCheckboxes();
        createPastSessions();
        createNewSessionUI();
        return data;
      }
    }
    document.getElementById("chart_now").innerHTML =
      `<span id="switch-icon">⇄</span><span class="chart-title">該当する譜面が存在しませんでした。</span>`;
  }
  return null;
}

function saveData(data) {
  const loaded = localStorage.getItem(key);
  if (loaded) {
    const parsed = JSON.parse(loaded);
    for (let i = 0; i < parsed.length; i++) {
      if (parsed[i].title == data.title) {
        parsed[i] = data;

        localStorage.setItem(key, JSON.stringify(parsed));
        return;
      }
    }
  }
}

function getDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function count(str, target) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] == target) {
      count++;
    }
  }
  return count;
}

function countS(str) {
  // str内のtargetの連続毎にカウント。
  const counts = [];
  const blocks = str.split("0");
  for (const block of blocks) {
    if (block.length > 0) counts.push(block.length);
  }
  return counts;
}

function generateC(pass_str) {
  if (pass_str.length == 0 || count(pass_str, "1") == 0) {
    return 0;
  }
  const pass_sum = count(pass_str, "1");
  const count_s = countS(pass_str);
  const pass_probability = pass_sum / pass_str.length;

  // 通過率と通過の連続度合を評価する指数　安定度評価
  let value_probability = 0;
  let value_pass_streak = 0;

  let pass_sqr_sum = 0;

  // 0%から適度な値の範囲で線形に評価
  value_probability = pass_probability / pass_probability_e;
  // 連続度合を評価
  count_s.forEach((count) => {
    pass_sqr_sum += count * count;
  });
  // 0.5 < c < 1
  value_pass_streak = (pass_sqr_sum / (pass_sum * pass_sum)) * 0.5 + 0.5;
  return value_probability * value_pass_streak;
}

function createEvaluationIndicator(playStr) {
  const maxScore = 1 / pass_probability_e;
  const score = generateC(playStr);
  const percentage = (score / maxScore) * 250;

  const container = document.createElement("div");
  container.classList.add("evaluation-container");

  const bar = document.createElement("div");
  bar.classList.add("evaluation-bar");
  bar.style.width = "0%";

  const label = document.createElement("span");
  label.classList.add("evaluation-label");
  label.textContent = `${(score * 100).toFixed(0)}`;

  container.appendChild(bar);
  container.appendChild(label);

  requestAnimationFrame(() => {
    bar.style.width = `${Math.min(250, percentage)}%`;
  });

  container.updateEvaluation = (newPlayStr) => {
    const newScore = generateC(newPlayStr);
    const newPercentage = (newScore / maxScore) * 250;
    label.textContent = `${(newScore * 100).toFixed(0)}`;
    bar.style.width = `${Math.min(250, newPercentage)}%`;
  };

  return container;
}

function createPassRateIndicator(ratePercentage) {
  const container = document.createElement("div");
  container.classList.add("pass-rate-container");

  const bar = document.createElement("div");
  bar.classList.add("pass-rate-bar");
  bar.style.width = "0%";

  const label = document.createElement("span");
  label.classList.add("pass-rate-label");
  label.textContent = `${ratePercentage.toFixed(1)}%`;

  container.appendChild(bar);
  container.appendChild(label);

  requestAnimationFrame(() => {
    bar.style.width = `${Math.min(100, ratePercentage)}%`;
  });

  container.updatePassRate = (newRate) => {
    label.textContent = `${newRate.toFixed(1)}%`;
    bar.style.width = `${Math.min(100, newRate)}%`;
  };

  return container;
}

function add(input) {
  for (let i = 0; i < sections.length; i++) {
    data.sessions[current_session].play[i] += input[i];
  }
  data.sessions[current_session].n++;
  document.getElementById("session-n").textContent =
    `N: ${data.sessions[current_session].n}`;
  saveData(data);
}

function createCheckboxes() {
  const checkboxes = [];
  const note_grid = document.createElement("div");
  note_grid.classList.add("note-grid");
  const refresh = [];
  for (let i = 0; i < sections.length; i++) {
    const checkbox = document.createElement("input");
    checkbox.classList.add("checkbox");
    checkbox.type = "checkbox";
    checkboxes.push(checkbox);

    const content = document.createElement("div");
    const text = document.createElement("span");
    text.classList.add("text");
    text.textContent = sections[i].name;
    const num_pass = document.createElement("span");
    num_pass.classList.add("num-pass");
    num_pass.classList.add("text");
    num_pass.textContent = `${count(data.sessions[current_session].play[i], "1")}`;
    pass_input_num.push(num_pass);
    const passRatePercentage =
      (data.sessions[current_session].n != 0
        ? count(data.sessions[current_session].play[i], "1") /
          data.sessions[current_session].n
        : 0) * 100;
    let pass_rate = createPassRateIndicator(passRatePercentage);
    pass_rate.classList.add("pass-rate");
    let evaluation = createEvaluationIndicator(
      data.sessions[current_session].play[i],
    );
    evaluation.classList.add("evaluation");

    const check = document.createElement("span");
    check.classList.add("check");
    check.textContent = "通過";
    content.classList.add("content");
    content.appendChild(text);
    content.appendChild(num_pass);
    content.appendChild(pass_rate);
    content.appendChild(evaluation);
    content.appendChild(check);

    const label = document.createElement("label");
    label.classList.add("toggle-note");
    label.appendChild(checkbox);
    label.appendChild(content);
    note_grid.appendChild(label);

    const refreshOnCheck = (isSaving) => {
      const before = pass_input[i];
      pass_input[i] = checkbox.checked ? 1 : 0;

      const change = pass_input[i] - before;
      const pass_current = pass_input_num[i].textContent / 1 + change;
      const n_current = data.sessions[current_session].n + change;
      pass_input_num[i].textContent = `${pass_current}`;

      const newPassRatePercentage =
        (n_current > 0 ? pass_current / n_current : 0) * 100;
      pass_rate.updatePassRate(newPassRatePercentage);

      let playStrToEvaluate;
      if (isSaving) {
        playStrToEvaluate = data.sessions[current_session].play[i];
      } else if (change == 0) {
        playStrToEvaluate = data.sessions[current_session].play[i];
      } else if (change == -1) {
        playStrToEvaluate = data.sessions[current_session].play[i];
      } else {
        playStrToEvaluate = data.sessions[current_session].play[i] + "1";
      }

      evaluation.updateEvaluation(playStrToEvaluate);
    };

    refresh.push(refreshOnCheck);

    checkbox.addEventListener("change", () => {
      refreshOnCheck();
    });
  }

  const btn = document.createElement("div");
  btn.classList.add("btn");
  btn.textContent = "記録";
  const uncheck = () => {
    checkboxes.forEach((element) => {
      element.checked = false;
    });
    pass_input = pass_input.map(() => 0);
  };
  btn.addEventListener("click", () => {
    add(pass_input);
    refresh.forEach((f) => f(true));
    uncheck();
  });
  note_grid.appendChild(btn);
  session_now.appendChild(note_grid);
}

function createPastSessions() {
  for (
    let sessionIndex = 0;
    sessionIndex < data.sessions.length;
    sessionIndex++
  ) {
    if (sessionIndex == current_session) continue;
    const session = data.sessions[sessionIndex];
    const past_session_div = document.createElement("div");
    past_session_div.classList.add("past-session");
    const total_plays = session.n;
    const session_header = document.createElement("div");
    session_header.classList.add("session");
    session_header.textContent = `${data.sessions[sessionIndex].name || "セッション" + (sessionIndex + 1)} - ${session.date}　　総プレイ: ${total_plays}`;
    past_session_div.appendChild(session_header);

    const past_grid = document.createElement("div");
    past_grid.classList.add("note-grid");
    for (let i = 0; i < sections.length; i++) {
      const pass_count = count(session.play[i], "1");

      const dummy_checkbox = document.createElement("input");
      dummy_checkbox.type = "checkbox";
      dummy_checkbox.disabled = true;

      const content = document.createElement("div");
      const text = document.createElement("span");
      text.classList.add("text");
      text.textContent = sections[i].name;

      const num_pass = document.createElement("span");
      num_pass.classList.add("num-pass");
      num_pass.classList.add("text");
      num_pass.textContent = `${pass_count}`;

      const passRatePercentage =
        (total_plays != 0 ? pass_count / total_plays : 0) * 100;
      const pass_rate = createPassRateIndicator(passRatePercentage);
      pass_rate.classList.add("pass-rate");

      const evaluation = createEvaluationIndicator(session.play[i]);
      evaluation.classList.add("evaluation");

      const check = document.createElement("span");
      check.classList.add("check");
      content.classList.add("content");
      content.appendChild(text);
      content.appendChild(num_pass);
      content.appendChild(pass_rate);
      content.appendChild(evaluation);
      content.appendChild(check);

      const label = document.createElement("label");
      label.classList.add("toggle-note");
      label.appendChild(dummy_checkbox);
      label.appendChild(content);
      past_grid.appendChild(label);
    }
    past_session_div.appendChild(past_grid);
    session_past.appendChild(past_session_div);
  }
}

function createNewSessionUI() {
  const container = document.getElementById("new-session-container");

  const wrapper = document.createElement("div");
  wrapper.classList.add("new-session-wrapper");

  const label = document.createElement("span");
  label.classList.add("new-session-label");
  label.textContent = "新しいセッション";

  const input = document.createElement("input");
  input.type = "text";
  input.id = "new-session-input";
  input.classList.add("new-session-input");
  input.placeholder = "セッション" + (data.sessions.length + 1);

  const button = document.createElement("button");
  button.classList.add("new-session-btn");
  button.textContent = "+";
  button.addEventListener("click", () => {
    startNewSession(input.value);
  });

  input.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      startNewSession(input.value);
    }
  });

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  wrapper.appendChild(button);
  container.appendChild(wrapper);
}

function startNewSession(name) {
  const message = `現在のセッション(${data.sessions[current_session].name || "セッション" + (current_session + 1)})を終了しますか？<br>終了後、新しいセッション(${name || "セッション" + (current_session + 2)})が開始されます。`;
  showModal(message, () => {
    const newSession = {
      date: getDate(),
      timestamp: Date.now(),
      play: data.sections.map(() => ""),
      n: 0,
    };
    if (name) {
      newSession.name = name;
    }
    data.sessions.push(newSession);
    current_session = data.sessions.length - 1;
    saveData(data);
    location.reload();
  });
}

function showModal(message, onConfirm) {
  const overlay = document.getElementById("modal-overlay");
  const message_e = document.getElementById("modal-message");
  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn = document.getElementById("modal-cancel");

  message_e.innerHTML = message;

  const handleConfirm = () => {
    overlay.classList.remove("active");
    confirmBtn.removeEventListener("click", handleConfirm);
    cancelBtn.removeEventListener("click", handleCancel);
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    overlay.classList.remove("active");
    confirmBtn.removeEventListener("click", handleConfirm);
    cancelBtn.removeEventListener("click", handleCancel);
    overlay.removeEventListener("click", handleOverlayClick);
  };

  const handleOverlayClick = (event) => {
    if (event.target === overlay) {
      handleCancel();
    }
  };

  confirmBtn.addEventListener("click", handleConfirm);
  cancelBtn.addEventListener("click", handleCancel);
  overlay.addEventListener("click", handleOverlayClick);
  overlay.classList.add("active");
}

function createNavsUI() {
  for (const title of chart_titles) {
    const btn_nav = document.createElement("div");

    if (title == hash) {
      const dot = document.createElement("span");
      dot.textContent = "●　　";
      dot.classList.add("session-dot");
      btn_nav.appendChild(dot);
      const text = document.createElement("span");
      text.textContent = title;
      text.classList.add("nav-title");
      btn_nav.appendChild(text);
    } else {
      btn_nav.textContent = title;
    }

    btn_nav.classList.add("modal-nav-btn");

    document.getElementById("modal-row").appendChild(btn_nav);
  }
}
// ロード時のみ
function createNewLogUI() {
  const container = document.getElementById("chart-new-container");
  const wrapper = document.createElement("div");
  wrapper.classList.add("new-session-wrapper");

  const label = document.createElement("span");
  label.classList.add("new-session-label");
  label.textContent = "新しい記録";

  const input = document.createElement("input");
  input.type = "text";
  input.classList.add("new-session-input");
  input.placeholder = "譜面" + (chart_titles.length + 1);

  const button = document.createElement("button");
  button.classList.add("new-session-btn");
  button.textContent = "+";
  button.addEventListener("click", () => {
    createNewLog(input.value);
  });

  input.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      createNewLog(input.value);
    }
  });

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  wrapper.appendChild(button);
  container.appendChild(wrapper);
}

function showNavModal() {
  const overlay = document.getElementById("modal-nav-overlay");
  const modal_row = document.getElementById("modal-row");
  const btn_close = document.getElementById("close-nav");

  const handleCloseClick = (event) => {
    if (event.target == overlay) handleCancel();
  };

  const handleOverlayClick = (event) => {
    if (event.target == overlay) handleCancel();
  };

  const handleCancel = () => {
    overlay.classList.remove("active");
    btn_close.removeEventListener("click", handleCloseClick);
    overlay.removeEventListener("click", handleOverlayClick);
  };

  overlay.classList.add("active");
  overlay.addEventListener("click", handleOverlayClick);
}

function createNewLog(title) {
  const data = { title: title };
}

