// "Book a Consult" calendar. Adapted from the LA Bot Shows booking calendar (labotshows.com),
// keeping its calendar -> contact info -> thank-you flow but with pricing, add-ons and the
// show-details panel removed. Builds its own modal markup; call window.openConsultCalendar().
(function () {
  var MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  var WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Consults can be booked any day of the week, between these hours (the start of the last slot is 8 PM).
  var FIRST_HOUR = 6;   // 6 AM
  var LAST_HOUR = 20;   // 8 PM

  // Where consult requests are sent (opens the visitor's email app with the details filled in).
  // Set the address here (or define window.CONSULT_EMAIL before this script loads).
  var CONSULT_EMAIL = window.CONSULT_EMAIL || "";

  function formatHour(h) { return (h % 12 || 12) + ":00 " + (h < 12 ? "AM" : "PM"); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function isSameDay(a, b) {
    return !!a && !!b && a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function isSameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

  function buildMonthGrid(month) {
    var first = new Date(month.getFullYear(), month.getMonth(), 1);
    var start = new Date(first);
    start.setDate(start.getDate() - first.getDay());
    var days = [];
    for (var i = 0; i < 42; i++) {
      var d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }

  function overlayEl(id, html) {
    var el = document.createElement("div");
    el.id = id;
    el.className = "calendar-overlay";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  }

  var CHEVRON = function (d) {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  };

  function init() {
    var overlay = overlayEl("calendar-overlay",
      '<div class="booking-layout" id="booking-layout">' +
      '<div class="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="calendar-title">Book a Consult</h2>' +
      '    <button type="button" class="calendar-close" id="calendar-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <div class="calendar-nav">' +
      '    <button type="button" class="calendar-nav-btn" id="calendar-prev" aria-label="Previous month">' + CHEVRON("M15 18l-6-6 6-6") + "</button>" +
      '    <span class="calendar-month-label" id="calendar-month-label" aria-live="polite"></span>' +
      '    <button type="button" class="calendar-nav-btn" id="calendar-next" aria-label="Next month">' + CHEVRON("M9 18l6-6-6-6") + "</button>" +
      "  </div>" +
      '  <div class="calendar-weekdays" id="calendar-weekdays"></div>' +
      '  <div class="calendar-grid" id="calendar-grid" role="grid"></div>' +
      '  <div class="calendar-footer calendar-footer-center">' +
      '    <span id="calendar-picked">Pick a date</span>' +
      "  </div>" +
      "</div>" +
      '<aside class="calendar-modal time-panel" aria-labelledby="time-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="time-title">Pick a Time</h2>' +
      "  </div>" +
      '  <p class="time-sub" id="time-sub"></p>' +
      '  <div class="time-grid" id="time-grid" role="listbox" aria-label="Available times"></div>' +
      '  <div class="calendar-footer time-footer">' +
      '    <button type="button" class="calendar-confirm-btn" id="calendar-continue" disabled>Continue</button>' +
      "  </div>" +
      "</aside>" +
      "</div>");
    var layout = overlay.querySelector("#booking-layout");
    var timeGrid = overlay.querySelector("#time-grid");
    var timeSub = overlay.querySelector("#time-sub");
    var monthLabel = overlay.querySelector("#calendar-month-label");
    var weekdaysEl = overlay.querySelector("#calendar-weekdays");
    var gridEl = overlay.querySelector("#calendar-grid");
    var picked = overlay.querySelector("#calendar-picked");
    var continueBtn = overlay.querySelector("#calendar-continue");
    var closeBtn = overlay.querySelector("#calendar-close");

    var phoneOverlay = overlayEl("phone-overlay",
      '<div class="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="phone-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="phone-title">Your Contact Info</h2>' +
      '    <button type="button" class="calendar-close" id="phone-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <p class="phone-helper">So we can reach out and confirm the details with you.</p>' +
      '  <input type="text" id="name-input" class="phone-input" placeholder="Your name" autocomplete="name" />' +
      '  <input type="tel" id="phone-input" class="phone-input" placeholder="(555) 123-4567" autocomplete="tel" />' +
      '  <div class="calendar-footer">' +
      '    <span id="phone-error" class="phone-error"></span>' +
      '    <button type="button" class="calendar-confirm-btn" id="phone-send">Send</button>' +
      "  </div>" +
      "</div>");
    var phoneClose = phoneOverlay.querySelector("#phone-close");
    var nameInput = phoneOverlay.querySelector("#name-input");
    var phoneInput = phoneOverlay.querySelector("#phone-input");
    var phoneError = phoneOverlay.querySelector("#phone-error");
    var phoneSend = phoneOverlay.querySelector("#phone-send");

    var thankYou = overlayEl("thankyou-overlay",
      '<div class="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="thankyou-title">' +
      '  <div class="calendar-modal-header">' +
      '    <h2 id="thankyou-title">Thank You!</h2>' +
      '    <button type="button" class="calendar-close" id="thankyou-close" aria-label="Close">&times;</button>' +
      "  </div>" +
      '  <p class="thankyou-message">Your email app should have opened with your request filled in. <strong>Press send there to finish.</strong> Please allow up to 24 hours for a reply.</p>' +
      '  <div class="reach-fallback">' +
      '    <p class="reach-label">Email app didn\'t open?</p>' +
      '    <div class="reach-actions">' +
      '      <a class="calendar-secondary-btn" id="reach-gmail" target="_blank" rel="noopener">Open in Gmail</a>' +
      '      <button type="button" class="calendar-secondary-btn" id="reach-copy">Copy details</button>' +
      "    </div>" +
      '    <p class="reach-address" id="reach-address"></p>' +
      "  </div>" +
      '  <div class="calendar-footer thankyou-footer">' +
      '    <button type="button" class="calendar-confirm-btn" id="thankyou-ok">Close</button>' +
      "  </div>" +
      "</div>");
    var thankYouClose = thankYou.querySelector("#thankyou-close");
    var thankYouOk = thankYou.querySelector("#thankyou-ok");
    var reachGmail = thankYou.querySelector("#reach-gmail");
    var reachCopy = thankYou.querySelector("#reach-copy");
    var reachAddress = thankYou.querySelector("#reach-address");
    var lastMessage = null;

    var today = startOfDay(new Date());
    var displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var selectedDate = null;
    var selectedHour = null;
    var lastFocused = null;

    WEEKDAYS.forEach(function (label) {
      var span = document.createElement("span");
      span.textContent = label;
      weekdaysEl.appendChild(span);
    });

    function slotAvailable(date, h) {
      if (h < FIRST_HOUR || h > LAST_HOUR) return false;
      var start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h);
      return start.getTime() > Date.now();
    }

    function renderTimes() {
      layout.classList.toggle("has-date", !!selectedDate);
      var keep = timeGrid.scrollTop, dateKey = selectedDate ? selectedDate.toDateString() : "";
      var sameDate = timeGrid.dataset.date === dateKey;
      timeGrid.innerHTML = "";
      timeGrid.dataset.date = dateKey;
      if (!selectedDate) return;
      timeSub.textContent = selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
      if (selectedHour !== null && !slotAvailable(selectedDate, selectedHour)) selectedHour = null;
      for (var h = 0; h < 24; h++) {
        (function (hour) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "time-slot";
          btn.textContent = formatHour(hour);
          btn.setAttribute("role", "option");
          if (hour === selectedHour) { btn.classList.add("is-selected"); btn.setAttribute("aria-selected", "true"); }
          if (!slotAvailable(selectedDate, hour)) btn.disabled = true;
          else btn.addEventListener("click", function () { selectedHour = hour; render(); });
          timeGrid.appendChild(btn);
        })(h);
      }
      // Keep the scroll position while picking a time; for a newly chosen date, start at the first open slot.
      if (sameDate) timeGrid.scrollTop = keep;
      else {
        var first = timeGrid.querySelector(".time-slot:not(:disabled)");
        timeGrid.scrollTop = first ? Math.max(0, first.offsetTop - 4) : 0;
      }
    }

    function render() {
      monthLabel.textContent = MONTH_NAMES[displayedMonth.getMonth()] + " " + displayedMonth.getFullYear();
      gridEl.innerHTML = "";
      buildMonthGrid(displayedMonth).forEach(function (date) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calendar-day";
        btn.innerHTML = '<span class="calendar-day-number">' + date.getDate() + "</span>";
        btn.setAttribute("aria-label", date.toDateString());
        if (!isSameMonth(date, displayedMonth)) btn.classList.add("is-outside");
        if (isSameDay(date, today)) btn.classList.add("is-today");
        if (isSameDay(date, selectedDate)) {
          btn.classList.add("is-selected");
          btn.setAttribute("aria-selected", "true");
        }
        if (date.getTime() < today.getTime()) {
          btn.disabled = true;
        } else {
          btn.addEventListener("click", function () { selectedDate = date; render(); });
        }
        gridEl.appendChild(btn);
      });
      renderTimes();
      continueBtn.disabled = !(selectedDate && selectedHour !== null);
      picked.textContent = !selectedDate ? "Pick a date"
        : selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
          (selectedHour !== null ? " · " + formatHour(selectedHour) : " · pick a time");
    }

    // The page uses this class to ignore its own keyboard shortcuts while a modal is open.
    function syncBodyState() {
      var open = [overlay, phoneOverlay, thankYou].some(function (el) { return el.classList.contains("is-open"); });
      document.body.classList.toggle("modal-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    }
    function show(el, focusEl) { el.classList.add("is-open"); el.setAttribute("aria-hidden", "false"); syncBodyState(); if (focusEl) focusEl.focus(); }
    function hide(el) { el.classList.remove("is-open"); el.setAttribute("aria-hidden", "true"); syncBodyState(); }

    function openCalendar() {
      lastFocused = document.activeElement;
      displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      selectedDate = null; selectedHour = null;
      render();
      show(overlay, closeBtn);
    }
    function closeCalendar() { hide(overlay); if (lastFocused && lastFocused.focus) lastFocused.focus(); }
    function openPhone() { phoneError.textContent = ""; show(phoneOverlay, nameInput); }
    function closePhone() { hide(phoneOverlay); }
    function closeThankYou() { hide(thankYou); if (lastFocused && lastFocused.focus) lastFocused.focus(); }

    // The request as an email: used for the mail app (mailto:), Gmail's compose page, and "Copy details".
    function buildMessage(name, phone) {
      var when = selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      return {
        subject: "Consult Request — " + selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) + ", " + formatHour(selectedHour),
        body: ["Requested date: " + when, "Requested time: " + formatHour(selectedHour), "", "Name: " + name, "Phone: " + phone].join("\n")
      };
    }
    function mailtoUrl(m) {
      return "mailto:" + CONSULT_EMAIL + "?subject=" + encodeURIComponent(m.subject) + "&body=" + encodeURIComponent(m.body);
    }
    function gmailUrl(m) {
      return "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(CONSULT_EMAIL) +
        "&su=" + encodeURIComponent(m.subject) + "&body=" + encodeURIComponent(m.body);
    }

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (thankYou.classList.contains("is-open")) closeThankYou();
      else if (phoneOverlay.classList.contains("is-open")) closePhone();
      else if (overlay.classList.contains("is-open")) closeCalendar();
    });

    overlay.querySelector("#calendar-prev").addEventListener("click", function () { displayedMonth = addMonths(displayedMonth, -1); render(); });
    overlay.querySelector("#calendar-next").addEventListener("click", function () { displayedMonth = addMonths(displayedMonth, 1); render(); });
    closeBtn.addEventListener("click", closeCalendar);
    overlay.addEventListener("click", function (e) { if (e.target === overlay || e.target === layout) closeCalendar(); });
    continueBtn.addEventListener("click", openPhone);

    phoneClose.addEventListener("click", closePhone);
    phoneOverlay.addEventListener("click", function (e) { if (e.target === phoneOverlay) closePhone(); });
    [nameInput, phoneInput].forEach(function (input) {
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") phoneSend.click(); });
    });
    phoneSend.addEventListener("click", function () {
      var name = nameInput.value.trim();
      if (!name) { phoneError.textContent = "Please enter your name."; nameInput.focus(); return; }
      if (phoneInput.value.replace(/\D/g, "").length < 7) { phoneError.textContent = "Please enter a valid phone number."; phoneInput.focus(); return; }
      lastMessage = buildMessage(name, phoneInput.value.trim());
      reachGmail.href = gmailUrl(lastMessage);
      reachAddress.innerHTML = CONSULT_EMAIL ? 'Or email <a href="mailto:' + CONSULT_EMAIL + '">' + CONSULT_EMAIL + "</a> directly." : "";
      reachCopy.textContent = "Copy details";
      window.location.href = mailtoUrl(lastMessage);   // opens the visitor's mail app
      closePhone();
      hide(overlay);
      show(thankYou, thankYouOk);
      selectedDate = null; selectedHour = null; nameInput.value = ""; phoneInput.value = "";
    });

    reachCopy.addEventListener("click", function () {
      if (!lastMessage) return;
      var text = (CONSULT_EMAIL ? "To: " + CONSULT_EMAIL + "\n" : "") + "Subject: " + lastMessage.subject + "\n\n" + lastMessage.body;
      var done = function () { reachCopy.textContent = "Copied!"; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { window.prompt("Copy these details:", text); });
      else window.prompt("Copy these details:", text);
    });
    thankYouClose.addEventListener("click", closeThankYou);
    thankYouOk.addEventListener("click", closeThankYou);
    thankYou.addEventListener("click", function (e) { if (e.target === thankYou) closeThankYou(); });

    window.openConsultCalendar = openCalendar;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
