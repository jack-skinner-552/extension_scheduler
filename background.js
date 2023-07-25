// background.js

// Function to convert time to 24-hour format
function convertTo24HourFormat(hour, amPm) {
  if (amPm === 'PM' && hour !== 12) {
    hour += 12;
  } else if (amPm === 'AM' && hour === 12) {
    hour = 0;
  }
  return hour;
}

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
async function handleExtensionToggle() {
  // Console Logs for debugging
//   console.log('handleExtensionToggle function called.');

  // Retrieve the start and end times from the Chrome storage
  chrome.storage.local.get(
    ['startHour', 'startMinute', 'startAmPm', 'endHour', 'endMinute', 'endAmPm', 'checkedExtensions', 'extensionsEnabled', 'activeDays'],
    async function (data) {
      const startHour = data.startHour || 8; // Set a default start hour if not found
      const startMinute = data.startMinute || 0; // Set a default start minute if not found
      const startAmPm = data.startAmPm || 'AM'; // Set a default start AM/PM if not found
      const endHour = data.endHour || 4; // Set a default end hour if not found
      const endMinute = data.endMinute || 0; // Set a default end minute if not found
      const endAmPm = data.endAmPm || 'PM'; // Set a default end AM/PM if not found
      const checkedExtensions = data.checkedExtensions || []; // Set an empty array if not found
      const activeDays = data.activeDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const now = new Date();

      // Set extensionsEnabled to true if not found
      const extensionsEnabled = data.extensionsEnabled === undefined ? true : data.extensionsEnabled;

      // Check if the current day of the week is within the active days
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const isDayActive = activeDays.includes(currentDay);

      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Convert start and end times to 24-hour format
      const adjustedStartHour = convertTo24HourFormat(startHour, startAmPm);
      const adjustedEndHour = convertTo24HourFormat(endHour, endAmPm);

      // Convert the adjusted end hour back to 12-hour format with AM/PM
      const { formattedHour: displayEndHour, amPm: displayEndAmPm } = convertTo12HourFormat(adjustedEndHour);

      // Console Logs for debugging
//       console.log('Active days:', activeDays);
//       console.log('Current day:', currentDay);
//
//       console.log('Current time:', currentHour + ':' + currentMinute);
//       console.log('Start time:', adjustedStartHour + ':' + startMinute + ' ' + startAmPm);
//       console.log('End time:', displayEndHour + ':' + endMinute + ' ' + displayEndAmPm);

      // Convert start and end times to minutes since midnight
      const adjustedStartMinutes = convertTo24HourFormat(startHour, startAmPm) * 60 + startMinute;
      let adjustedEndMinutes = convertTo24HourFormat(endHour, endAmPm) * 60 + endMinute;

      // Adjust the end time for the next day if it's before the start time
      if (adjustedEndMinutes < adjustedStartMinutes) {
        adjustedEndMinutes += 24 * 60; // Add 24 hours (in minutes) to adjust for the next day
      }


      const currentMinutes = currentHour * 60 + currentMinute;

      // Check if the current time is within the active time range and active days
      const isWithinActiveTimeRange = isDayActive && currentMinutes >= adjustedStartMinutes && currentMinutes < adjustedEndMinutes;


      // Console Logs for debugging
//       console.log('Current time in minutes:', currentMinutes);
//       console.log('Start time in minutes:', adjustedStartMinutes);
//       console.log('End time in minutes:', adjustedEndMinutes);
//       console.log('Is within active time range:', isWithinActiveTimeRange);

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
        chrome.storage.local.set({ extensionsEnabled: isWithinActiveTimeRange }, function () {
          // Console Log Times for debugging
          //console.log('extensionsEnabled updated in storage:', isWithinActiveTimeRange);
        });

        // Change the extension icon based on the toggle state
        const iconPath = isWithinActiveTimeRange ? 'icon-on.png' : 'icon-off.png';
        chrome.action.setIcon({ path: iconPath });

        // Schedule the next toggle after a delay of 30 seconds
        setTimeout(handleExtensionToggle, 30000);
      });
    }
  );
}

// Add an event listener to receive messages from the options page
chrome.runtime.onMessage.addListener(function (message) {
  if (message.optionsUpdated) {
    // The options page notified about the options change
    // Let's update the extension's behavior accordingly
    chrome.storage.local.get(null, function (data) {
      handleExtensionToggle(data);
    });
  }
});



// Start the periodic toggling of the extension
handleExtensionToggle();
