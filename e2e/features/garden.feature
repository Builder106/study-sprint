Feature: Gamification — Garden and Progression (#14)
  As a logged-in student
  I want to see my gamification progress in the garden
  So that I feel motivated to keep studying

  Background:
    Given I am logged in as "demo@example.com" with password "demo123"

  Scenario: Garden page loads with level and XP bar
    When I navigate to the garden page
    Then I should see the heading "Keep it growing."
    And I should see the XP progress bar
    And I should see the current level displayed

  Scenario: Achievements grid is visible
    When I navigate to the garden page
    Then I should see the achievements section
