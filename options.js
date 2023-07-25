// options.js

import { config } from './config.js';

// Function to get the service worker registration asynchronously
async function getServiceWorkerRegistration() {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.active : null;
}

// Function to update the active days checkboxes in the options UI
function updateActiveDaysCheckboxes(activeDays) {
  const activeDaysCheckboxes = document.querySelectorAll('#activeDaysList input[type="checkbox"]');
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
  select.value = defaultValue;
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
      console.log('Checked extensions updated.');
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
  document.getElementById('startHour').value = startAmPm === 'PM' ? (startHour % 12) : startHour;
  document.getElementById('startMinute').value = startMinute;
  document.getElementById('startAmPm').value = startAmPm;

  // Update the end time fields with the correct AM/PM value
  document.getElementById('endHour').value = endHour;
  document.getElementById('endMinute').value = endMinute;
  document.getElementById('endAmPm').value = endAmPm;

  // Update the active days checkboxes
  const activeDays = options.activeDays || config.defaultOptions.activeDays;
  const activeDaysCheckboxes = document.querySelectorAll('#activeDaysList input[type="checkbox"]');
  activeDaysCheckboxes.forEach(function (checkbox) {
    const day = checkbox.getAttribute('data-day');
    checkbox.checked = activeDays.includes(day);
  });
}

// Event listener when the DOM content is loaded
document.addEventListener('DOMContentLoaded', async function () {
  let data;
  const extensionList = document.getElementById('extensionList');

  if (extensionList) {
    // Get all extensions and sort them alphabetically
    chrome.management.getAll(function (extensions) {
      extensions = extensions.filter(function (extension) {
        return extension.type === 'extension' && extension.id !== chrome.runtime.id && !extension.installType.includes('admin');
      });
      extensions.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      // Get the list of checked extensions from Chrome storage
      chrome.storage.local.get('checkedExtensions', function (data) {
        const checkedExtensions = data.checkedExtensions || [];

        extensions.forEach(function (extension) {
          if (extension.type === 'extension' && extension.id !== chrome.runtime.id) {
            const listItem = document.createElement('li');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = checkedExtensions.includes(extension.id);
            checkbox.setAttribute('data-extension-id', extension.id);
            checkbox.addEventListener('change', function (event) {
              const isChecked = event.target.checked;
              setExtensionState(extension.id, isChecked);
              updateCheckedExtensions(extension.id, isChecked);
            });
            listItem.appendChild(checkbox);

            const icon = document.createElement('img');
            icon.src = extension.icons ? extension.icons[0].url : 'icon-default.png';
            icon.classList.add('extension-icon');
            listItem.appendChild(icon);

            const name = document.createElement('span');
            name.textContent = extension.name;
            listItem.appendChild(name);

            extensionList.appendChild(listItem);
          }
        });
      });
    });
  }

  // Update the active days checkboxes
  const activeDaysCheckboxes = document.querySelectorAll('#activeDaysList input[type="checkbox"]');
  activeDaysCheckboxes.forEach(function (checkbox) {
    const day = checkbox.getAttribute('data-day');
    checkbox.checked = false; // Uncheck all checkboxes initially
  });

  // Get the options from Chrome storage and populate the dropdown select elements
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
    ],
    function (data) {
      const checkedExtensions = data.checkedExtensions || [];
      checkedExtensions.forEach(function (extensionId) {
        const checkbox = document.querySelector(`#extensionList input[data-extension-id="${extensionId}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });

      const startHour = data.startHour || config.defaultOptions.startHour;
      const startMinute = data.startMinute || config.defaultOptions.startMinute;
      const startAmPm = data.startAmPm || config.defaultOptions.startAmPm;
      document.getElementById('startHour').value = startAmPm === 'PM' ? (startHour % 12) : startHour;
      document.getElementById('startMinute').value = startMinute;
      document.getElementById('startAmPm').value = startAmPm;

      const endHour = data.endHour || config.defaultOptions.endHour;
      const endMinute = data.endMinute || config.defaultOptions.endMinute;
      const endAmPm = data.endAmPm || config.defaultOptions.endAmPm;

      // Convert the end time to 12-hour format
      const displayEndHour = endHour % 12 || 12;

      document.getElementById('endAmPm').value = endAmPm;

      // Update the 'endHour' select element value directly
      document.getElementById('endHour').value = endAmPm === 'PM' ? displayEndHour : endHour % 12;
      // Update the 'endMinute' select element value directly
      document.getElementById('endMinute').value = endMinute;

      // Update the active days checkboxes with default values if options.activeDays is not defined or not an array
      const activeDays = Array.isArray(data.activeDays) ? data.activeDays : config.defaultOptions.activeDays;
      activeDays.forEach(function (day) {
        const checkbox = document.querySelector(`#activeDaysList input[value="${day}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });
    }
  );

  // Populate dropdown select elements for time selection
  populateDropdown('startHour', 1, 12, 8);
  populateDropdown('startMinute', 0, 59, 0);
  populateDropdown('endHour', 1, 12, 4);
  populateDropdown('endMinute', 0, 59, 0);

  // Save options when the Save button is clicked
  document.getElementById('saveButton').addEventListener('click', saveOptions);
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
  const defaultActiveDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (activeDays.length === 0) {
    activeDays.push(...defaultActiveDays);
  }

  const startHour = parseInt(document.getElementById('startHour').value, 10);
  const startMinute = parseInt(document.getElementById('startMinute').value, 10);
  const startAmPm = document.getElementById('startAmPm').value;

  let endHour = parseInt(document.getElementById('endHour').value, 10);
  let endMinute = parseInt(document.getElementById('endMinute').value, 10);
  let endAmPm = document.getElementById('endAmPm').value;

  const options = {
    checkedExtensions: checkedExtensions,
    startHour: startAmPm === 'PM' ? (startHour % 12) : startHour,
    startMinute: startMinute,
    startAmPm: startAmPm,
    endHour: endHour,
    endMinute: endMinute,
    endAmPm: endAmPm,
    activeDays: activeDays,
  };


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
  console.log('Options saved.'); // Check if the options are saved successfully
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

