const themeToggle = document.getElementById('themeToggle');
const addTestBtn = document.getElementById('addTestBtn');
const publicTestsNode = document.getElementById('publicTests');
const hiddenTestsNode = document.getElementById('hiddenTests');
const runBtn = document.getElementById('runBtn');
const submitBtn = document.getElementById('submitBtn');
const publicPassedNode = document.getElementById('publicPassed');
const publicTotalNode = document.getElementById('publicTotal');
const hiddenPassedNode = document.getElementById('hiddenPassed');
const hiddenTotalNode = document.getElementById('hiddenTotal');
const finalScoreNode = document.getElementById('finalScore');
const resultLog = document.getElementById('resultLog');
const codeInput = document.getElementById('codeInput');
const timeLimitInput = document.getElementById('timeLimit');
const scoreInput = document.getElementById('scoreValue');
const testCaseTemplate = document.getElementById('testCaseTemplate');
const tabButtons = document.querySelectorAll('.tab-btn');

function createTestCase(type) {
  const card = testCaseTemplate.content.firstElementChild.cloneNode(true);
  const label = card.querySelector('.case-label');
  label.textContent = `${type === 'public' ? 'Public' : 'Hidden'} case #${getTestCount(type) + 1}`;
  const removeButton = card.querySelector('.remove-case');
  removeButton.addEventListener('click', () => {
    card.remove();
    updateTotals();
  });
  return card;
}

function getTestCount(type) {
  return type === 'public'
    ? publicTestsNode.querySelectorAll('.test-case-card').length
    : hiddenTestsNode.querySelectorAll('.test-case-card').length;
}

function addTest(type = 'public') {
  const target = type === 'public' ? publicTestsNode : hiddenTestsNode;
  const card = createTestCase(type);
  target.appendChild(card);
  updateTotals();
}

function updateTotals() {
  publicTotalNode.textContent = getTestCount('public');
  hiddenTotalNode.textContent = getTestCount('hidden');
}

function getTests(type) {
  const container = type === 'public' ? publicTestsNode : hiddenTestsNode;
  return Array.from(container.querySelectorAll('.test-case-card')).map((card) => ({
    input: card.querySelector('.case-input').value.trim(),
    expected: card.querySelector('.case-output').value.trim(),
  }))
  .filter((item) => item.input.length || item.expected.length);
}

function parseOutput(raw) {
  return raw
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length);
}

function buildResultEntry(title, passed, total, details = []) {
  const entry = document.createElement('div');
  entry.className = `result-entry ${passed === total ? 'success' : 'fail'}`;
  entry.innerHTML = `
    <strong>${title}</strong>
    <div>${passed}/${total} passed</div>
  `;
  if (details.length) {
    const list = document.createElement('div');
    list.style.marginTop = '10px';
    details.forEach((detail) => {
      const detailNode = document.createElement('div');
      detailNode.textContent = detail;
      list.appendChild(detailNode);
    });
    entry.appendChild(list);
  }
  resultLog.prepend(entry);
}

function runTests(type) {
  const tests = getTests(type);
  const code = codeInput.value.trim();
  const timeLimit = Number(timeLimitInput.value) || 1;
  const passedResults = [];
  let passedCount = 0;

  tests.forEach((test, index) => {
    const actual = simulateJava(code, test.input, timeLimit);

    let passed = false;
    let message = '';

    if (actual.timedOut) {
      message = `Case ${index + 1}: Timeout after ${timeLimit}s.`;
    } else if (actual.error) {
      message = `Case ${index + 1}: Error -> ${actual.error}`;
    } else {
      const actualLines = parseOutput(actual.output);
      const expectedLines = parseOutput(test.expected);
      passed = actualLines.length === expectedLines.length && actualLines.every((value, idx) => value === expectedLines[idx]);
      message = `Case ${index + 1}: ${passed ? 'Passed' : 'Failed'} | expected: ${expectedLines.join(' | ')} | got: ${actualLines.join(' | ')}`;
    }

    if (passed) {
      passedCount += 1;
    }
    passedResults.push({ passed, message });
  });

  return { passedCount, total: tests.length, passedResults };
}

function simulateJava(code, input, timeLimit) {
  if (!code) {
    return { output: '', error: 'No code entered', timedOut: false };
  }

  const hasPrint = /System\.out\.println\(|System\.out\.print\(/.test(code);
  const hasInput = /Scanner|BufferedReader|InputStreamReader/.test(code);
  const lines = input.split(/\r?\n/).filter(Boolean);
  const firstLine = lines[0] || '';

  let output = '';
  try {
    if (!hasPrint) {
      return { output: '', error: 'No output statement detected', timedOut: false };
    }

    if (/reverse\(/.test(code) && lines.length) {
      output = firstLine.split('').reverse().join('');
    } else if (/toUpperCase\(\)/.test(code) && lines.length) {
      output = firstLine.toUpperCase();
    } else if (/toLowerCase\(\)/.test(code) && lines.length) {
      output = firstLine.toLowerCase();
    } else if (/\+/.test(code) && lines.length >= 2) {
      const numbers = lines.map((value) => Number(value));
      if (numbers.every(Number.isFinite)) {
        output = String(numbers.reduce((sum, current) => sum + current, 0));
      } else {
        output = firstLine;
      }
    } else {
      output = firstLine;
    }
  } catch (err) {
    return { output: '', error: err.message, timedOut: false };
  }

  return { output, error: '', timedOut: false };
}

function renderResults(type, result) {
  const title = type === 'public' ? 'Public test execution' : 'Hidden test submission';
  const details = result.passedResults.map((detail) => detail.message);
  buildResultEntry(title, result.passedCount, result.total, details);

  if (type === 'public') {
    publicPassedNode.textContent = result.passedCount;
    publicTotalNode.textContent = result.total;
  } else {
    hiddenPassedNode.textContent = result.passedCount;
    hiddenTotalNode.textContent = result.total;
  }

  const scoreEach = Number(scoreInput.value) || 0;
  const score = type === 'public'
    ? result.passedCount * scoreEach / Math.max(result.total, 1)
    : result.passedCount === result.total && result.total > 0
      ? scoreEach
      : 0;
  const currentScore = Number(finalScoreNode.textContent) || 0;
  finalScoreNode.textContent = Math.round(Math.max(currentScore, score));
}

runBtn.addEventListener('click', () => {
  const result = runTests('public');
  renderResults('public', result);
});

submitBtn.addEventListener('click', () => {
  const result = runTests('hidden');
  renderResults('hidden', result);
  if (result.passedCount === result.total && result.total > 0) {
    buildResultEntry('Challenge complete! All hidden testcases passed.', result.passedCount, result.total, ['Success: Full completion achieved']);
  }
});

addTestBtn.addEventListener('click', () => {
  const activeTab = document.querySelector('.tab-btn.active');
  const type = activeTab?.dataset.target === 'hiddenTests' ? 'hidden' : 'public';
  addTest(type);
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    document.querySelectorAll('.test-list').forEach((panel) => panel.classList.remove('visible'));
    document.getElementById(button.dataset.target).classList.add('visible');
  });
});

themeToggle.addEventListener('click', () => {
  const root = document.documentElement;
  const isDark = root.getAttribute('data-theme') === 'dark';
  root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  themeToggle.textContent = isDark ? 'Dark mode' : 'Light mode';
});

window.addEventListener('load', () => {
  addTest('public');
  addTest('hidden');
  updateTotals();
});
