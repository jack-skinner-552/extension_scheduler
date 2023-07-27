document.addEventListener('DOMContentLoaded', function () {
  // Get the value of 'isWithinActiveTimeRange' from Chrome storage
  chrome.storage.local.get('isWithinActiveTimeRange', function (data) {
    const isWithinActiveTimeRange = data.isWithinActiveTimeRange;

    // Update the status text based on the value of 'isWithinActiveTimeRange'
    const statusText = document.getElementById('status');
    statusText.textContent = isWithinActiveTimeRange
      ? 'Extensions Disabled:'
      : 'Extensions Enabled:';

    // Code for displaying the extension icons in the popup
    const extensionIconsContainer = document.getElementById('extensionIcons');

    chrome.management.getAll(function (extensions) {
      chrome.storage.local.get('checkedExtensions', function (data) {
        const checkedExtensions = data.checkedExtensions || [];

        // Filter the extensions to only include selected ones
        const selectedExtensions = extensions.filter(function (extension) {
          return (
            extension.type === 'extension' &&
            extension.id !== chrome.runtime.id &&
            checkedExtensions.includes(extension.id)
          );
        });

        // Sort the selected extensions by name
        selectedExtensions.sort(function (a, b) {
          return a.name.localeCompare(b.name);
        });

        // Define the maximum number of icons per row
        const iconsPerRow = 5;

        // Create a container for extension icons
        const extensionIconsContainer = document.getElementById('extensionIcons');

        let currentRowContainer = document.createElement('div');
        currentRowContainer.classList.add('icon-row');

        selectedExtensions.forEach(function (extension, index) {
          const icon = document.createElement('img');
          icon.src = extension.icons ? extension.icons[0].url : 'icon-default.png';
          icon.classList.add('extension-icon');

          // Show or hide the extension icon based on whether it is checked
          icon.style.display = 'block';

          if (index > 0 && index % iconsPerRow === 0) {
            // Start a new row after every 'iconsPerRow' icons
            extensionIconsContainer.appendChild(currentRowContainer);
            currentRowContainer = document.createElement('div');
            currentRowContainer.classList.add('icon-row');
          }

          currentRowContainer.appendChild(icon);
        });

        // Add the last row if it contains icons
        if (currentRowContainer.childElementCount > 0) {
          extensionIconsContainer.appendChild(currentRowContainer);
        }
      });
    });
  });
});
