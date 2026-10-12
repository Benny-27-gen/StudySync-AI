
(() => {
  'use strict';

  const STORAGE_KEY = 'studysync-ai-v1';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const todayISO = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  const dateFromISO = (iso) => {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDate = (iso) => {
    const d = dateFromISO(iso);
    return d
      ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
      : 'No date';
  };

  const dayDiff = (iso) => {
    const a = dateFromISO(todayISO());
    const b = dateFromISO(iso);
    if (!a || !b) return Infinity;
    return Math.round((b - a) / 86400000);
  };

  const escapeHTML = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  // APPLICATION DATA
  let state = { tasks: [], plan: null };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && Array.isArray(saved.tasks)) {
      state = { ...state, ...saved };
    }
  } catch {
    // Use fresh local state.
  }

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      showToast('Could not save data in this browser.');
    }
  };

  let toastTimer;

  function showToast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // NAVIGATION
  function setView(name) {
    $$('.view').forEach((v) =>
      v.classList.toggle('active', v.id === `${name}View`)
    );

    $$('.nav-item').forEach((b) =>
      b.classList.toggle('active', b.dataset.view === name)
    );

    const names = {
      dashboard: 'Overview',
      tasks: 'My assignments',
      planner: 'Smart planner',
      focus: 'Focus room'
    };

    $('#crumbTitle').textContent = names[name] || 'Overview';
    $('#sidebar').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (name === 'tasks') renderTasks();
  }

  $$('.nav-item').forEach((b) =>
    b.addEventListener('click', () => setView(b.dataset.view))
  );

  $$('[data-go]').forEach((b) =>
    b.addEventListener('click', () => setView(b.dataset.go))
  );

  $('#mobileMenu').addEventListener('click', () =>
    $('#sidebar').classList.toggle('open')
  );

  document.addEventListener('click', (e) => {
    if (
      window.innerWidth <= 820 &&
      $('#sidebar').classList.contains('open') &&
      !$('#sidebar').contains(e.target) &&
      !$('#mobileMenu').contains(e.target)
    ) {
      $('#sidebar').classList.remove('open');
    }
  });

  $('#todayLabel').textContent = new Date()
    .toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
    .toUpperCase();

  // ASSIGNMENT MANAGER
  function taskRow(task, compact = false) {
    const diff = dayDiff(task.due);

    const dueText = diff < 0
      ? `${Math.abs(diff)}d overdue`
      : diff === 0
        ? 'Due today'
        : diff === 1
          ? 'Due tomorrow'
          : formatDate(task.due);

    return `<article class="task-row ${task.done ? 'done' : ''} ${
      diff < 0 && !task.done ? 'overdue' : ''
    }" data-task-row="${task.id}">
      <button class="task-check ${task.done ? 'checked' : ''}"
        data-action="toggle" data-id="${task.id}"
        aria-label="${task.done ? 'Mark pending' : 'Mark complete'}">
        ${task.done ? '✓' : ''}
      </button>
      <div class="task-main">
        <div class="task-title-line">
          <span class="task-title">${escapeHTML(task.title)}</span>
          <span class="priority ${escapeHTML(task.priority)}">
            ${escapeHTML(task.priority)}
          </span>
        </div>
        <div class="task-meta">${escapeHTML(task.subject)}${
          task.notes && !compact
            ? ` · ${escapeHTML(task.notes)}`
            : ''
        }</div>
      </div>
      <div class="task-side">
        <span class="due-date">${escapeHTML(dueText)}</span>
        ${
          compact
            ? ''
            : `<div class="task-actions">
                <button data-action="edit" data-id="${task.id}"
                  aria-label="Edit ${escapeHTML(task.title)}"
                  title="Edit">✎</button>
                <button data-action="delete" data-id="${task.id}"
                  aria-label="Delete ${escapeHTML(task.title)}"
                  title="Delete">×</button>
              </div>`
        }
      </div>
    </article>`;
  }

  function renderDashboard() {
    const total = state.tasks.length;
    const complete = state.tasks.filter((t) => t.done).length;
    const pending = total - complete;

    const soon = state.tasks.filter(
      (t) =>
        !t.done &&
        dayDiff(t.due) >= 0 &&
        dayDiff(t.due) <= 3
    ).length;

    const rate = total ? Math.round((complete / total) * 100) : 0;

    $('#totalTasks').textContent = total;
    $('#completedTasks').textContent = complete;
    $('#pendingTasks').textContent = `${pending} pending`;
    $('#completionRate').textContent = `${rate}% completion rate`;
    $('#completionBar').style.width = `${rate}%`;
    $('#dueSoon').textContent = soon;
    $('#navTaskCount').textContent = pending;

    const upcoming = state.tasks
      .filter((t) => !t.done)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 4);

    $('#upcomingList').innerHTML =
      upcoming.map((t) => taskRow(t, true)).join('');

    $('#upcomingEmpty').classList.toggle('hidden', upcoming.length > 0);
    $('#upcomingList').classList.toggle('hidden', upcoming.length === 0);
  }

  function renderTasks() {
    const search = $('#taskSearch').value.trim().toLowerCase();
    const filter = $('#taskFilter').value;
    const priority = $('#priorityFilter').value;

    const filtered = state.tasks
      .filter((t) =>
        (!search ||
          `${t.title} ${t.subject} ${t.notes || ''}`
            .toLowerCase()
            .includes(search)) &&
        (filter === 'all' ||
          (filter === 'completed' ? t.done : !t.done)) &&
        (priority === 'all' || t.priority === priority)
      )
      .sort((a, b) => (a.done - b.done) || a.due.localeCompare(b.due));

    $('#allTasksList').innerHTML =
      filtered.map((t) => taskRow(t, false)).join('');

    $('#allTasksEmpty').classList.toggle('hidden', filtered.length > 0);
    $('#allTaskCount').textContent =
      `${filtered.length} TASK${filtered.length === 1 ? '' : 'S'}`;

    $('#taskListSubtitle').textContent =
      `${filtered.length} shown · ${
        state.tasks.filter((t) => !t.done).length
      } pending overall`;

    $('#allTasksList').classList.toggle('hidden', filtered.length === 0);
  }

  function renderAll() {
    renderDashboard();
    renderTasks();
    persist();
  }

  function resetTaskForm() {
    $('#taskForm').reset();
    $('#taskId').value = '';
    $('#taskDue').value = todayISO();
    $('#taskPriority').value = 'Medium';
    $('#taskFormTitle').textContent = 'Create an assignment';
  }

  function showTaskForm(task = null) {
    resetTaskForm();

    if (task) {
      $('#taskId').value = task.id;
      $('#taskTitle').value = task.title;
      $('#taskSubject').value = task.subject;
      $('#taskDue').value = task.due;
      $('#taskPriority').value = task.priority;
      $('#taskNotes').value = task.notes || '';
      $('#taskFormTitle').textContent = 'Edit assignment';
    }

    $('#taskFormPanel').classList.remove('hidden');
    $('#taskTitle').focus();

    $('#taskFormPanel').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  $('#openTaskForm').addEventListener('click', () => showTaskForm());

  $('#closeTaskForm').addEventListener('click', () =>
    $('#taskFormPanel').classList.add('hidden')
  );

  $('#cancelTask').addEventListener('click', () =>
    $('#taskFormPanel').classList.add('hidden')
  );

  $('#taskForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const id = $('#taskId').value;

    const item = {
      id: id || `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      title: $('#taskTitle').value.trim(),
      subject: $('#taskSubject').value.trim(),
      due: $('#taskDue').value,
      priority: $('#taskPriority').value,
      notes: $('#taskNotes').value.trim(),
      done: false
    };

    if (!item.title || !item.subject || !item.due) {
      showToast('Please complete all required fields.');
      return;
    }

    if (id) {
      const old = state.tasks.find((t) => t.id === id);
      item.done = old ? old.done : false;
      state.tasks = state.tasks.map((t) => t.id === id ? item : t);
      showToast('Assignment updated.');
    } else {
      state.tasks.push(item);
      showToast('Assignment added.');
    }

    $('#taskFormPanel').classList.add('hidden');
    renderAll();
    setView('tasks');
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const task = state.tasks.find((t) => t.id === btn.dataset.id);
    if (!task) return;

    const action = btn.dataset.action;

    if (action === 'toggle') {
      task.done = !task.done;
      showToast(
        task.done
          ? 'Nice work — task completed!'
          : 'Task moved back to pending.'
      );
      renderAll();
    } else if (action === 'edit') {
      showTaskForm(task);
    } else if (action === 'delete') {
      if (confirm(`Delete “${task.title}”? This cannot be undone.`)) {
        state.tasks = state.tasks.filter((t) => t.id !== task.id);
        renderAll();
        showToast('Assignment deleted.');
      }
    }
  });

  ['taskSearch', 'taskFilter', 'priorityFilter'].forEach((id) => {
    $('#' + id).addEventListener(
      id === 'taskSearch' ? 'input' : 'change',
      renderTasks
    );
  });

  // SMART STUDY PLANNER
  $('#plannerForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const subjects = $('#plannerSubjects').value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!subjects.length) {
      showToast('Add at least one subject.');
      return;
    }

    const days = Number($('#planDays').value);
    const hours = Number($('#studyHours').value);
    const pref = $('#focusPreference').value;
    const unique = [...new Set(subjects)];

    const ordered = pref === 'difficult'
      ? [...unique].reverse()
      : pref === 'revision'
        ? [...unique.slice(1), unique[0]]
        : unique;

    const sessionsPerDay = Math.max(1, Math.floor(hours));
    const sessionDuration = 55;
    const start = new Date();
    const plan = [];

    for (let d = 0; d < days; d++) {
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + d);

      const sessions = [];

      for (let s = 0; s < sessionsPerDay; s++) {
        const subject = ordered[(d * sessionsPerDay + s) % ordered.length];

        const kind = pref === 'revision'
          ? (s % 2 ? 'Practice questions' : 'Active recall')
          : pref === 'difficult'
            ? (s === 0 ? 'Deep learning' : 'Practice and review')
            : (s % 2 ? 'Practice and examples' : 'Concept learning');

        const startMinutes = 9 * 60 + s * 60;
        const hour24 = Math.floor(startMinutes / 60);
        const minute = startMinutes % 60;
        const displayHour = hour24 % 12 || 12;
        const suffix = hour24 >= 12 ? 'PM' : 'AM';

        sessions.push({
          time: `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`,
          subject,
          kind,
          duration: sessionDuration
        });
      }

      plan.push({
        label: dayDate.toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'short'
        }),
        sessions
      });
    }

    state.plan = { subjects: unique, days, hours, pref, plan };
    persist();
    renderPlan();
    showToast('Your study plan is ready.');
  });

  function renderPlan() {
    if (!state.plan) return;

    const p = state.plan;

    $('#planDescription').textContent =
      `${p.days}-day plan · ${p.hours} hour${p.hours === 1 ? '' : 's'} per day · ${
        p.subjects.length
      } subject${p.subjects.length === 1 ? '' : 's'}`;

    $('#planOutput').innerHTML = p.plan.map((day, i) => `
      <section class="plan-day">
        <div class="plan-day-head">
          <strong>Day ${i + 1} · ${escapeHTML(day.label)}</strong>
          <span>${day.sessions.length} session${day.sessions.length === 1 ? '' : 's'}</span>
        </div>
        ${day.sessions.map((s) => `
          <div class="plan-session">
            <div class="session-time">
              ${s.time}<br/>
              <span style="color:#7180a0;font-weight:400">
                ${s.duration} min focus + 5 min recap
              </span>
            </div>
            <div class="session-content">
              <strong>${escapeHTML(s.subject)}</strong>
              <p>${escapeHTML(s.kind)} · End with a 5-minute recap.</p>
              <span class="session-tag">STUDY BLOCK</span>
            </div>
          </div>
        `).join('')}
      </section>
    `).join('');

    $('#printPlan').disabled = false;
  }

  $('#printPlan').addEventListener('click', () => window.print());

  // FOCUS ROOM TIMER
  // Each preset remembers its remaining time and running/paused state.

  const timerDefaults = {};

  $$('.preset').forEach((b) => {
    timerDefaults[b.dataset.mode] = Number(b.dataset.minutes) * 60;
  });

  if (!timerDefaults.focus) {
    timerDefaults.focus = 25 * 60;
  }

  let timerMode = 'focus';
  let timerDuration = timerDefaults[timerMode];
  let timerRemaining = timerDuration;
  let timerInterval = null;
  let timerRunning = false;
  let endAt = null;

  const timerStates = {};

  Object.keys(timerDefaults).forEach((mode) => {
    timerStates[mode] = {
      duration: timerDefaults[mode],
      remaining: timerDefaults[mode],
      wasRunning: false
    };
  });

  function saveTimerState() {
    timerStates[timerMode] = {
      ...(timerStates[timerMode] || {}),
      duration: timerDuration,
      remaining: timerRemaining
    };
  }

  function updateTimer() {
    const min = Math.floor(timerRemaining / 60);
    const sec = timerRemaining % 60;

    $('#timerDisplay').textContent =
      `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

    const ratio = timerDuration ? timerRemaining / timerDuration : 0;
    const degrees = Math.max(0, ratio * 360);

    $('#timerRing').style.background =
      `conic-gradient(from -90deg,#8297ff 0deg,#ad8bff ${degrees}deg,#30385b ${degrees}deg 360deg)`;

    $('#timerStart').innerHTML = timerRunning
      ? 'Pause session <span>Ⅱ</span>'
      : 'Resume session <span>▶</span>';

    $('#timerMode').textContent =
      timerMode === 'focus'
        ? 'FOCUS'
        : timerMode === 'short'
          ? 'SHORT BREAK'
          : 'LONG BREAK';

    $('#timerHint').textContent =
      timerMode === 'focus'
        ? 'One focused sprint'
        : 'Let your mind reset';

    $$('.preset').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === timerMode);
    });
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = null;
    timerRunning = false;
    endAt = null;

    saveTimerState();
    updateTimer();
  }

  function startTimerClock() {
    if (timerRemaining <= 0) {
      timerRemaining = timerDuration;
    }

    timerRunning = true;
    endAt = Date.now() + timerRemaining * 1000;
    timerStates[timerMode].wasRunning = true;
    timerInterval = setInterval(tickTimer, 250);

    updateTimer();
  }

  function tickTimer() {
    if (!endAt) return;

    timerRemaining = Math.max(
      0,
      Math.ceil((endAt - Date.now()) / 1000)
    );

    saveTimerState();
    updateTimer();

    if (timerRemaining <= 0) {
      timerStates[timerMode].wasRunning = false;
      stopTimer();
      timerStates[timerMode].wasRunning = false;

      $('#timerMessage').textContent =
        timerMode === 'focus'
          ? 'Session complete — take a short break.'
          : 'Break complete — ready for another sprint?';

      showToast(
        timerMode === 'focus'
          ? 'Focus session complete!'
          : 'Break complete!'
      );
    }
  }

  // Start or manually pause the selected timer.
  $('#timerStart').addEventListener('click', () => {
    if (timerRunning) {
      timerRemaining = Math.max(
        0,
        Math.ceil((endAt - Date.now()) / 1000)
      );

      timerStates[timerMode].wasRunning = false;
      stopTimer();
      timerStates[timerMode].wasRunning = false;

      $('#timerMessage').textContent =
        'Session paused. Pick up when you are ready.';

      return;
    }

    startTimerClock();

    $('#timerMessage').textContent =
      'You are in a session. Keep your attention on one thing.';
  });

  // Reset only the currently selected timer.
  $('#timerReset').addEventListener('click', () => {
    timerStates[timerMode].wasRunning = false;
    stopTimer();
    timerStates[timerMode].wasRunning = false;

    timerRemaining = timerDuration;
    saveTimerState();
    updateTimer();

    $('#timerMessage').textContent =
      'Timer reset. Start when you are ready.';
  });

  // Switch presets while preserving each timer's state.
  $$('.preset').forEach((b) => {
    b.addEventListener('click', () => {
      if (timerRunning && endAt) {
        // Save the running timer's exact remaining time.
        timerRemaining = Math.max(
          0,
          Math.ceil((endAt - Date.now()) / 1000)
        );

        timerStates[timerMode].wasRunning = timerRemaining > 0;

        if (timerInterval) clearInterval(timerInterval);

        timerInterval = null;
        timerRunning = false;
        endAt = null;

        saveTimerState();
      } else {
        saveTimerState();
      }

      const nextMode = b.dataset.mode;

      const saved = timerStates[nextMode] || {
        duration: timerDefaults[nextMode] || 25 * 60,
        remaining: timerDefaults[nextMode] || 25 * 60,
        wasRunning: false
      };

      timerMode = nextMode;
      timerDuration = saved.duration;
      timerRemaining = saved.remaining;
      timerRunning = false;
      endAt = null;

      // Automatically resume only if this timer was running before.
      if (saved.wasRunning && timerRemaining > 0) {
        startTimerClock();

        $('#timerMessage').textContent =
          'Your previous session has resumed.';
      } else {
        updateTimer();

        $('#timerMessage').textContent =
          'Timer ready. Start when you are ready.';
      }
    });
  });

  // INITIALIZE APP
  renderAll();

  if (state.plan) {
    renderPlan();
  }

  updateTimer();
})();
