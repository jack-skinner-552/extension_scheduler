// options.js

import { config } from './config.js';

// Function to get the service worker registration asynchronously
async function getServiceWorkerRegistration() {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.active : null;
}

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

// Function to update the active days checkboxes in the options UI
function updateActiveDaysCheckboxes(activeDays) {
  const activeDaysCheckboxes = document.querySelectorAll('.active-days-container input[type="checkbox"]');
  activeDaysCheckboxes.forEach(function (checkbox) {
    const day = checkbox.getAttribute('value');
    checkbox.checked = activeDays.includes(day);
  });
}

// Function to populate dropdown select element with options
function populateDropdown(selectId, start, end, defaultValue) {
  const select = document.getElementById(selectId);
  select.innerHTML = '';
  for (let i = start; i <= end; i++) {
    const option = document.createElement('option');
    const value = String(i).padStart(2, '0');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }

  // Handle special case for '12 PM'
  if (defaultValue === 12) {
    select.value = '12';
  } else {
    select.value = defaultValue;
  }
}

// Function to enable/disable an extension using a promise-based wrapper
function setExtensionState(extensionId, enabled) {
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

// Function to update checked extensions in Chrome storage
function updateCheckedExtensions(extensionId, enabled) {
  chrome.storage.local.get('checkedExtensions', function (data) {
    const checkedExtensions = data.checkedExtensions || [];

    if (enabled) {
      if (!checkedExtensions.includes(extensionId)) {
        checkedExtensions.push(extensionId);
      }
    } else {
      const index = checkedExtensions.indexOf(extensionId);
      if (index !== -1) {
        checkedExtensions.splice(index, 1);
      }
    }

    chrome.storage.local.set({ checkedExtensions: checkedExtensions }, function () {
      //console.log('Checked extensions updated.');
    });
  });
}

// Function to update the options on the HTML document
function updateDocumentOptions(options) {
  const checkedExtensions = options.checkedExtensions || [];
  const startHour = options.startHour || 8;
  const startMinute = options.startMinute || 0;
  const startAmPm = options.startAmPm || 'AM';
  const endHour = options.endHour || 4;
  const endMinute = options.endMinute || 0;
  const endAmPm = options.endAmPm || 'PM';

  // Update the extension checkboxes
  const extensionCheckboxes = document.querySelectorAll('#extensionList input[type="checkbox"]');
  extensionCheckboxes.forEach(function (checkbox) {
    const extensionId = checkbox.getAttribute('data-extension-id');
    checkbox.checked = checkedExtensions.includes(extensionId);
  });

  // Update the start time fields
  document.getElementById('startHour').value = startHour;
  document.getElementById('startMinute').value = startMinute;
  document.getElementById('startAmPm').value = startAmPm;

  // Update the end time fields with the correct AM/PM value
  document.getElementById('endHour').value = endHour;
  document.getElementById('endMinute').value = endMinute;
  document.getElementById('endAmPm').value = endAmPm;

  // Update the active days checkboxes with default values if options.activeDays is not defined or not an array
  const activeDays = options.activeDays || config.defaultOptions.activeDays;
  const activeDaysCheckboxes = document.querySelectorAll('.active-days-container input[type="checkbox"]');
  activeDaysCheckboxes.forEach(function (checkbox) {
    const day = checkbox.getAttribute('value');
    checkbox.checked = activeDays.includes(day);
  });

  // Additional code to set Monday to Friday checkboxes to checked by default
  const defaultActiveDays = config.defaultOptions.activeDays;
  defaultActiveDays.forEach(function (day) {
    const checkbox = document.querySelector(`#activeDaysList input[value="${day}"]`);
    if (checkbox && !activeDays.includes(day)) {
      checkbox.checked = true;
    }
  });
}

// Event listener when the DOM content is loaded
document.addEventListener('DOMContentLoaded', async function () {
  //console.log('DOM content loaded.');
  const extensionList = document.getElementById('extensionList');
  const selectAllCheckbox = document.getElementById('selectAll');
  const messageContainer = document.getElementById('messageContainer');
  const messageText = document.getElementById('messageText');

  if (extensionList && selectAllCheckbox && messageContainer && messageText) {
    // Get the options from Chrome storage
    chrome.storage.local.get(
      [
        'checkedExtensions',
        'startHour',
        'startMinute',
        'startAmPm',
        'endHour',
        'endMinute',
        'endAmPm',
        'activeDays',
        'extensionsEnabled'
      ],
      function (data) {
        console.log('Values in Chrome Storage:', data);
        // Get the list of checked extensions from Chrome storage
        const checkedExtensions = data.checkedExtensions || [];

        // Populate dropdown select elements for time selection
        populateDropdown('startHour', 1, 12, data.startHour || 8);
        populateDropdown('startMinute', 0, 59, data.startMinute || 0);
        populateDropdown('endHour', 1, 12, data.endHour || 4);
        populateDropdown('endMinute', 0, 59, data.endMinute || 0);

        // Update the values in the current HTML document
        updateDocumentOptions(data);

        // Create a Promise to fetch the extensions using chrome.management.getAll
        const extensionsPromise = new Promise((resolve) => {
          chrome.management.getAll(resolve);
        });

        // Wait for the extensionsPromise to resolve with the extensions
        extensionsPromise.then(function (extensions) {

          // Filter and sort the extensions
          const validExtensions = extensions.filter(function (extension) {
            return extension.type === 'extension' && extension.id !== chrome.runtime.id && !extension.installType.includes('admin');
          });

          validExtensions.sort(function (a, b) {
            return a.name.localeCompare(b.name);
          });

          if (validExtensions.length === 0) {
            // If no valid extensions are installed, display the message and hide the extensionList and selectAllCheckbox
            messageText.textContent = 'No valid extensions installed on this browser.';
            messageContainer.style.display = 'block';
            extensionList.style.display = 'none';
            selectAllCheckbox.style.display = 'none';
          } else {
            validExtensions.forEach(function (extension) {
              const listItem = document.createElement('li');
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.checked = checkedExtensions.includes(extension.id);
              checkbox.setAttribute('data-extension-id', extension.id);
              listItem.appendChild(checkbox);

              const icon = document.createElement('img');
              icon.src = extension.icons ? extension.icons[0].url : 'icon-default.png';
              icon.classList.add('extension-icon');
              listItem.appendChild(icon);

              const name = document.createElement('span');
              name.textContent = extension.name;
              listItem.appendChild(name);

              extensionList.appendChild(listItem);
            });

            // Event listener for "Select All" checkbox
            selectAllCheckbox.addEventListener('change', function (event) {
              const isChecked = event.target.checked;
              const extensionCheckboxes = document.querySelectorAll('#extensionList input[type="checkbox"]');
              extensionCheckboxes.forEach(function (checkbox) {
                checkbox.checked = isChecked;
              });
            });
          }
        });
      }
    );
  }

  // Save options when the Save button is clicked
  document.getElementById('saveButton').addEventListener('click', function () {
    saveOptions();
   });
});




// Function to save options to Chrome storage
function saveOptions() {
  // Get the checked extensions from the checkboxes
  const extensionCheckboxes = document.querySelectorAll('#extensionList input[type="checkbox"]:checked');
  const checkedExtensions = Array.from(extensionCheckboxes).map(function (checkbox) {
    return checkbox.getAttribute('data-extension-id');
  });

  // Get the active days from the checkboxes
  const activeDayCheckboxes = document.querySelectorAll('input[name="activeDays"]:checked');
  const activeDays = Array.from(activeDayCheckboxes).map(function (checkbox) {
    return checkbox.value;
  });

  // If no active days are checked, use the default active days (M-F)
  if (activeDays.length === 0) {
    activeDays.push(...config.defaultOptions.activeDays);
  }


  const startHour = parseInt(document.getElementById('startHour').value, 10);
  const startMinute = parseInt(document.getElementById('startMinute').value, 10);
  const startAmPm = document.getElementById('startAmPm').value;

  let endHour = parseInt(document.getElementById('endHour').value, 10);
  let endMinute = parseInt(document.getElementById('endMinute').value, 10);
  let endAmPm = document.getElementById('endAmPm').value;

  // Store the current values as previously saved values
  const previousStartHour = startHour;
  const previousStartMinute = startMinute;
  const previousStartAmPm = startAmPm;

  const previousEndHour = endHour;
  const previousEndMinute = endMinute;
  const previousEndAmPm = endAmPm;

  // Calculate isWithinActiveTimeRange based on the current time and options
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;
  const adjustedStartMinutes = convertTo24HourFormat(startHour, startAmPm) * 60 + startMinute;
  let adjustedEndMinutes = convertTo24HourFormat(endHour, endAmPm) * 60 + endMinute;

  // Adjust the end time for the next day if it's before the start time
//  if (adjustedEndMinutes < adjustedStartMinutes) {
//    adjustedEndMinutes -= 24 * 60; // Add 24 hours (in minutes) to adjust for the next day
//  }

  console.log("currentMinutes:", currentMinutes);
  console.log("adjustedStartMinutes:", adjustedStartMinutes);
  console.log("adjustedEndMinutes:", adjustedEndMinutes)

  const isWithinActiveTimeRange = (currentMinutes >= adjustedStartMinutes && currentMinutes < adjustedEndMinutes) ||
    (adjustedEndMinutes < adjustedStartMinutes && currentMinutes < adjustedEndMinutes);

  // Calculate extensionsEnabled based on isWithinActiveTimeRange and other conditions
  const extensionsEnabled = isWithinActiveTimeRange && activeDays.includes(currentDay);

  const options = {
    checkedExtensions: checkedExtensions,
    startHour: startHour,
    startMinute: startMinute,
    startAmPm: startAmPm,
    endHour: endHour,
    endMinute: endMinute,
    endAmPm: endAmPm,
    activeDays: activeDays,
    extensionsEnabled: extensionsEnabled
  };

  // Validate the End Time against the Start Time
  if (
    ((startHour === endHour) && (startMinute === endMinute) && (startAmPm === endAmPm)) // If Start Time is same as End Time
  ) {
    const statusText = document.getElementById('statusText');
    statusText.textContent = 'Error: End Time cannot be the same as Start Time.';
    statusText.style.display = 'block';
    // Clear the prompt after 5 seconds
    setTimeout(() => {statusText.style.display = 'none';}, 5000);
    return; // Abort saving options if the validation fails
  } else if ((startAmPm === 'PM' && endAmPm === 'AM') || // If Start Time is PM and End Time is AM
    ((endAmPm === startAmPm) && (endHour < startHour || (endHour === startHour && endMinute <= startMinute)))
  ) {


    if (window.confirm(`Scheduler will be active between ${startHour}:${startMinute} ${startAmPm} and midnight, and then between midnight and ${endHour}:${endMinute} ${endAmPm}.\n Are you sure that's what you meant to do?`) === false) {
      // If the user clicks "Cancel" in the confirmation dialog, set the input fields back to the previously saved values
//       document.getElementById('startHour').value = previousStartHour;
//       document.getElementById('startMinute').value = previousStartMinute;
//       document.getElementById('startAmPm').value = previousStartAmPm;
//
//       document.getElementById('endHour').value = previousEndHour;
//       document.getElementById('endMinute').value = previousEndMinute;
//       document.getElementById('endAmPm').value = previousEndAmPm;

      return;
    }
  }


//  if (
//    (startAmPm === 'PM' && endAmPm === 'AM') || // If Start Time is PM and End Time is AM
//    ((endAmPm === startAmPm) && (endHour < startHour || (endHour === startHour && endMinute <= startMinute)))
//  ) {
//    const statusText = document.getElementById('statusText');
//    statusText.textContent = 'Error: End Time cannot be set earlier than or equal to Start Time.';
//    statusText.style.display = 'block';
//    // Clear the prompt after 5 seconds
//    setTimeout(() => {
//      statusText.style.display = 'none';
//    }, 5000);
//    return; // Abort saving options if the validation fails
//  }

  chrome.storage.local.set(options, function () {

    // Log the values in Chrome storage after save
    chrome.storage.local.get(null, function (data) {
      console.log('Values in Chrome storage after save:', data);
      // Update the values in the current HTML document
      updateDocumentOptions(data);

      // Update the active days checkboxes after saving options
      updateActiveDaysCheckboxes(activeDays);

      // Notify the background script about the options change
      chrome.runtime.sendMessage({ optionsUpdated: true });
    });

    const statusText = document.getElementById('statusText');
    statusText.textContent = 'Options saved successfully.';
    statusText.style.display = 'block';

    // Notify the service worker about the options change
    getServiceWorkerRegistration().then((worker) => {
      if (worker) {
        worker.postMessage({ optionsUpdated: true });
      }
    });
  });

  // Clear the prompt after 5 seconds
  setTimeout(() => {
    statusText.style.display = 'none';
  }, 5000);
  //console.log('Options saved.'); // Check if the options are saved successfully
}


// Add an event listener to receive messages from the background script
chrome.runtime.onMessage.addListener(function (message) {
  if (message.extensionsToggled) {
    // The background script notified about the extension state change
    // Let's update the options page to reflect the changes
    chrome.storage.local.get(null, function (data) {
      updateDocumentOptions(data);
    });
  }
});

