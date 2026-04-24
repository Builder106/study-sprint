Feature: Analytics Dashboard (#15)
  As a logged-in student
  I want to view my study analytics
  So that I can understand my productivity patterns

  Background:
    Given I am logged in as "demo@example.com" with password "demo123"

  Scenario: Analytics page loads with the contribution heatmap
    When I navigate to the analytics page
    Then I should see the heading "Your analytics."
    And I should see the contribution heatmap

  Scenario: Analytics page shows stat cards
    When I navigate to the analytics page
    Then I should see the "Total (365d)" stat card
    And I should see the "Current streak" stat card
