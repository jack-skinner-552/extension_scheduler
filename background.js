// background.js


// Function to convert time to 24-hour format
function convertTo24HourFormat(hour, amPm) {
  if (amPm === 'PM' && hour !== 12) {
    return hour + 12;
  } else if (amPm === 'AM' && hour === 12) {
    return 0;
  }
  return hour;
}

// Function to enable/disable an extension using a promise-based wrapper
function setExtensionState(extensionId, enabled) {
  if (extensionId === chrome.runtime.id) {
    // Skip toggling the extension itself
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    chrome.management.setEnabled(extensionId, enabled, () => {
      if (chrome.runtime.lastError) {
        reject(`Failed to set extension state for ${extensionId}: ${chrome.runtime.lastError.message}`);
      } else {
        resolve();
      }
    });
  });
}

let checkedExtensions = [];
let extensionsEnabled = false;

// Function to get the total minutes since midnight from a time in 12-hour format (HH:mm AM/PM)
function getTotalMinutesSinceMidnight(timeString) {
  const [time, amPm] = timeString.split(' ');
  const [hours, minutes] = time.split(':').map(Number);

  const adjustedHours = convertTo24HourFormat(hours, amPm);
  const totalMinutes = adjustedHours * 60 + minutes;
  return totalMinutes;
}

// Function to handle extension toggling based on time
async function handleExtensionToggle(triggeredByAlarm = false, alarmName = '') {
  const timestamp1 = new Date().toLocaleString();
  // Console Logs for debugging
  console.log(`[${timestamp1}] handleExtensionToggle function called.`);

  // Retrieve the start and end times from the Chrome storage
  chrome.storage.local.get(
    ['startHour', 'startMinute', 'startAmPm', 'endHour', 'endMinute', 'endAmPm', 'checkedExtensions', 'activeDays'],
    function (data) {
      const startHour = data.startHour || 8; // Set a default start hour if not found
      const startMinute = data.startMinute || 0; // Set a default start minute if not found
      const startAmPm = data.startAmPm || 'AM'; // Set a default start AM/PM if not found
      const endHour = data.endHour || 4; // Set a default end hour if not found
      const endMinute = data.endMinute || 0; // Set a default end minute if not found
      const endAmPm = data.endAmPm || 'PM'; // Set a default end AM/PM if not found
      checkedExtensions = data.checkedExtensions || []; // Set an empty array if not found
      const activeDays = data.activeDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const now = new Date();

      // Calculate isWithinActiveTimeRange based on the current time and options
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentMinutes = currentHour * 60 + currentMinute;
      const adjustedStartMinutes = getTotalMinutesSinceMidnight(`${startHour}:${startMinute} ${startAmPm}`);
      let adjustedEndMinutes = getTotalMinutesSinceMidnight(`${endHour}:${endMinute} ${endAmPm}`);

      //console.log("currentMinutes:", currentMinutes);
      //console.log("adjustedStartMinutes:", adjustedStartMinutes);
      //console.log("adjustedEndMinutes:", adjustedEndMinutes);

      let isWithinActiveTimeRange = false;

      if (adjustedEndMinutes < adjustedStartMinutes) {
        // Two time ranges: from start time to midnight and from midnight to end time
        isWithinActiveTimeRange =
          (currentMinutes >= adjustedStartMinutes && currentMinutes <= 24 * 60) || // From start time to midnight
          (currentMinutes >= 0 && currentMinutes < adjustedEndMinutes); // From midnight to end time
      } else {
        // Normal time range
        isWithinActiveTimeRange = currentMinutes >= adjustedStartMinutes && currentMinutes < adjustedEndMinutes;
      }

      // Calculate extensionsEnabled based on isWithinActiveTimeRange and other conditions
      extensionsEnabled = isWithinActiveTimeRange && activeDays.includes(currentDay);


      // Get the current state of extensions
      chrome.management.getAll(function (extensions) {
        const error = chrome.runtime.lastError;
        if (error) {
          console.error('Error occurred while fetching extensions:', error);
          return;
        }

        for (const extension of extensions) {
          const extensionId = extension.id;

          if (extensionId === chrome.runtime.id) {
            // Skip toggling the extension itself
            continue;
          }

          // Check if the extension is in the list of selected extensions
          if (checkedExtensions.includes(extensionId)) {
            // If within active time range, enable the extension; otherwise, disable it
            const isEnabled = isWithinActiveTimeRange && extensionsEnabled;
            setExtensionState(extensionId, isEnabled)
              .then(() => {
                // Console Log for debugging
                //console.log(`Extension ${extensionId} is ${isEnabled ? 'enabled' : 'disabled'}.`);
              })
              .catch((error) => {
                console.error(`Failed to set extension state for ${extensionId}:`, error);
              });
          }
        }

        // Update the extensionsEnabled value in the Chrome storage
        // Use the variable declared in the function scope to avoid conflict
        chrome.storage.local.set({ extensionsEnabled: extensionsEnabled }, function () {
          // Console Log Times for debugging
          //console.log('extensionsEnabled updated in storage:', isWithinActiveTimeRange);

          // Change the extension icon based on the toggle state
          const iconPath = extensionsEnabled ? 'images/icon-on.png' : 'images/icon-off.png';
          chrome.action.setIcon({ path: iconPath });
          const timestamp2 = new Date().toLocaleString();
          if (triggeredByAlarm && !extensionsEnabled) {
            handleExtensionToggle();
          }
        });
      });

      if (triggeredByAlarm && (alarmName === 'extensionToggleAlarmEnd' || alarmName === 'extensionToggleAlarmStart')) {
        scheduleAlarmsForStartAndEndTimes(data);
      }
    }
  );
}

// Function to schedule the alarms for the start and end times
function scheduleAlarmsForStartAndEndTimes(data) {
  const startHour = parseInt(data.startHour) || 8; // Set a default start hour if not found
  const startMinute = data.startMinute || 0; // Set a default start minute if not found
  const startAmPm = data.startAmPm || 'AM'; // Set a default start AM/PM if not found
  const endHour = parseInt(data.endHour) || 4; // Set a default end hour if not found
  const endMinute = data.endMinute || 0; // Set a default end minute if not found
  const endAmPm = data.endAmPm || 'PM'; // Set a default end AM/PM if not found
  const activeDays = data.activeDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Convert start and end times to 24-hour format
  let adjustedStartHour = convertTo24HourFormat(startHour, startAmPm);
  let adjustedEndHour = convertTo24HourFormat(endHour, endAmPm);

  //console.log('adjustedStartHour:', adjustedStartHour);
  //console.log('adjustedEndHour:', adjustedEndHour);

  // Get the current date and time
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Find the index of the current day in the activeDays array
  const currentIndex = allDays.indexOf(currentDay);
  console.log("currentIndex:", currentIndex);

  // Calculate the index of the next active day
  let nextIndex = (currentIndex + 1);
  console.log("activeDays.length:", activeDays.length);

  // Find the next active day that exists in the activeDays array
  let nextActiveDay;
  while (true) {
    nextActiveDay = allDays[nextIndex % allDays.length];
    if (activeDays.includes(nextActiveDay)) {
      break;
    }
    nextIndex++;
  }

  console.log("nextIndex:", nextIndex);

  // Calculate the difference between currentIndex and nextIndex
  const indexDifference = nextIndex - currentIndex;

  // Calculate the hours between currentDay and nextActiveDay
  let hoursBetweenDays;
  if (indexDifference === 7) {
    // Only one day has been checked, set to 168 hours (7 days * 24 hours/day; next week, same day)
    hoursBetweenDays = 168;
  } else {
    hoursBetweenDays = (indexDifference + allDays.length) % allDays.length * 24;
  }

  if (nextIndex >= 7) {
    nextActiveDay = "next " + nextActiveDay;
  }

  console.log(`The next active day after ${currentDay} is ${nextActiveDay}.`);
  console.log(`Hours between ${currentDay} and ${nextActiveDay}: ${hoursBetweenDays} hours.`);

  // Check if the current time is after both Start and End times
  const currentMinutes = currentHour * 60 + currentMinute;
  let adjustedStartMinutes = getTotalMinutesSinceMidnight(`${startHour}:${startMinute} ${startAmPm}`);
  let adjustedEndMinutes = getTotalMinutesSinceMidnight(`${endHour}:${endMinute} ${endAmPm}`);

  if (currentMinutes >= adjustedEndMinutes) {
    // If the current time is after the Start time, add hoursBetweenDays to the Start Hour
    adjustedEndHour += hoursBetweenDays;
    adjustedEndMinutes = adjustedEndHour * 60 + endMinute;
  }

  if (currentMinutes >= adjustedStartMinutes) {
    // If the current time is after the End time, add hoursBetweenDays to the End Hour
    adjustedStartHour += hoursBetweenDays;
    adjustedStartMinutes = adjustedStartHour * 60 + startMinute;
  }

  //console.log('Current minutes since midnight:', currentMinutes)
  //console.log('Adjusted start time (minutes since midnight):', adjustedStartMinutes);
  //console.log('Adjusted end time (minutes since midnight):', adjustedEndMinutes);

  // Schedule the alarm for the start time
  const startDateTime = new Date();
  startDateTime.setHours(adjustedStartHour, startMinute, 0, 0);
  const startTimeStamp = startDateTime.getTime();
  console.log('Start time alarm will trigger at:', new Date(startTimeStamp).toLocaleString());
  chrome.alarms.create('extensionToggleAlarmStart', { when: startTimeStamp });

  // Schedule the alarm for the end time
  const endDateTime = new Date();
  endDateTime.setHours(adjustedEndHour, endMinute, 0, 0);
  const endTimeStamp = endDateTime.getTime();
  console.log('End time alarm will trigger at:', new Date(endTimeStamp).toLocaleString());
  chrome.alarms.create('extensionToggleAlarmEnd', { when: endTimeStamp });
}


// Add an event listener for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name); // Log the name of the triggered alarm
  if (alarm.name === 'extensionToggleAlarmStart' || alarm.name === 'extensionToggleAlarmEnd') {
    handleExtensionToggle(true, alarm.name);
  }
});

// Add an event listener to the onDisabled event
chrome.management.onDisabled.addListener(function(extensionInfo) {
  // Check if the disabled extension is in the list of checked extensions
  const extensionId = extensionInfo.id;
  const isCheckedExtension = checkedExtensions.includes(extensionId);

  // Check if extensionsEnabled is true
  if (isCheckedExtension && extensionsEnabled) {
    // Re-enable the extension
    setExtensionState(extensionId, true)
      .then(() => {
        // Console log for debugging
        //console.log(`Extension ${extensionId} was re-enabled.`);
      })
      .catch((error) => {
        console.error(`Failed to re-enable extension ${extensionId}:`, error);
      });
  }
});

// Add an event listener for the runtime.onInstalled event
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Create Options context menu item
    chrome.contextMenus.create({
      id: "optionsMenu",
      title: "Options",
      contexts: ["browser_action"],
      documentUrlPatterns: [`chrome-extension://${chrome.runtime.id}/*`]
    });
    // Perform actions when the extension is installed
    console.log('Extension installed!');

    // You can perform any setup or initialization here
    // For example, creating default settings, context menus, etc.

  } else if (details.reason === 'update') {
    // Perform actions when the extension is updated
    console.log(`Extension updated from version ${details.previousVersion} to version ${chrome.runtime.getManifest().version}.`);

    // You can perform any migration or update tasks here
    // For example, updating settings, modifying existing features, etc.
  }
});

// Function to capture and log console messages
function logConsoleMessages(message) {
  const logData = JSON.parse(message);
  console.log('Console log from extension:', logData.message);
  console.log('Data:', logData.data);
}

// Add an event listener to receive messages from the options page
chrome.runtime.onMessage.addListener(async function (message) {
  if (message.optionsUpdated) {
    // The options page notified about the options change
    // Let's update the extension's behavior accordingly
    const data = await new Promise((resolve) => {
      chrome.storage.local.get(
        ['startHour', 'startMinute', 'startAmPm', 'endHour', 'endMinute', 'endAmPm', 'checkedExtensions', 'extensionsEnabled', 'activeDays'],
        resolve
      );
    });

    // Schedule alarms for the updated start and end times
    scheduleAlarmsForStartAndEndTimes(data);

    // Trigger the extension toggle based on the new settings
    await handleExtensionToggle();
  } else if (message.logMessage) {
    logConsoleMessages(message.logMessage);
  }
});

// Add an event listener for the runtime.onStartup event
chrome.runtime.onStartup.addListener(() => {
  // This code will run when the browser is opened or restarted
  handleExtensionToggle();
});

// Add an event lisener for clicking on 'Options' in context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "optionsMenu") {
    // Open the options page here
    chrome.runtime.openOptionsPage();
  }
});


// Function to handle the initial setup of alarms and extension toggling
async function initialSetup() {
  // Retrieve the start and end times from the Chrome storage
  const data = await new Promise((resolve) => {
    chrome.storage.local.get(
      ['startHour', 'startMinute', 'startAmPm', 'endHour', 'endMinute', 'endAmPm', 'checkedExtensions', 'extensionsEnabled', 'activeDays'],
      resolve
    );
  });

  // Schedule the initial alarms for start and end times
  scheduleAlarmsForStartAndEndTimes(data);

  // Start the periodic toggling of the extension
  await handleExtensionToggle(data.extensionsEnabled);
}

// Start the initial setup when the extension is first loaded
initialSetup();
const nextToggleDelay = 30 * 1000; // Delay in milliseconds (30 seconds, adjust as needed);
setTimeout(() => {
  chrome.alarms.getAll((alarms) => {
    const now = new Date();

    for (const alarm of alarms) {
      if (alarm.scheduledTime <= now.getTime()) {
        // Trigger handleExtensionToggle with the alarm's name
        handleExtensionToggle(true, alarm.name);
      }
    }
  });

}, nextToggleDelay);

