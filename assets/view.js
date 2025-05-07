CTFd._internal.challenge.data = undefined;
CTFd._internal.challenge.preRender = function() {};
CTFd._internal.challenge.postRender = async function() {
  await new Promise((resolve) => setTimeout(resolve, 1));
  challenge_id = CTFd.lib.$("#challenge-id").val();
  if (window["REGISTERED_HOOK"] !== true) {
    CTFd.lib.$("#challenge-window").on("keydown", logDigitKeypress);
    observeResponse();
  }
  window["REGISTERED_HOOK"] = true;
};

function logDigitKeypress(event) {
  if (/\d/.test(event.key)) {
    handleKeypress(event.key);
  } else if (event.key === "Enter" || event.key === "Backspace") {
    handleKeypress(event.key, 1);
  }
  cur_challenge_id = CTFd.lib.$("#challenge-id").val();
  if (cur_challenge_id !== challenge_id) {
    CTFd.lib.$("#challenge-window").off("keydown", logDigitKeypress);
    const notificationRow = document.querySelector(".row.notification-row");
    if (notificationRow) {
      const observer = new MutationObserver(() => {});
      observer.disconnect();
    }
  }
}

ROW_STATE = [];
MAX_LENGTH = 5;
if (window["REGISTERED_HOOK"] === undefined) {
  window["REGISTERED_HOOK"] = false;
}

function handleKeypress(key, action = 0) {
  const attemptsElement = document.querySelector("[x-text='attempts']");
  const maxAttemptsElement = document.querySelector("[x-text='max_attempts']");

  if (attemptsElement && maxAttemptsElement) {
    const attempts = parseInt(attemptsElement.textContent, 10);
    const maxAttempts = parseInt(maxAttemptsElement.textContent, 10);

    if (!isNaN(attempts) && !isNaN(maxAttempts) && attempts >= maxAttempts) {
      console.warn("Maximum attempts reached. Submission is disabled.");
      const observer = new MutationObserver(() => {});
      observer.disconnect();

      const notificationRow = document.querySelector(".row.notification-row");
      if (notificationRow) {
        const alertElement = notificationRow.querySelector(".alert");
        if (!alertElement) {
          const newAlert = document.createElement("div");
          newAlert.className = "d-block alert text-center w-100 mt-3 alert-danger";
          newAlert.innerHTML = "<strong>Maximum attempts reached. Submission is disabled. We hope you had fun :D</strong>";
          notificationRow.appendChild(newAlert);
        }
      }
      return;
    }
  }
  
  if (!action) {
    current_length = ROW_STATE.length;
    if (current_length < MAX_LENGTH) {
      ROW_STATE.push(key);
      addLetter(key, current_length);
    }
  } else if (action === 1) {
    if (key === "Enter") {
      // must have 5 digits, if not add data-state = shake on container
      if (ROW_STATE.length < MAX_LENGTH) {
        let container = CTFd.lib.$("#tile-container")[0];
        console.log(container);
        container.setAttribute("data-state", "shake");
        setTimeout(function() {
          container.removeAttribute("data-state");
        }, 1000);
        return;
      }
      CTFd.lib.$("#challenge-input").trigger("input");
    } else if (key === "Backspace") {
      ROW_STATE.pop();
      cell_items = CTFd.lib.$(".tile");
      cell_items[ROW_STATE.length].innerHTML = "";
      cell_items[ROW_STATE.length].setAttribute("data-state", "empty");
    }
  }
  CTFd.lib.$("#challenge-input").val(ROW_STATE.join(""));
}

function addLetter(digit, index) {
  cell_items = CTFd.lib.$(".tile");
  cell_items[index].innerHTML = digit;
  cell_items[index].setAttribute("data-state", "tbd");
  cell_items[index].setAttribute("data-animation", "pop");
  setTimeout(function() {
    cell_items[index].removeAttribute("data-animation");
  }, 100);
}

function revealLetter(digit, index, state = "") {
  cell_items = CTFd.lib.$(".tile");
  cell_items[index].innerHTML = digit;
  cell_items[index].classList.add("filled");
  cell_items[index].classList.remove("empty");
  cell_items[index].setAttribute("data-animation", "flip-in");
  setTimeout(function() {
    cell_items[index].removeAttribute("data-animation");
    cell_items[index].setAttribute("data-state", state);
    cell_items[index].setAttribute("data-animation", "flip-out");
  }, 250);
}

// 0 -> Absent, 1 -> Present, 2 -> Correct
async function revealLetters(result) {
  const state = ["absent", "present", "correct"];
  let win = true;
  for (let i = 0; i < result.length; i++) {
    if (result[i] != 2) {
      win = false;
    }
    setTimeout(function() {
      revealLetter(ROW_STATE[i], i, state[result[i]]);
    }, i * 250);
  }

  if (win) {
    setTimeout(function() {
      cell_items = CTFd.lib.$(".tile");
      for (let i = 0; i < cell_items.length; i++) {
        setTimeout(() => {
          cell_items[i].setAttribute("data-animation", "win");
        }, i * 100);
      }
    }, 1500);
  }
}

// This is really bad :D - I'm tired though so we'll have to live with the jankiness
function observeResponse() {
  const notificationRow = document.querySelector(".row.notification-row");

  if (!notificationRow) {
    console.error("Notification row not found!");
    return;
  }

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        const alertElement = notificationRow.querySelector(".alert");
        if (alertElement) {
          const message = alertElement.querySelector("strong")?.textContent;
          const status = alertElement.classList.contains("alert-success")
            ? "correct"
            : alertElement.classList.contains("alert-danger")
            ? "incorrect"
            : alertElement.classList.contains("alert-info")
            ? "already_solved"
            : alertElement.classList.contains("alert-warning")
            ? "paused"
            : "unknown";

          alertElement.style.display = "none";
          const nextFiveChars = message.split("|")[1]?.slice(0, 5);
          if (!nextFiveChars) {
            return;
          }
          revealLetters(nextFiveChars);
          observer.disconnect();

          const endMessage = {
            correct: "Congratulations, you got into the vault! We hope you had fun :D",
            incorrect: "Incorrect, you failed to get into the vault. We hope you had fun though :D",
          }

          if (endMessage[status] !== undefined) {
            setTimeout(() => {
              alertElement.style.display = "block";
              alertElement.querySelector("strong").textContent = endMessage[status];
            }, 2000);
          }
        }
      }
    }
  });

  observer.observe(notificationRow, { childList: true, subtree: true });
}
