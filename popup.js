document.addEventListener('DOMContentLoaded', function () {
  // Code for displaying the extension icons in the popup
  const extensionIconsContainer = document.getElementById('extensionIcons');

  chrome.management.getAll(function (extensions) {
    extensions.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    chrome.storage.local.get('checkedExtensions', function (data) {
      const checkedExtensions = data.checkedExtensions || [];

      extensions.forEach(function (extension) {
        if (extension.type === 'extension' && extension.id !== chrome.runtime.id) {
          const icon = document.createElement('img');
          icon.src = extension.icons ? extension.icons[0].url : 'icon-default.png';
          icon.classList.add('extension-icon');

          // Show or hide the extension icon based on whether it is checked
          if (checkedExtensions.includes(extension.id)) {
            icon.style.display = 'block';
          } else {
            icon.style.display = 'none';
          }

          extensionIconsContainer.appendChild(icon);
        }
      });
    });
  });
});
