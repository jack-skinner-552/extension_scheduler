// background.js

// Function to convert time to 24-hour format
function convertTo24HourFormat(hour, amPm) {
  if (amPm === 'PM' && hour !== 12) {
    hour += 12;
  } else if (amPm === 'AM') {
    if (hour === 12) {
      hour = 0; // Special case for 12:00 AM
    }
  }
  return hour;
}

// Function to convert time to 12-hour format
function convertTo12HourFormat(hour) {
  const amPm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return { formattedHour, amPm };
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

  // Adjust the hours to 24-hour format based on AM/PM
  let adjustedHours = hours;
  if (amPm === 'PM' && hours !== 12) {
    adjustedHours += 12;
  } else if (amPm === 'AM' && hours === 12) {
    adjustedHours = 0;
  }

  const totalMinutes = adjustedHours * 60 + minutes;
  return totalMinutes;
}

// Function to handle extension toggling based on time
async function handleExtensionToggle(triggeredByAlarm = false) {
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
          const iconPath = isWithinActiveTimeRange ? 'icon-on.png' : 'icon-off.png';
          chrome.action.setIcon({ path: iconPath });
          const timestamp2 = new Date().toLocaleString();
          if (triggeredByAlarm && !extensionsEnabled) {
            handleExtensionToggle();
          }
        });
      });
    }
  );

  // Schedule the next toggle using the Alarm API only if it wasn't triggered by an alarm
  if (!triggeredByAlarm) {
    const nextToggleDelay = 30 * 1000; // Delay in milliseconds (30 seconds, adjust as needed)
    chrome.alarms.create('extensionToggleAlarm', { delayInMinutes: nextToggleDelay / 60000 });
  }
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
  const adjustedStartHour = convertTo24HourFormat(startHour, startAmPm);
  const adjustedEndHour = convertTo24HourFormat(endHour, endAmPm);

  const adjustedStartMinutes = getTotalMinutesSinceMidnight(`${startHour}:${startMinute} ${startAmPm}`);
  let adjustedEndMinutes = getTotalMinutesSinceMidnight(`${endHour}:${endMinute} ${endAmPm}`);

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
}


// Add an event listener for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'extensionToggleAlarmStart' || alarm.name === 'extensionToggleAlarmEnd') {
    handleExtensionToggle(true);
  }
});

// Add an event listener to receive messages from the options page
chrome.runtime.onMessage.addListener(function (message) {
  if (message.optionsUpdated) {
    // The options page notified about the options change
    // Let's update the extension's behavior accordingly
    chrome.storage.local.get(null, function (data) {
      // Schedule alarms for the updated start and end times
      scheduleAlarmsForStartAndEndTimes(data);

      // Trigger the extension toggle based on the new settings
      handleExtensionToggle();
    });
  }
});

// Function to handle the initial setup of alarms and extension toggling
function initialSetup() {
  // Retrieve the start and end times from the Chrome storage
  chrome.storage.local.get(
    ['startHour', 'startMinute', 'startAmPm', 'endHour', 'endMinute', 'endAmPm', 'checkedExtensions', 'extensionsEnabled', 'activeDays'],
    function (data) {
      // Schedule the initial alarms for start and end times
      scheduleAlarmsForStartAndEndTimes(data);

      // Start the periodic toggling of the extension
      handleExtensionToggle(data.extensionsEnabled);
    }
  );
}

// Retrieve the start and end times from the Chrome storage
chrome.storage.local.get(
  ['startHour', 'startMinute', 'startAmPm', 'endHour', 'endMinute', 'endAmPm', 'checkedExtensions', 'extensionsEnabled', 'activeDays'],
  function (data) {
    // Schedule the initial alarms for start and end times
    scheduleAlarmsForStartAndEndTimes(data);

    // Start the periodic toggling of the extension
    handleExtensionToggle(data.extensionsEnabled);
  }
);

// Start the initial setup when the extension is first loaded
initialSetup();
