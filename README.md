# Extension Scheduler Readme

The Extension Scheduler is a Chrome & Edge browser extension that allows users to schedule the automatic enabling and
disabling of selected extensions based on a specified time range and active days. With this extension, you can manage
and control the behavior of various Chrome/Edge extensions without having to manually enable or disable them.

## Features

- **Flexible Scheduling:** Define your own start and end time for each day, and the extension will automatically enable
  or disable selected extensions within the specified time range.

- **Active Days Selection:** Choose specific days of the week when the scheduling should take effect. This allows you to
  customize the behavior of extensions on different days.

- **Extension Toggle:** The extension provides a convenient way to toggle the active state of selected extensions
  automatically based on the predefined schedule.

- **Options Page:** A user-friendly options page is provided where you can manage your extension settings, including the
  list of extensions you want to schedule, the active days, and the start and end times.

- **Service Worker Integration:** The extension works with a service worker to ensure that your extension's schedule is
  continuously monitored and applied, even when the browser is closed and reopened.

## Getting Started

To get started using the Extension Scheduler, follow these simple steps:

1. **Installation:** Download the extension from the Chrome/Edge Web Store* and add it to your Chrome/Edge browser.

2. **Options Configuration:** Open the options page by right-clicking the extension icon and selecting "Options." Here,
   you can customize the scheduling settings, select extensions, and set the active days and time range.

3. **Extension Selection:** On the options page, select the extensions you want to include in the schedule by checking
   the corresponding checkboxes.

4. **Schedule Customization:** Choose the active days on which the scheduling should take effect. Set the start and end
   times for each day to automatically enable or disable the selected extensions during the specified time range.

5. **Save Options:** Once you have configured the settings, click the "Save" button to save your preferences.

6. **Automatic Scheduling:** The extension will now automatically enable or disable selected extensions based on the
   defined schedule and active days.

## How it Works

The Extension Scheduler uses a combination of the background script and service worker to handle the automatic enabling
and disabling of extensions. The background script constantly monitors the current time and compares it to the defined
schedule. When the current time matches the specified time range and active days, the background script enables the
selected extensions. Otherwise, it disables them.

To ensure continuous monitoring, the extension utilizes a service worker. The service worker keeps track of the schedule
and updates the extension state even when the browser is closed. When the browser is reopened, the service worker
resumes its operation and follows the defined schedule.

## Contributing

We welcome contributions from the community to enhance and improve the Extension Scheduler. If you find a bug, have a
suggestion, or want to add new features, feel free to open an issue or submit a pull request on our GitHub repository.

## License

The Extension Scheduler is open-source software licensed under the [MIT License](LICENSE). You are free to use, modify,
and distribute this extension according to the terms of the license.

Extension Scheduler icon by [icons8](https://icons8.com/).

## Support

If you encounter any issues or have questions regarding the Extension Scheduler, please don't hesitate to contact us
through the support channels provided on the Chrome/Edge Web Store* or our GitHub repository.

We hope you find the Extension Scheduler helpful in managing your Chrome/Edge extensions effectively and optimizing your
browsing experience!

## Known Issues:

- icon-on.png is hard to see on a browser with a Light Green color theme.

<sub><sup>\* \- As of 7/25/2023, the Extension Scheduler is not yet available to download on the Chrome/Edge Web Store.
To add the Extension Scheduler to your browser, download this code, then in your browser, navigate to the Extensions
settings page, enable Developer mode, click on Load unpacked, then navigate to the folder you downloaded the code into
and click Select Folder. The extension should load onto your browser. <sup><sub>
