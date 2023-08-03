### Test Scenarios for Extension Time Settings

1. **Scenario:** Start Time: 8:00 AM, End Time: 8:00 AM **PASS**
    - **Expected Result:** An error message is displayed stating "Start Time cannot be the same as End Time." Extensions are disabled throughout the day regardless of active days.

2. **Scenario:** Start Time: 12:00 PM, End Time: 12:00 PM **PASS**
    - **Expected Result:** An error message is displayed stating "Start Time cannot be the same as End Time." Extensions are disabled throughout the day regardless of active days.

3. **Scenario:** Start Time: 8:00 AM, End Time: 4:00 PM **PASS**
    - **Expected Result:** Extensions are enabled during this time range on active days. Extensions are disabled outside this time range on active days. Extensions are disabled on inactive days.

7. **Scenario:** Start Time: 8:00 AM, End Time: 4:00 PM, Active Days: Monday, Wednesday, Friday
    - **Expected Result:** Extensions are enabled during this time range on specified active days. Extensions are disabled outside this time range on specified active days. Extensions are disabled on other days.

8. **Scenario:** Start Time: 8:00 AM, End Time: 4:00 PM, Active Days: Saturday, Sunday
    - **Expected Result:** Extensions are disabled during this time range on specified inactive days. Extensions are enabled outside this time range on specified inactive days. Extensions are disabled on other days.

    
13. **Scenario:** Test with different combinations of extensions being checked and unchecked.
    - **Expected Result:** Validate that the correct extensions are enabled and disabled based on the selected options.

Ensure to test each scenario thoroughly and verify that the application behaves as expected in all cases.
