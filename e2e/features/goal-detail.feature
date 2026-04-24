Feature: Goal Detail — Panel, Timer, Focus Tools, Calendar (#12, #13, #16, #17)
  As a logged-in student
  I want to interact with the goal detail page
  So that I can track sessions, use the timer, take notes, and manage my goal

  Background:
    Given I am logged in as "demo@example.com" with password "demo123"
    And I navigate to the first goal on the dashboard

  # Issue #12 — Slide-out details panel
  Scenario: Opening the slide-out details panel
    When I click the "Details" button
    Then the goal details panel should be visible
    And I should see the "Target" metadata in the panel

  # Issue #16 — Smart timer modes
  Scenario: Switching the timer to Pomodoro mode
    When I click the "Pomodoro" mode button on the timer
    Then the timer should show the "Focus" phase label
    And the timer display should show "25:00"

  Scenario: Starting and pausing the stopwatch timer
    When I click the "Stopwatch" mode button on the timer
    And I click the Start button on the timer
    Then the timer should be running
    When I click the Pause button on the timer
    Then the timer should be paused

  # Issue #17 — Focus tools
  Scenario: Opening the focus tools panel
    When I expand the focus tools panel
    Then I should see the ambient noise controls
    And I should see the session notes textarea

  Scenario: Typing a note in the session notes area
    When I expand the focus tools panel
    And I type "Reviewing chapter 4" in the session notes
    Then the notes area should contain "Reviewing chapter 4"

  # Issue #13 — Google Calendar badge
  Scenario: Google Calendar connect button is present on the goal detail page
    Then I should see the Google Calendar connect option
