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
      const checkedExtensions = data.checkedExtensions || []; // Set an empty array if not found
      const activeDays = data.activeDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const now = new Date();

      // Calculate isWithinActiveTimeRange based on the current time and options
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentMinutes = currentHour * 60 + currentMinute;
      const adjustedStartMinutes = getTotalMinutesSinceMidnight(`${startHour}:${startMinute} ${startAmPm}`);
      let adjustedEndMinutes = getTotalMinutesSinceMidnight(`${endHour}:${endMinute} ${endAmPm}`);

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
      const extensionsEnabled = isWithinActiveTimeRange && activeDays.includes(currentDay);


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
              })
              .catch((error) => {
                console.error(`Failed to set extension state for ${extensionId}:`, error);
              });
          }
        }

        // Update the extensionsEnabled value in the Chrome storage
        // Use the variable declared in the function scope to avoid conflict
        chrome.storage.local.set({ extensionsEnabled: extensionsEnabled }, function () {
          // Change the extension icon based on the toggle state
          const iconPath = isWithinActiveTimeRange ? 'images/icon-on.png' : 'images/icon-off.png';
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

  // Convert start and end times to 24-hour format
  let adjustedStartHour = convertTo24HourFormat(startHour, startAmPm);
  let adjustedEndHour = convertTo24HourFormat(endHour, endAmPm);


  // Get the current date and time
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Check if the current time is after both Start and End times
  const currentMinutes = currentHour * 60 + currentMinute;
  let adjustedStartMinutes = getTotalMinutesSinceMidnight(`${startHour}:${startMinute} ${startAmPm}`);
  let adjustedEndMinutes = getTotalMinutesSinceMidnight(`${endHour}:${endMinute} ${endAmPm}`);

  if (currentMinutes >= adjustedEndMinutes) {
    // If the current time is after the Start time, add 24 hours to the Start Hour
    adjustedEndHour += 24;
    adjustedEndMinutes = adjustedEndHour * 60 + endMinute;
  }

  if (currentMinutes >= adjustedStartMinutes) {
    // If the current time is after the End time, add 24 hours to the End Hour
    adjustedStartHour += 24;
    adjustedStartMinutes = adjustedStartHour * 60 + startMinute;
  }

  // Schedule the alarm for the start time
  const startDateTime = new Date();
  startDateTime.setHours(adjustedStartHour, startMinute, 0, 0);
  const startTimeStamp = startDateTime.getTime();


  chrome.alarms.create('extensionToggleAlarmStart', { when: startTimeStamp });

  // Schedule the alarm for the end time
  const endDateTime = new Date();
  endDateTime.setHours(adjustedEndHour, endMinute, 0, 0);
  const endTimeStamp = endDateTime.getTime();
  chrome.alarms.create('extensionToggleAlarmEnd', { when: endTimeStamp });

  chrome.alarms.getAll((alarms) => {
    console.log('Active Alarms:', alarms);
  });
}


// Add an event listener for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'extensionToggleAlarmStart' || alarm.name === 'extensionToggleAlarmEnd') {
    handleExtensionToggle(true, alarm.name);
  }
});

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
  }
});

// Add an event listener for the runtime.onStartup event
chrome.runtime.onStartup.addListener(() => {
  // This code will run when the browser is opened or restarted
  handleExtensionToggle();
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
