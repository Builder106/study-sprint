Feature: Social Features — Community, Leaderboard, Rooms (#18)
  As a logged-in student
  I want to engage with the community features
  So that I can stay accountable and study with others

  Background:
    Given I am logged in as "demo@example.com" with password "demo123"

  Scenario: Community page loads with the leaderboard
    When I navigate to the community page
    Then I should see the heading "Study together."
    And I should see the "Weekly leaderboard" section

  Scenario: Study rooms section is visible
    When I navigate to the community page
    Then I should see the "Your study rooms" section
    And I should see the "New room" button

  Scenario: Creating a new study room
    When I navigate to the community page
    And I click the "New room" button
    Then the create room modal should appear
    When I enter the room name "E2E Test Room"
    And I submit the create room form
    Then I should see "E2E Test Room" in the rooms list
